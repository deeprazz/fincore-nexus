package com.fincore.loan_service.emi;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record EmiScheduleResponse(
        UUID id,
        UUID loanId,
        int installmentNumber,
        LocalDate dueDate,
        BigDecimal emiAmount,
        BigDecimal principalComponent,
        BigDecimal interestComponent,
        BigDecimal outstandingAfter,
        String status,
        OffsetDateTime paidAt,
        BigDecimal penaltyAmount,
        int daysOverdue
) {
    public static EmiScheduleResponse from(EmiSchedule e) {
        return new EmiScheduleResponse(
                e.getId(), e.getLoanId(), e.getInstallmentNumber(), e.getDueDate(),
                e.getEmiAmount(), e.getPrincipalComponent(), e.getInterestComponent(),
                e.getOutstandingAfter(), e.getStatus().name(), e.getPaidAt(),
                e.getPenaltyAmount(), e.getDaysOverdue()
        );
    }
}
