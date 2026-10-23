package com.fincore.core_banking_services.customer;

import com.fincore.core_banking_services.account.Account;
import com.fincore.core_banking_services.account.AccountRepository;
import com.fincore.core_banking_services.account.AccountResponse;
import com.fincore.core_banking_services.account.AccountService;
import com.fincore.core_banking_services.account.TransferRequest;
import com.fincore.core_banking_services.transaction.BankingTransaction;
import com.fincore.core_banking_services.transaction.BankingTransactionRepository;
import com.fincore.core_banking_services.transaction.AccountStatementResponse;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Comparator;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/customer-portal")
public class CustomerPortalController {
    private final CustomerRepository customers;
    private final AccountRepository accounts;
    private final AccountService accountService;
    private final BankingTransactionRepository transactions;

    public CustomerPortalController(
            CustomerRepository customers,
            AccountRepository accounts,
            AccountService accountService,
            BankingTransactionRepository transactions) {
        this.customers = customers;
        this.accounts = accounts;
        this.accountService = accountService;
        this.transactions = transactions;
    }

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public PortalResponse me(Authentication authentication) {
        Customer customer = currentCustomer(authentication);
        List<AccountResponse> ownAccounts = customer.getKycStatus() == KycStatus.VERIFIED
                ? accounts.findByCustomer_Id(customer.getId()).stream()
                    .map(a -> new AccountResponse(a.getId(), a.getAccountNumber(), a.getBalance()))
                    .toList()
                : List.of();
        return new PortalResponse(customer.getId(), customer.getName(), customer.getEmail(),
                customer.getKycStatus(), ownAccounts);
    }

    @GetMapping("/transactions")
    @Transactional(readOnly = true)
    public List<TransactionResponse> transactions(
            @RequestParam UUID accountId,
            Authentication authentication) {
        Customer customer = requireVerifiedCustomer(authentication);
        Account account = accounts.findById(accountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
        if (!account.getCustomer().getId().equals(customer.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot view transactions for this account");
        }
        return transactions.findByAccountIdOrderByCreatedAtDesc(accountId).stream()
                .map(tx -> new TransactionResponse(tx.getId(), tx.getTransactionType(), tx.getAmount(),
                        tx.getBalanceAfter(), tx.getReferenceId(), tx.getCreatedAt()))
                .toList();
    }

    @GetMapping("/accounts/{accountId}/statement")
    @Transactional(readOnly = true)
    public AccountStatementResponse statement(
            @PathVariable UUID accountId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication) {
        Customer customer = requireVerifiedCustomer(authentication);
        Account account = accounts.findById(accountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
        if (!account.getCustomer().getId().equals(customer.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only view statements for your own account");
        }
        if (from != null && to != null && from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start date must be on or before end date");
        }

        Instant start = from == null ? null : from.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant end = to == null ? null : to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        List<BankingTransaction> all = transactions.findByAccountIdOrderByCreatedAtDesc(accountId);
        List<BankingTransaction> filtered = all.stream()
                .filter(tx -> start == null || !tx.getCreatedAt().isBefore(start))
                .filter(tx -> end == null || tx.getCreatedAt().isBefore(end))
                .toList();

        BigDecimal deposits = BigDecimal.ZERO;
        BigDecimal withdrawals = BigDecimal.ZERO;
        for (BankingTransaction tx : filtered) {
            String type = tx.getTransactionType();
            if ("DEPOSIT".equals(type) || "TRANSFER_IN".equals(type)) deposits = deposits.add(tx.getAmount());
            else if ("WITHDRAWAL".equals(type) || "TRANSFER_OUT".equals(type)) withdrawals = withdrawals.add(tx.getAmount());
        }

        BankingTransaction previous = all.stream()
                .filter(tx -> start != null && tx.getCreatedAt().isBefore(start))
                .max(Comparator.comparing(BankingTransaction::getCreatedAt)).orElse(null);
        BigDecimal opening;
        if (previous != null) {
            opening = previous.getBalanceAfter();
        } else if (!all.isEmpty()) {
            BankingTransaction earliest = all.get(all.size() - 1);
            opening = earliest.getBalanceAfter();
            String type = earliest.getTransactionType();
            if ("DEPOSIT".equals(type) || "TRANSFER_IN".equals(type)) opening = opening.subtract(earliest.getAmount());
            else if ("WITHDRAWAL".equals(type) || "TRANSFER_OUT".equals(type)) opening = opening.add(earliest.getAmount());
        } else {
            opening = account.getBalance();
        }
        BigDecimal closing = filtered.isEmpty() ? opening : filtered.get(0).getBalanceAfter();
        return new AccountStatementResponse(opening, deposits, withdrawals, closing, filtered.size(), filtered);
    }

    @PostMapping("/transfer")
    @Transactional
    public TransferResponse transfer(
            @RequestBody CustomerTransferRequest request,
            Authentication authentication) {
        Customer customer = requireVerifiedCustomer(authentication);
        if (request == null || request.sourceAccountId() == null
                || request.destinationAccountNumber() == null
                || request.destinationAccountNumber().isBlank()
                || request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Source account, recipient account number and a positive amount are required");
        }
        if (request.amount().scale() > 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Amount can have at most two decimal places");
        }

        Account source = accounts.findById(request.sourceAccountId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Source account not found"));
        if (!source.getCustomer().getId().equals(customer.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only transfer from your own account");
        }
        String recipientNumber = request.destinationAccountNumber().trim();
        Account destination = accounts.findByAccountNumber(recipientNumber)
                .or(() -> accounts.findByAccountNumber(recipientNumber.replace("-", "")))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipient account not found"));
        if (source.getId().equals(destination.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot transfer to the same account");
        }

        TransferRequest transfer = new TransferRequest();
        transfer.setFromAccountId(source.getId());
        transfer.setToAccountId(destination.getId());
        transfer.setAmount(request.amount());
        accountService.transfer(transfer);
        return new TransferResponse("Transfer completed successfully.");
    }

    private Customer currentCustomer(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required");
        }
        return customers.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
    }

    private Customer requireVerifiedCustomer(Authentication authentication) {
        Customer customer = currentCustomer(authentication);
        if (customer.getKycStatus() != KycStatus.VERIFIED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "KYC must be VERIFIED before banking operations");
        }
        return customer;
    }

    public record PortalResponse(UUID customerId, String name, String email,
                                 KycStatus kycStatus, List<AccountResponse> accounts) {}
    public record CustomerTransferRequest(UUID sourceAccountId, String destinationAccountNumber, BigDecimal amount) {}
    public record TransferResponse(String message) {}
    public record TransactionResponse(UUID id, String transactionType, BigDecimal amount,
                                     BigDecimal balanceAfter, UUID referenceId, java.time.Instant createdAt) {}
}
