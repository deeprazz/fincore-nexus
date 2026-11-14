package com.fincore.core_banking_services.account;

import java.math.BigDecimal;

public class DepositRequest {

    private BigDecimal amount;
    private String description;

    public DepositRequest() {
    }

    public DepositRequest(BigDecimal amount) {
        this.amount = amount;
    }

    public DepositRequest(BigDecimal amount, String description) {
        this.amount = amount;
        this.description = description;
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
}
