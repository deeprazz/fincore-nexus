package com.fincore.core_banking_services.events;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record EmiDebitCommand(
        UUID idempotencyKey,
        UUID loanId,
        UUID emiId,
        UUID accountId,
        BigDecimal amount,
        LocalDate dueDate
) {}
