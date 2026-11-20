package com.fincore.payment_service.payment;

public enum PaymentStatus {
    INITIATED,
    FRAUD_CHECKED,
    PENDING_REVIEW,
    DEBITED,
    CREDITED,
    SETTLED,
    FAILED,
    REVERSED,
    COMPENSATION_PENDING
}
