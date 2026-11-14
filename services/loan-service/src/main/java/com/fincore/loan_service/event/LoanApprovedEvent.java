package com.fincore.loan_service.event;

import java.math.BigDecimal;
import java.util.UUID;

public record LoanApprovedEvent(
        UUID correlationId,
        UUID loanId,
        UUID customerId,
        UUID targetAccountId,
        BigDecimal amount,
        String currency
) {}
