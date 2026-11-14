package com.fincore.payment_service.event;

import com.fincore.payment_service.payment.PaymentRail;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PaymentCompletedEvent(
        UUID correlationId,
        UUID paymentId,
        UUID customerId,
        UUID sourceAccountId,
        String targetAccount,
        BigDecimal amount,
        PaymentRail paymentRail,
        String utr,
        OffsetDateTime completedAt
) {}
