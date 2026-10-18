package com.fincore.core_banking_services.account;
import java.math.BigDecimal;
public class WithdrawRequest {
    private BigDecimal amount;

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }
}
