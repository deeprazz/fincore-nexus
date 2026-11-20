
package com.fincore.core_banking_services.account;

import java.math.BigDecimal;
import java.util.UUID;

public class AccountResponse {
    private String accountNumber;
    private BigDecimal balance;
    private UUID id;
    private UUID customerId;

    public UUID getId() {
        return id;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public UUID getCustomerId() {
        return customerId;
    }

    public AccountResponse(UUID id, String accountNumber, BigDecimal balance) {
        this(id, accountNumber, balance, null);
    }

    public AccountResponse(UUID id, String accountNumber, BigDecimal balance, UUID customerId) {
        this.id = id;
        this.accountNumber = formatAccountNumber(accountNumber);
        this.balance = balance;
        this.customerId = customerId;
    }

    private String formatAccountNumber(String accountNumber) {
        if (accountNumber != null && accountNumber.matches("\\d{12}")) {
            return accountNumber.replaceAll(
                    "(\\d{4})(\\d{4})(\\d{4})",
                    "$1-$2-$3"
            );
        }

        return accountNumber;
    }
}
