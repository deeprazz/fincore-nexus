package com.fincore.core_banking_services;

import com.fincore.core_banking_services.account.Account;
import com.fincore.core_banking_services.account.AccountRepository;
import com.fincore.core_banking_services.account.AccountService;
import com.fincore.core_banking_services.account.AccountStatus;
import com.fincore.core_banking_services.account.DepositRequest;
import com.fincore.core_banking_services.account.WithdrawRequest;
import com.fincore.core_banking_services.events.EmiDebitCommand;
import com.fincore.core_banking_services.events.EmiDebitResultResponse;
import com.fincore.core_banking_services.events.LoanApprovedCommand;
import com.fincore.core_banking_services.events.LoanCommandConsumer;
import com.fincore.core_banking_services.events.LoanDisbursedResponse;
import com.fincore.core_banking_services.events.ProcessedEvent;
import com.fincore.core_banking_services.events.ProcessedEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoanCommandConsumerTest {

    @Mock
    private ProcessedEventRepository processedEventRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private AccountService accountService;

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    @InjectMocks
    private LoanCommandConsumer consumer;

    private UUID correlationId;
    private UUID loanId;
    private UUID customerId;
    private UUID accountId;
    private Account account;

    @BeforeEach
    void setUp() {
        correlationId = UUID.randomUUID();
        loanId = UUID.randomUUID();
        customerId = UUID.randomUUID();
        accountId = UUID.randomUUID();

        account = new Account();
        account.setId(accountId);
        account.setAccountNumber("000000000001");
        account.setBalance(new BigDecimal("5000.00"));
        account.setStatus(AccountStatus.ACTIVE);
    }

    @Test
    void testHandleLoanApproved_SuccessWithTargetAccountId() {
        LoanApprovedCommand cmd = new LoanApprovedCommand(
                correlationId, loanId, customerId, accountId, new BigDecimal("10000.00"), "USD"
        );

        when(processedEventRepository.existsByIdempotencyKey("loan-approved:" + correlationId)).thenReturn(false);
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(account));

        consumer.handleLoanApproved(cmd);

        verify(accountService).deposit(eq(accountId), eq(new BigDecimal("10000.00")));
        ArgumentCaptor<LoanDisbursedResponse> captor = ArgumentCaptor.forClass(LoanDisbursedResponse.class);
        verify(kafkaTemplate).send(eq(LoanCommandConsumer.TOPIC_LOAN_DISBURSED), eq(loanId.toString()), captor.capture());

        LoanDisbursedResponse response = captor.getValue();
        assertTrue(response.success());
        assertEquals(loanId, response.loanId());
        assertEquals(accountId, response.accountId());
        assertEquals(new BigDecimal("10000.00"), response.disbursedAmount());
        assertNull(response.failureReason());

        verify(processedEventRepository).save(any(ProcessedEvent.class));
    }

    @Test
    void testHandleLoanApproved_AlreadyProcessed() {
        LoanApprovedCommand cmd = new LoanApprovedCommand(
                correlationId, loanId, customerId, accountId, new BigDecimal("10000.00"), "USD"
        );

        when(processedEventRepository.existsByIdempotencyKey("loan-approved:" + correlationId)).thenReturn(true);

        consumer.handleLoanApproved(cmd);

        verifyNoInteractions(accountRepository);
        verifyNoInteractions(accountService);
        verifyNoInteractions(kafkaTemplate);
        verify(processedEventRepository, never()).save(any(ProcessedEvent.class));
    }

    @Test
    void testHandleLoanApproved_FallbackToCustomerActiveAccount() {
        LoanApprovedCommand cmd = new LoanApprovedCommand(
                correlationId, loanId, customerId, null, new BigDecimal("5000.00"), "USD"
        );

        when(processedEventRepository.existsByIdempotencyKey("loan-approved:" + correlationId)).thenReturn(false);
        when(accountRepository.findByCustomerId(customerId)).thenReturn(List.of(account));

        consumer.handleLoanApproved(cmd);

        verify(accountService).deposit(eq(accountId), eq(new BigDecimal("5000.00")));
        ArgumentCaptor<LoanDisbursedResponse> captor = ArgumentCaptor.forClass(LoanDisbursedResponse.class);
        verify(kafkaTemplate).send(eq(LoanCommandConsumer.TOPIC_LOAN_DISBURSED), eq(loanId.toString()), captor.capture());

        LoanDisbursedResponse response = captor.getValue();
        assertTrue(response.success());
        assertEquals(accountId, response.accountId());
        verify(processedEventRepository).save(any(ProcessedEvent.class));
    }

    @Test
    void testHandleLoanApproved_NoActiveAccountFound() {
        LoanApprovedCommand cmd = new LoanApprovedCommand(
                correlationId, loanId, customerId, null, new BigDecimal("5000.00"), "USD"
        );

        when(processedEventRepository.existsByIdempotencyKey("loan-approved:" + correlationId)).thenReturn(false);
        when(accountRepository.findByCustomerId(customerId)).thenReturn(Collections.emptyList());

        consumer.handleLoanApproved(cmd);

        verifyNoInteractions(accountService);
        ArgumentCaptor<LoanDisbursedResponse> captor = ArgumentCaptor.forClass(LoanDisbursedResponse.class);
        verify(kafkaTemplate).send(eq(LoanCommandConsumer.TOPIC_LOAN_DISBURSED), eq(loanId.toString()), captor.capture());

        LoanDisbursedResponse response = captor.getValue();
        assertFalse(response.success());
        assertEquals("No active account found for customer", response.failureReason());
        verify(processedEventRepository).save(any(ProcessedEvent.class));
    }

    @Test
    void testHandleEmiDebitRequested_Success() {
        UUID emiId = UUID.randomUUID();
        UUID idempotencyKey = UUID.randomUUID();
        EmiDebitCommand cmd = new EmiDebitCommand(
                idempotencyKey, loanId, emiId, accountId, new BigDecimal("1000.00"), LocalDate.now()
        );

        when(processedEventRepository.existsByIdempotencyKey("emi-debit:" + idempotencyKey)).thenReturn(false);
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(account));

        consumer.handleEmiDebitRequested(cmd);

        verify(accountService).withdraw(eq(accountId), eq(new BigDecimal("1000.00")));
        ArgumentCaptor<EmiDebitResultResponse> captor = ArgumentCaptor.forClass(EmiDebitResultResponse.class);
        verify(kafkaTemplate).send(eq(LoanCommandConsumer.TOPIC_EMI_DEBIT_RESULT), eq(loanId.toString()), captor.capture());

        EmiDebitResultResponse response = captor.getValue();
        assertTrue(response.success());
        assertEquals(emiId, response.emiId());
        assertNull(response.failureReason());
        verify(processedEventRepository).save(any(ProcessedEvent.class));
    }

    @Test
    void testHandleEmiDebitRequested_AlreadyProcessed() {
        UUID emiId = UUID.randomUUID();
        UUID idempotencyKey = UUID.randomUUID();
        EmiDebitCommand cmd = new EmiDebitCommand(
                idempotencyKey, loanId, emiId, accountId, new BigDecimal("1000.00"), LocalDate.now()
        );

        when(processedEventRepository.existsByIdempotencyKey("emi-debit:" + idempotencyKey)).thenReturn(true);

        consumer.handleEmiDebitRequested(cmd);

        verifyNoInteractions(accountRepository);
        verifyNoInteractions(accountService);
        verifyNoInteractions(kafkaTemplate);
        verify(processedEventRepository, never()).save(any(ProcessedEvent.class));
    }

    @Test
    void testHandleEmiDebitRequested_InsufficientFunds() {
        UUID emiId = UUID.randomUUID();
        UUID idempotencyKey = UUID.randomUUID();
        EmiDebitCommand cmd = new EmiDebitCommand(
                idempotencyKey, loanId, emiId, accountId, new BigDecimal("10000.00"), LocalDate.now()
        );

        when(processedEventRepository.existsByIdempotencyKey("emi-debit:" + idempotencyKey)).thenReturn(false);
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(account));

        consumer.handleEmiDebitRequested(cmd);

        verifyNoInteractions(accountService);
        ArgumentCaptor<EmiDebitResultResponse> captor = ArgumentCaptor.forClass(EmiDebitResultResponse.class);
        verify(kafkaTemplate).send(eq(LoanCommandConsumer.TOPIC_EMI_DEBIT_RESULT), eq(loanId.toString()), captor.capture());

        EmiDebitResultResponse response = captor.getValue();
        assertFalse(response.success());
        assertEquals("Insufficient funds", response.failureReason());
        verify(processedEventRepository).save(any(ProcessedEvent.class));
    }

    @Test
    void testHandleEmiDebitRequested_AccountNotFound() {
        UUID emiId = UUID.randomUUID();
        UUID idempotencyKey = UUID.randomUUID();
        EmiDebitCommand cmd = new EmiDebitCommand(
                idempotencyKey, loanId, emiId, accountId, new BigDecimal("1000.00"), LocalDate.now()
        );

        when(processedEventRepository.existsByIdempotencyKey("emi-debit:" + idempotencyKey)).thenReturn(false);
        when(accountRepository.findById(accountId)).thenReturn(Optional.empty());

        consumer.handleEmiDebitRequested(cmd);

        verifyNoInteractions(accountService);
        ArgumentCaptor<EmiDebitResultResponse> captor = ArgumentCaptor.forClass(EmiDebitResultResponse.class);
        verify(kafkaTemplate).send(eq(LoanCommandConsumer.TOPIC_EMI_DEBIT_RESULT), eq(loanId.toString()), captor.capture());

        EmiDebitResultResponse response = captor.getValue();
        assertFalse(response.success());
        assertEquals("Account not found", response.failureReason());
        verify(processedEventRepository).save(any(ProcessedEvent.class));
    }
}
