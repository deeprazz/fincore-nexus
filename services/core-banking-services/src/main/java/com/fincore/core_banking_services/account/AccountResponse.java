package com.fincore.core_banking_services.account;

import java.math.BigDecimal;
import java.util.UUID;

public class AccountResponse {
    private UUID id;
    private String accountNumber;
    private BigDecimal balance;
    private UUID customerId;
    private String status;

    public AccountResponse() {
    }

    public AccountResponse(UUID id, String accountNumber, BigDecimal balance) {
        this(id, accountNumber, balance, null, "ACTIVE");
    }

    public AccountResponse(UUID id, String accountNumber, BigDecimal balance, UUID customerId) {
        this(id, accountNumber, balance, customerId, "ACTIVE");
    }

    public AccountResponse(UUID id, String accountNumber, BigDecimal balance, UUID customerId, String status) {
        this.id = id;
        this.accountNumber = formatAccountNumber(accountNumber);
        this.balance = balance;
        this.customerId = customerId;
        this.status = status != null ? status : "ACTIVE";
    }

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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
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
