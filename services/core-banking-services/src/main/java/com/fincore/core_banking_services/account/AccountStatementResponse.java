
package com.fincore.core_banking_services.account;

import com.fincore.core_banking_services.transaction.BankingTransaction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record AccountStatementResponse(
        UUID accountId,
        String accountNumber,
        LocalDate from,
        LocalDate to,
        BigDecimal currentBalance,
        List<BankingTransaction> transactions
) {
}
