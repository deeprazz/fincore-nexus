package com.fincore.payment_service.event;

import com.fincore.payment_service.payment.PaymentRail;
import java.math.BigDecimal;
import java.util.UUID;

public record PaymentInitiatedEvent(
        UUID correlationId,
        UUID paymentId,
        UUID customerId,
        UUID sourceAccountId,
        BigDecimal amount,
        PaymentRail paymentRail,
        String utr
) {}
