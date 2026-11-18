package com.fincore.loan_service.loan;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record LoanApplicationResponse(
        UUID id,
        UUID customerId,
        BigDecimal requestedAmount,
        int tenureMonths,
        String purpose,
        String employmentType,
        ApplicationStatus status,
        Integer creditScore,
        String rejectionReason,
        String reviewerId,
        String createdBy,
        OffsetDateTime reviewedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static LoanApplicationResponse from(LoanApplication app) {
        return new LoanApplicationResponse(
                app.getId(), app.getCustomerId(), app.getRequestedAmount(),
                app.getTenureMonths(), app.getPurpose(), app.getEmploymentType(),
                app.getStatus(), app.getCreditScore(), app.getRejectionReason(),
                app.getReviewerId(), app.getCreatedBy(), app.getReviewedAt(), app.getCreatedAt(), app.getUpdatedAt()
        );
    }
}
