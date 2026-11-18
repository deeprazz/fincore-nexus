package com.fincore.payment_service.client;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class CoreTransactionDto {
    private UUID id;
    private UUID accountId;
    private String transactionType;
    private BigDecimal amount;
    private BigDecimal balanceAfter;
    private UUID referenceId;
    private Instant createdAt;

    public CoreTransactionDto() {}

    public CoreTransactionDto(UUID id, UUID accountId, String transactionType, BigDecimal amount, BigDecimal balanceAfter, UUID referenceId, Instant createdAt) {
        this.id = id;
        this.accountId = accountId;
        this.transactionType = transactionType;
        this.amount = amount;
        this.balanceAfter = balanceAfter;
        this.referenceId = referenceId;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getAccountId() { return accountId; }
    public void setAccountId(UUID accountId) { this.accountId = accountId; }

    public String getTransactionType() { return transactionType; }
    public void setTransactionType(String transactionType) { this.transactionType = transactionType; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public BigDecimal getBalanceAfter() { return balanceAfter; }
    public void setBalanceAfter(BigDecimal balanceAfter) { this.balanceAfter = balanceAfter; }

    public UUID getReferenceId() { return referenceId; }
    public void setReferenceId(UUID referenceId) { this.referenceId = referenceId; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
