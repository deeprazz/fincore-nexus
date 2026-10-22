
package com.fincore.core_banking_services.transaction;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/accounts")
public class AccountStatementController {

    private final BankingTransactionRepository transactionRepository;

    public AccountStatementController(
            BankingTransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
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

        Instant start = from == null
                ? null
                : from.atStartOfDay().toInstant(ZoneOffset.UTC);

        Instant end = to == null
                ? null
                : to.plusDays(1).atStartOfDay()
                .toInstant(ZoneOffset.UTC);

        List<BankingTransaction> transactions =
                transactionRepository
                        .findByAccountIdOrderByCreatedAtDesc(accountId)
                        .stream()
                        .filter(t -> start == null
                                || !t.getCreatedAt().isBefore(start))
                        .filter(t -> end == null
                                || t.getCreatedAt().isBefore(end))
                        .toList();

        BigDecimal deposits = BigDecimal.ZERO;
        BigDecimal withdrawals = BigDecimal.ZERO;

        for (BankingTransaction t : transactions) {
            if ("DEPOSIT".equals(t.getTransactionType())) {
                deposits = deposits.add(t.getAmount());
            } else if ("WITHDRAWAL".equals(t.getTransactionType())) {
                withdrawals = withdrawals.add(t.getAmount());
            }
        }

        BigDecimal openingBalance = BigDecimal.ZERO;
        BigDecimal closingBalance = BigDecimal.ZERO;

        if (!transactions.isEmpty()) {
            BankingTransaction latest = transactions.get(0);
            BankingTransaction earliest =
                    transactions.get(transactions.size() - 1);

            closingBalance = latest.getBalanceAfter();
            openingBalance = earliest.getBalanceAfter();

            if ("DEPOSIT".equals(earliest.getTransactionType())) {
                openingBalance =
                        openingBalance.subtract(earliest.getAmount());
            } else if ("WITHDRAWAL".equals(
                    earliest.getTransactionType())) {
                openingBalance =
                        openingBalance.add(earliest.getAmount());
            }
        }

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
