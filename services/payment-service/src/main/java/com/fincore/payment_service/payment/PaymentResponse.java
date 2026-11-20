package com.fincore.payment_service.payment;

import com.fincore.payment_service.fraud.FraudDecision;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PaymentResponse(
        UUID id,
        UUID customerId,
        UUID sourceAccountId,
        UUID beneficiaryId,
        String targetAccountNumber,
        String targetIfsc,
        String targetVpa,
        BigDecimal amount,
        PaymentRail paymentRail,
        String utr,
        String idempotencyKey,
        PaymentStatus status,
        BigDecimal fraudScore,
        FraudDecision fraudDecision,
        String triggeredRules,
        String purpose,
        String failureReason,
        String createdBy,
        String reviewedBy,
        OffsetDateTime reviewedAt,
        OffsetDateTime settledAt,
        OffsetDateTime createdAt
) {
    public static PaymentResponse from(Payment p) {
        return new PaymentResponse(
                p.getId(),
                p.getCustomerId(),
                p.getSourceAccountId(),
                p.getBeneficiary() != null ? p.getBeneficiary().getId() : null,
                p.getTargetAccountNumber(),
                p.getTargetIfsc(),
                p.getTargetVpa(),
                p.getAmount(),
                p.getPaymentRail(),
                p.getUtr(),
                p.getIdempotencyKey(),
                p.getStatus(),
                p.getFraudScore(),
                p.getFraudDecision(),
                p.getTriggeredRules(),
                p.getPurpose(),
                p.getFailureReason(),
                p.getCreatedBy(),
                p.getReviewedBy(),
                p.getReviewedAt(),
                p.getSettledAt(),
                p.getCreatedAt()
        );
    }
}
