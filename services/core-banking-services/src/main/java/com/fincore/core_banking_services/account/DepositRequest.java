package com.fincore.core_banking_services.account;

import java.math.BigDecimal;
import java.util.UUID;

public class DepositRequest {

    private BigDecimal amount;
    private String description;
    private UUID referenceId;

    public DepositRequest() {
    }

    public DepositRequest(BigDecimal amount) {
        this.amount = amount;
    }

    public DepositRequest(BigDecimal amount, String description) {
        this.amount = amount;
        this.description = description;
    }

    public DepositRequest(BigDecimal amount, String description, UUID referenceId) {
        this.amount = amount;
        this.description = description;
        this.referenceId = referenceId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public UUID getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(UUID referenceId) {
        this.referenceId = referenceId;
    }
}
