package com.fincore.core_banking_services.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Event emitted for a persisted banking transaction, after the DB transaction commits. */
public record TransactionCompletedEvent(
        UUID transactionId,
        UUID accountId,
        String transactionType,
        BigDecimal amount,
        BigDecimal balanceAfter,
        UUID referenceId,
        Instant occurredAt
) {
}
