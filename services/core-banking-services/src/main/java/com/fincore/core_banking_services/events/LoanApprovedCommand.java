package com.fincore.core_banking_services.events;

import java.math.BigDecimal;
import java.util.UUID;

public record LoanApprovedCommand(
        UUID correlationId,
        UUID loanId,
        UUID customerId,
        UUID targetAccountId,
        BigDecimal amount,
        String currency
) {}
