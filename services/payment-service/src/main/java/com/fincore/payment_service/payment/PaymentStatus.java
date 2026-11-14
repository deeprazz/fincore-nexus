package com.fincore.payment_service.payment;

public enum PaymentStatus {
    INITIATED,
    FRAUD_CHECKED,
    DEBITED,
    CREDITED,
    SETTLED,
    FAILED,
    REVERSED
}
