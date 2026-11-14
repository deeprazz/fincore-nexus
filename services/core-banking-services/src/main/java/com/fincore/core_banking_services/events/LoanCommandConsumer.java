package com.fincore.core_banking_services.events;

import com.fincore.core_banking_services.account.Account;
import com.fincore.core_banking_services.account.AccountRepository;
import com.fincore.core_banking_services.account.AccountService;
import com.fincore.core_banking_services.account.AccountStatus;
import com.fincore.core_banking_services.account.DepositRequest;
import com.fincore.core_banking_services.account.WithdrawRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Component
public class LoanCommandConsumer {

    private static final Logger log = LoggerFactory.getLogger(LoanCommandConsumer.class);

    public static final String TOPIC_LOAN_APPROVED = "loan.approved";
    public static final String TOPIC_LOAN_DISBURSED = "loan.disbursed";
    public static final String TOPIC_EMI_DEBIT_REQUESTED = "emi.debit.requested";
    public static final String TOPIC_EMI_DEBIT_RESULT = "emi.debit.result";

    private final ProcessedEventRepository processedEventRepository;
    private final AccountRepository accountRepository;
    private final AccountService accountService;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public LoanCommandConsumer(
            ProcessedEventRepository processedEventRepository,
            AccountRepository accountRepository,
            AccountService accountService,
            KafkaTemplate<String, Object> kafkaTemplate) {
        this.processedEventRepository = processedEventRepository;
        this.accountRepository = accountRepository;
        this.accountService = accountService;
        this.kafkaTemplate = kafkaTemplate;
    }

    @KafkaListener(topics = TOPIC_LOAN_APPROVED, groupId = "${spring.kafka.consumer.group-id:core-banking-loan-group}")
    @Transactional
    public void handleLoanApproved(LoanApprovedCommand command) {
        String key = "loan-approved:" + command.correlationId();
        if (processedEventRepository.existsByIdempotencyKey(key)) {
            log.info("Skipping already processed loan approved command with key: {}", key);
            return;
        }

        Account account = null;
        if (command.targetAccountId() != null) {
            account = accountRepository.findById(command.targetAccountId())
                    .filter(a -> a.getStatus() == AccountStatus.ACTIVE)
                    .orElse(null);
        }

        if (account == null && command.customerId() != null) {
            List<Account> accounts = accountRepository.findByCustomerId(command.customerId());
            account = accounts.stream()
                    .filter(a -> a.getStatus() == AccountStatus.ACTIVE)
                    .findFirst()
                    .orElse(null);
        }

        if (account == null) {
            log.warn("No active account found for customer {} or target account {}", command.customerId(), command.targetAccountId());
            LoanDisbursedResponse response = new LoanDisbursedResponse(
                    command.correlationId(),
                    command.loanId(),
                    null,
                    BigDecimal.ZERO,
                    OffsetDateTime.now(),
                    false,
                    "No active account found for customer"
            );
            String messageKey = command.loanId() != null ? command.loanId().toString() : command.correlationId().toString();
            kafkaTemplate.send(TOPIC_LOAN_DISBURSED, messageKey, response);
            processedEventRepository.save(new ProcessedEvent(key));
            return;
        }

        try {
            accountService.deposit(account.getId(), command.amount());
            LoanDisbursedResponse response = new LoanDisbursedResponse(
                    command.correlationId(),
                    command.loanId(),
                    account.getId(),
                    command.amount(),
                    OffsetDateTime.now(),
                    true,
                    null
            );
            kafkaTemplate.send(TOPIC_LOAN_DISBURSED, command.loanId().toString(), response);
            processedEventRepository.save(new ProcessedEvent(key));
            log.info("Disbursed loan {} to account {}", command.loanId(), account.getId());
        } catch (Exception e) {
            log.error("Failed to disburse loan {}: {}", command.loanId(), e.getMessage(), e);
            LoanDisbursedResponse response = new LoanDisbursedResponse(
                    command.correlationId(),
                    command.loanId(),
                    account.getId(),
                    BigDecimal.ZERO,
                    OffsetDateTime.now(),
                    false,
                    e.getMessage() != null ? e.getMessage() : "Disbursement deposit failed"
            );
            kafkaTemplate.send(TOPIC_LOAN_DISBURSED, command.loanId().toString(), response);
            processedEventRepository.save(new ProcessedEvent(key));
        }
    }

    @KafkaListener(topics = TOPIC_EMI_DEBIT_REQUESTED, groupId = "${spring.kafka.consumer.group-id:core-banking-loan-group}")
    @Transactional
    public void handleEmiDebitRequested(EmiDebitCommand command) {
        String key = "emi-debit:" + command.idempotencyKey();
        if (processedEventRepository.existsByIdempotencyKey(key)) {
            log.info("Skipping already processed EMI debit command with key: {}", key);
            return;
        }

        Optional<Account> accountOpt = accountRepository.findById(command.accountId());
        if (accountOpt.isEmpty()) {
            log.warn("Account {} not found for EMI debit", command.accountId());
            EmiDebitResultResponse response = new EmiDebitResultResponse(
                    command.idempotencyKey(),
                    command.loanId(),
                    command.emiId(),
                    false,
                    "Account not found"
            );
            String messageKey = command.loanId() != null ? command.loanId().toString() : command.idempotencyKey().toString();
            kafkaTemplate.send(TOPIC_EMI_DEBIT_RESULT, messageKey, response);
            processedEventRepository.save(new ProcessedEvent(key));
            return;
        }

        Account account = accountOpt.get();
        if (account.getStatus() != AccountStatus.ACTIVE) {
            log.warn("Account {} is not active for EMI debit (status: {})", command.accountId(), account.getStatus());
            EmiDebitResultResponse response = new EmiDebitResultResponse(
                    command.idempotencyKey(),
                    command.loanId(),
                    command.emiId(),
                    false,
                    "Account is not active"
            );
            kafkaTemplate.send(TOPIC_EMI_DEBIT_RESULT, command.loanId().toString(), response);
            processedEventRepository.save(new ProcessedEvent(key));
            return;
        }

        if (account.getBalance().compareTo(command.amount()) >= 0) {
            try {
                accountService.withdraw(command.accountId(), command.amount());
                EmiDebitResultResponse response = new EmiDebitResultResponse(
                        command.idempotencyKey(),
                        command.loanId(),
                        command.emiId(),
                        true,
                        null
                );
                kafkaTemplate.send(TOPIC_EMI_DEBIT_RESULT, command.loanId().toString(), response);
                processedEventRepository.save(new ProcessedEvent(key));
                log.info("Debited EMI {} of amount {} for loan {} from account {}",
                        command.emiId(), command.amount(), command.loanId(), command.accountId());
            } catch (Exception e) {
                log.error("Failed to debit EMI for loan {}: {}", command.loanId(), e.getMessage(), e);
                EmiDebitResultResponse response = new EmiDebitResultResponse(
                        command.idempotencyKey(),
                        command.loanId(),
                        command.emiId(),
                        false,
                        e.getMessage() != null ? e.getMessage() : "Withdrawal failed"
                );
                kafkaTemplate.send(TOPIC_EMI_DEBIT_RESULT, command.loanId().toString(), response);
                processedEventRepository.save(new ProcessedEvent(key));
            }
        } else {
            log.warn("Insufficient funds in account {} for EMI debit of {}", command.accountId(), command.amount());
            EmiDebitResultResponse response = new EmiDebitResultResponse(
                    command.idempotencyKey(),
                    command.loanId(),
                    command.emiId(),
                    false,
                    "Insufficient funds"
            );
            kafkaTemplate.send(TOPIC_EMI_DEBIT_RESULT, command.loanId().toString(), response);
            processedEventRepository.save(new ProcessedEvent(key));
        }
    }
}
