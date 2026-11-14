package com.fincore.payment_service.event;

import java.math.BigDecimal;
import java.util.UUID;

public record PaymentDebitCommand(
        UUID correlationId,
        UUID paymentId,
        UUID accountId,
        BigDecimal amount,
        String description
) {}
