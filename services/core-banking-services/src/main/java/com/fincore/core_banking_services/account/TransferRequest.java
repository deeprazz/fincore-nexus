
package com.fincore.core_banking_services.account;

import java.math.BigDecimal;
import java.util.UUID;

public class TransferRequest {

    private UUID fromAccountId;
    private UUID toAccountId;
    private BigDecimal amount;

    public UUID getFromAccountId() {
        return fromAccountId;
    }

    public void setFromAccountId(UUID fromAccountId) {
        this.fromAccountId = fromAccountId;
    }

    public UUID getToAccountId() {
        return toAccountId;
    }

    public void setToAccountId(UUID toAccountId) {
        this.toAccountId = toAccountId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }
}
