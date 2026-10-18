package com.fincore.core_banking_services.account;

import java.math.BigDecimal;
import java.util.UUID;

public class CreateAccountRequest {
    private BigDecimal initialBalance;
    private UUID customerId;


    public void setInitialBalance(BigDecimal initialBalance) {
        this.initialBalance = initialBalance;
    }

    public void setCustomerId(UUID customerId) {
        this.customerId = customerId;
    }



    public BigDecimal getInitialBalance() {
        return initialBalance;
    }

    public UUID getCustomerId() {
        return customerId;
    }


}
