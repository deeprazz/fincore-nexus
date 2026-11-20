package com.fincore.core_banking_services.events;

import java.util.UUID;

public record EmiDebitResultResponse(
        UUID idempotencyKey,
        UUID loanId,
        UUID emiId,
        boolean success,
        String failureReason
) {}
