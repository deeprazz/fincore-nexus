package com.fincore.payment_service.event;

import java.math.BigDecimal;
import java.util.UUID;

public record PaymentFailedEvent(
        UUID correlationId,
        UUID paymentId,
        UUID customerId,
        BigDecimal amount,
        String utr,
        String reason
) {}
