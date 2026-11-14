package com.fincore.loan_service.loan;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record LoanResponse(
        UUID id,
        UUID applicationId,
        UUID customerId,
        BigDecimal principalAmount,
        BigDecimal outstandingAmount,
        BigDecimal interestRate,
        int tenureMonths,
        BigDecimal emiAmount,
        OffsetDateTime disbursedAt,
        LocalDate startDate,
        LocalDate endDate,
        UUID accountId,
        LoanStatus status,
        NpaCategory npaCategory,
        int daysPastDue,
        OffsetDateTime createdAt
) {
    public static LoanResponse from(Loan loan) {
        return new LoanResponse(
                loan.getId(), loan.getApplicationId(), loan.getCustomerId(),
                loan.getPrincipalAmount(), loan.getOutstandingAmount(),
                loan.getInterestRate(), loan.getTenureMonths(), loan.getEmiAmount(),
                loan.getDisbursedAt(), loan.getStartDate(), loan.getEndDate(),
                loan.getAccountId(), loan.getStatus(), loan.getNpaCategory(),
                loan.getDaysPastDue(), loan.getCreatedAt()
        );
    }
}
