
package com.fincore.core_banking_services.transaction;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "banking_transaction")
public class BankingTransaction {

    @Id
    private UUID id;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "transaction_type", nullable = false)
    private String transactionType;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(
            name = "balance_after",
            nullable = false,
            precision = 19,
            scale = 2
    )
    private BigDecimal balanceAfter;

    @Column(name = "reference_id")
    private UUID referenceId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected BankingTransaction() {
    }

    public BankingTransaction(
            UUID accountId,
            String transactionType,
            BigDecimal amount,
            BigDecimal balanceAfter,
            UUID referenceId
    ) {
        if (accountId == null) {
            throw new IllegalArgumentException("Account ID is required");
        }

        if (transactionType == null || transactionType.isBlank()) {
            throw new IllegalArgumentException(
                    "Transaction type is required");
        }

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Transaction amount must be greater than zero");
        }

        if (balanceAfter == null
                || balanceAfter.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException(
                    "Balance after transaction cannot be negative");
        }

        this.id = UUID.randomUUID();
        this.accountId = accountId;
        this.transactionType = transactionType;
        this.amount = amount;
        this.balanceAfter = balanceAfter;
        this.referenceId = referenceId;
        this.createdAt = Instant.now();
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }

        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getAccountId() {
        return accountId;
    }

    public String getTransactionType() {
        return transactionType;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public BigDecimal getBalanceAfter() {
        return balanceAfter;
    }

    public UUID getReferenceId() {
        return referenceId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
