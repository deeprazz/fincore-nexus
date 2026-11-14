package com.fincore.loan_service.event;

import com.fincore.loan_service.emi.EmiSchedule;
import com.fincore.loan_service.emi.EmiScheduleRepository;
import com.fincore.loan_service.emi.EmiStatus;
import com.fincore.loan_service.loan.Loan;
import com.fincore.loan_service.loan.LoanRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;

@Component
public class EmiDebitResultListener {

    private static final Logger log = LoggerFactory.getLogger(EmiDebitResultListener.class);
    private final EmiScheduleRepository emiScheduleRepository;
    private final LoanRepository loanRepository;
    private final ProcessedEventRepository processedEventRepository;
    private final LoanEventRepository loanEventRepository;

    public EmiDebitResultListener(EmiScheduleRepository emiScheduleRepository,
                                   LoanRepository loanRepository,
                                   ProcessedEventRepository processedEventRepository,
                                   LoanEventRepository loanEventRepository) {
        this.emiScheduleRepository = emiScheduleRepository;
        this.loanRepository = loanRepository;
        this.processedEventRepository = processedEventRepository;
        this.loanEventRepository = loanEventRepository;
    }

    @KafkaListener(topics = "emi.debit.result", groupId = "loan-service")
    @Transactional
    public void onEmiDebitResult(EmiDebitResultEvent event) {
        String key = "emi-result:" + event.idempotencyKey();
        if (processedEventRepository.existsByIdempotencyKey(key)) {
            log.info("Already processed EMI debit result: {}", key);
            return;
        }

        EmiSchedule emi = emiScheduleRepository.findById(event.emiId()).orElse(null);
        if (emi == null) {
            log.warn("EMI not found: {}", event.emiId());
            return;
        }

        if (event.success()) {
            emi.setStatus(EmiStatus.PAID);
            emi.setPaidAt(OffsetDateTime.now());
            emi.setDaysOverdue(0);
            emi.setPenaltyAmount(BigDecimal.ZERO);
            // Update outstanding
            loanRepository.findById(emi.getLoanId()).ifPresent(loan -> {
                BigDecimal newOutstanding = loan.getOutstandingAmount()
                        .subtract(emi.getPrincipalComponent())
                        .max(BigDecimal.ZERO);
                loan.setOutstandingAmount(newOutstanding);
                loanRepository.save(loan);
            });
        } else {
            long daysOverdue = ChronoUnit.DAYS.between(emi.getDueDate(), LocalDate.now());
            emi.setStatus(EmiStatus.OVERDUE);
            emi.setDaysOverdue((int) Math.max(0, daysOverdue));
            BigDecimal penalty = emi.getEmiAmount().multiply(new BigDecimal("0.02"));
            emi.setPenaltyAmount(penalty);
            // NPA classification
            updateNpaCategory(emi.getLoanId(), (int) Math.max(0, daysOverdue));
        }

        emiScheduleRepository.save(emi);

        ProcessedEvent pe = new ProcessedEvent();
        pe.setIdempotencyKey(key);
        processedEventRepository.save(pe);
    }

    private void updateNpaCategory(java.util.UUID loanId, int daysPastDue) {
        loanRepository.findById(loanId).ifPresent(loan -> {
            loan.setDaysPastDue(daysPastDue);
            com.fincore.loan_service.loan.NpaCategory category;
            if (daysPastDue >= 90) category = com.fincore.loan_service.loan.NpaCategory.NPA;
            else if (daysPastDue >= 61) category = com.fincore.loan_service.loan.NpaCategory.SMA_2;
            else if (daysPastDue >= 31) category = com.fincore.loan_service.loan.NpaCategory.SMA_1;
            else if (daysPastDue >= 1) category = com.fincore.loan_service.loan.NpaCategory.SMA_0;
            else category = com.fincore.loan_service.loan.NpaCategory.STANDARD;
            loan.setNpaCategory(category);
            loanRepository.save(loan);
        });
    }
}
