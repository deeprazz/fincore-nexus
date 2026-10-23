
package com.fincore.core_banking_services.transaction;

import com.fincore.core_banking_services.account.Account;
import com.fincore.core_banking_services.account.AccountRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;


@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/accounts")
public class AccountStatementController {

    private final BankingTransactionRepository transactionRepository;
    private final AccountRepository accountRepository;

    public AccountStatementController(
            BankingTransactionRepository transactionRepository,
            AccountRepository accountRepository) {
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
    }

    @GetMapping("/{accountId}/statement")
    public AccountStatementResponse getAccountStatement(
            @PathVariable UUID accountId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to) {

        if (from != null && to != null && from.isAfter(to)) {
            throw new IllegalArgumentException(
                    "'from' date must not be after 'to' date");
        }

        // Verify that the account exists.
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Account not found"));

        Instant start = from == null
                ? null
                : from.atStartOfDay().toInstant(ZoneOffset.UTC);

        Instant end = to == null
                ? null
                : to.plusDays(1).atStartOfDay()
                .toInstant(ZoneOffset.UTC);

        List<BankingTransaction> allTransactions =
                transactionRepository
                        .findByAccountIdOrderByCreatedAtDesc(accountId);

        List<BankingTransaction> transactions = allTransactions.stream()
                .filter(t -> start == null
                        || !t.getCreatedAt().isBefore(start))
                .filter(t -> end == null
                        || t.getCreatedAt().isBefore(end))
                .toList();

        BigDecimal deposits = BigDecimal.ZERO;
        BigDecimal withdrawals = BigDecimal.ZERO;

        for (BankingTransaction t : transactions) {
            String type = t.getTransactionType();

            if ("DEPOSIT".equals(type) || "TRANSFER_IN".equals(type)) {
                deposits = deposits.add(t.getAmount());
            } else if ("WITHDRAWAL".equals(type)
                    || "TRANSFER_OUT".equals(type)) {
                withdrawals = withdrawals.add(t.getAmount());
            }
        }

        // Find the most recent transaction before the selected period.
        BankingTransaction previousTransaction = allTransactions.stream()
                .filter(t -> start != null
                        && t.getCreatedAt().isBefore(start))
                .max(Comparator.comparing(BankingTransaction::getCreatedAt))
                .orElse(null);

        BigDecimal openingBalance;

        if (previousTransaction != null) {
            openingBalance = previousTransaction.getBalanceAfter();
        } else if (!allTransactions.isEmpty()) {
            // Infer the balance before the account's first recorded transaction.
            BankingTransaction earliestTransaction =
                    allTransactions.get(allTransactions.size() - 1);

            openingBalance = earliestTransaction.getBalanceAfter();

            String type = earliestTransaction.getTransactionType();

            if ("DEPOSIT".equals(type) || "TRANSFER_IN".equals(type)) {
                openingBalance =
                        openingBalance.subtract(earliestTransaction.getAmount());
            } else if ("WITHDRAWAL".equals(type)
                    || "TRANSFER_OUT".equals(type)) {
                openingBalance =
                        openingBalance.add(earliestTransaction.getAmount());
            }
        } else {
            // No recorded transactions: current balance is the best available
            // balance, but it is not necessarily a historical opening balance.
            openingBalance = account.getBalance();
        }

        BigDecimal closingBalance = transactions.isEmpty()
                ? openingBalance
                : transactions.get(0).getBalanceAfter();

        return new AccountStatementResponse(
                openingBalance,
                deposits,
                withdrawals,
                closingBalance,
                transactions.size(),
                transactions
        );
    }
}
