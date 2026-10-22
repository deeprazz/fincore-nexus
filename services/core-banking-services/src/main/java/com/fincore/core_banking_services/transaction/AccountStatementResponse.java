
package com.fincore.core_banking_services.transaction;

import java.math.BigDecimal;
import java.util.List;

public record AccountStatementResponse(
        BigDecimal openingBalance,
        BigDecimal totalDeposits,
        BigDecimal totalWithdrawals,
        BigDecimal closingBalance,
        int totalTransactions,
        List<BankingTransaction> transactions
) {
}
