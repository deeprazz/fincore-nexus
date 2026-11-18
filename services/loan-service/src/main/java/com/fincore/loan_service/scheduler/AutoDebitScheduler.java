package com.fincore.loan_service.scheduler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fincore.loan_service.emi.EmiScheduleRepository;
import com.fincore.loan_service.emi.EmiStatus;
import com.fincore.loan_service.event.EmiDebitRequestedEvent;
import com.fincore.loan_service.event.OutboxEvent;
import com.fincore.loan_service.event.OutboxEventRepository;
import com.fincore.loan_service.loan.Loan;
import com.fincore.loan_service.loan.LoanRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;

@Component
public class AutoDebitScheduler {

    private static final Logger log = LoggerFactory.getLogger(AutoDebitScheduler.class);

    private final EmiScheduleRepository emiScheduleRepository;
    private final LoanRepository loanRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    public AutoDebitScheduler(EmiScheduleRepository emiScheduleRepository,
                               LoanRepository loanRepository,
                               OutboxEventRepository outboxEventRepository,
                               ObjectMapper objectMapper) {
        this.emiScheduleRepository = emiScheduleRepository;
        this.loanRepository = loanRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.objectMapper = objectMapper;
    }

    @Scheduled(fixedRate = 3_600_000) // hourly
    @Transactional
    public void processAutoDebit() {
        LocalDate today = LocalDate.now();
        log.info("Auto-debit scheduler running for date={}", today);

        emiScheduleRepository.findDueEmis(today).forEach(emi -> {
            Loan loan = loanRepository.findById(emi.getLoanId()).orElse(null);
            if (loan == null || loan.getAccountId() == null) {
                log.warn("Cannot debit EMI {}: loan or account not found", emi.getId());
                return;
            }

            EmiDebitRequestedEvent event = new EmiDebitRequestedEvent(
                    java.util.UUID.randomUUID(), // idempotency key per attempt
                    emi.getLoanId(),
                    emi.getId(),
                    loan.getAccountId(),
                    emi.getEmiAmount(),
                    emi.getDueDate()
            );
            try {
                outboxEventRepository.save(new OutboxEvent(
                        "EmiSchedule",
                        emi.getId().toString(),
                        "emi.debit.requested",
                        objectMapper.writeValueAsString(event)
                ));
                log.info("Queued outbox emi.debit.requested for emiId={} loanId={}", emi.getId(), emi.getLoanId());
            } catch (Exception e) {
                log.error("Failed to queue outbox event for emi {}: {}", emi.getId(), e.getMessage());
            }
        });
    }
}
