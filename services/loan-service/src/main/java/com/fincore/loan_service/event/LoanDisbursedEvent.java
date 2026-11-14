package com.fincore.loan_service.event;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record LoanDisbursedEvent(
        UUID correlationId,
        UUID loanId,
        UUID accountId,
        BigDecimal disbursedAmount,
        OffsetDateTime disbursedAt,
        boolean success,
        String failureReason
) {}
