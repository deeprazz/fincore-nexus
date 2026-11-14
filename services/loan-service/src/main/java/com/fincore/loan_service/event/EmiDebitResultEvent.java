package com.fincore.loan_service.event;

import java.math.BigDecimal;
import java.util.UUID;

public record EmiDebitResultEvent(
        UUID idempotencyKey,
        UUID loanId,
        UUID emiId,
        boolean success,
        String failureReason
) {}
