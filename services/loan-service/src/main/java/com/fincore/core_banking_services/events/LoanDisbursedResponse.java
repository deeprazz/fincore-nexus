package com.fincore.core_banking_services.events;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record LoanDisbursedResponse(
        UUID correlationId,
        UUID loanId,
        UUID accountId,
        BigDecimal disbursedAmount,
        OffsetDateTime disbursedAt,
        boolean success,
        String failureReason
) {}
