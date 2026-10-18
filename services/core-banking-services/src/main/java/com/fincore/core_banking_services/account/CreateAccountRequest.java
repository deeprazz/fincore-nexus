package com.fincore.core_banking_services.account;

import java.math.BigDecimal;
import java.util.UUID;

public class CreateAccountRequest {
    private BigDecimal initialBalance;
    private UUID customerId;
    private String accountNumber;

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public void setInitialBalance(BigDecimal initialBalance) {
        this.initialBalance = initialBalance;
    }

    public void setCustomerId(UUID customerId) {
        this.customerId = customerId;
    }


    public String getAccountNumber() {
        return accountNumber;
    }

    public BigDecimal getInitialBalance() {
        return initialBalance;
    }

    public UUID getCustomerId() {
        return customerId;
    }


}
