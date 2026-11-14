package com.fincore.payment_service.event;

import com.fincore.payment_service.payment.PaymentRail;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PaymentSettledEvent(
        UUID paymentId,
        String utr,
        PaymentRail paymentRail,
        BigDecimal amount,
        OffsetDateTime settledAt
) {}
