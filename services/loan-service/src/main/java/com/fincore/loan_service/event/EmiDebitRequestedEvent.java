package com.fincore.loan_service.event;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record EmiDebitRequestedEvent(
        UUID idempotencyKey,
        UUID loanId,
        UUID emiId,
        UUID accountId,
        BigDecimal amount,
        LocalDate dueDate
) {}
