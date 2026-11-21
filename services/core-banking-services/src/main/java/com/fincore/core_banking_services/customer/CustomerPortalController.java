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
import org.springframework.http.ResponseEntity;
import org.springframework.http.CacheControl;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.crypto.password.PasswordEncoder;

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
    private final PasswordEncoder passwordEncoder;

    public CustomerPortalController(
            CustomerRepository customers,
            AccountRepository accounts,
            AccountService accountService,
            BankingTransactionRepository transactions,
            PasswordEncoder passwordEncoder) {
        this.customers = customers;
        this.accounts = accounts;
        this.accountService = accountService;
        this.transactions = transactions;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public ResponseEntity<PortalResponse> me(Authentication authentication) {
        Customer customer = currentCustomer(authentication);
        List<AccountResponse> ownAccounts = customer.getKycStatus() == KycStatus.VERIFIED
                ? accounts.findByCustomer_Id(customer.getId()).stream()
                    .map(a -> new AccountResponse(
                            a.getId(),
                            a.getAccountNumber(),
                            a.getBalance(),
                            customer.getId(),
                            a.getStatus() != null ? a.getStatus().name() : "ACTIVE"))
                    .toList()
                : List.of();
        PortalResponse body = new PortalResponse(customer.getId(), customer.getName(), customer.getEmail(),
                customer.getKycStatus(), ownAccounts, customer.hasTransactionPin());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore().mustRevalidate())
                .body(body);
    }

    @GetMapping("/accounts")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AccountResponse>> accounts(Authentication authentication) {
        Customer customer = requireVerifiedCustomer(authentication);
        List<AccountResponse> ownAccounts = accounts.findByCustomer_Id(customer.getId()).stream()
                .map(a -> new AccountResponse(
                        a.getId(),
                        a.getAccountNumber(),
                        a.getBalance(),
                        customer.getId(),
                        a.getStatus() != null ? a.getStatus().name() : "ACTIVE"))
                .toList();
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore().mustRevalidate())
                .body(ownAccounts);
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

    @GetMapping("/statement")
    @Transactional(readOnly = true)
    public AccountStatementResponse statementForCustomer(
            @RequestParam(required = false) UUID accountId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication) {
        Customer customer = requireVerifiedCustomer(authentication);
        UUID targetAccountId = accountId;
        if (targetAccountId == null) {
            List<Account> ownAccounts = accounts.findByCustomer_Id(customer.getId());
            if (ownAccounts.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No accounts found for customer");
            }
            targetAccountId = ownAccounts.get(0).getId();
        }
        return statement(targetAccountId, from, to, authentication);
    }

    @GetMapping(value = "/statement/export", produces = "text/csv")
    @Transactional(readOnly = true)
    public org.springframework.http.ResponseEntity<String> exportStatementCsvForCustomer(
            @RequestParam(required = false) UUID accountId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication) {
        Customer customer = requireVerifiedCustomer(authentication);
        UUID targetAccountId = accountId;
        if (targetAccountId == null) {
            List<Account> ownAccounts = accounts.findByCustomer_Id(customer.getId());
            if (ownAccounts.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No accounts found for customer");
            }
            targetAccountId = ownAccounts.get(0).getId();
        }
        return exportStatementCsv(targetAccountId, from, to, authentication);
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

    @GetMapping(value = "/accounts/{accountId}/statement/export", produces = "text/csv")
    @Transactional(readOnly = true)
    public org.springframework.http.ResponseEntity<String> exportStatementCsv(
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
        AccountStatementResponse res = statement(accountId, from, to, authentication);
        String csv = com.fincore.core_banking_services.transaction.AccountStatementController.formatCsv(account, res);
        return org.springframework.http.ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"statement-" + account.getAccountNumber() + ".csv\"")
                .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8")
                .body(csv);
    }

    @PostMapping("/pin")
    @Transactional
    public PinResponse setOrChangeTransactionPin(
            @RequestBody PinRequest request,
            Authentication authentication) {
        Customer customer = requireVerifiedCustomer(authentication);
        if (request == null || request.pin() == null || !request.pin().matches("\\d{4}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Transaction PIN must contain exactly 4 digits");
        }
        if (customer.isPinLocked()) {
            throw new ResponseStatusException(HttpStatus.LOCKED, "Transaction PIN is locked due to 5 consecutive failed attempts. Please try again after " + customer.getPinLockedUntil());
        }
        if (customer.hasTransactionPin()) {
            if (request.currentPin() == null || !passwordEncoder.matches(request.currentPin(), customer.getTransactionPinHash())) {
                customer.registerFailedPinAttempt();
                customers.save(customer);
                if (customer.isPinLocked()) {
                    throw new ResponseStatusException(HttpStatus.LOCKED, "Transaction PIN is now locked for 15 minutes due to 5 consecutive failed attempts");
                }
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current transaction PIN is incorrect. Failed attempts: " + customer.getFailedPinAttempts() + "/5");
            }
        } else if (request.currentPin() != null && !request.currentPin().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No current PIN is set yet");
        }
        customer.resetPinAttempts();
        customer.setTransactionPinHash(passwordEncoder.encode(request.pin()));
        customers.save(customer);
        return new PinResponse(customer.hasTransactionPin(), customer.hasTransactionPin() ? "Transaction PIN saved successfully." : "Transaction PIN saved.");
    }

    @PostMapping("/transfer")
    @Transactional
    public TransferResponse transfer(
            @RequestBody CustomerTransferRequest request,
            Authentication authentication) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Transfer request is required");
        }
        if (request.sourceAccountId() == null
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
        if (request.transactionPin() == null || !request.transactionPin().matches("\\d{4}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid 4-digit transaction PIN is required");
        }

        Customer customer = requireVerifiedCustomer(authentication);
        if (!customer.hasTransactionPin()) {
            throw new ResponseStatusException(HttpStatus.PRECONDITION_REQUIRED, "Set a transaction PIN before transferring money");
        }
        if (customer.isPinLocked()) {
            throw new ResponseStatusException(HttpStatus.LOCKED, "Transaction PIN is locked due to 5 consecutive failed attempts. Please try again after " + customer.getPinLockedUntil());
        }
        if (!passwordEncoder.matches(request.transactionPin(), customer.getTransactionPinHash())) {
            customer.registerFailedPinAttempt();
            customers.save(customer);
            if (customer.isPinLocked()) {
                throw new ResponseStatusException(HttpStatus.LOCKED, "Transaction PIN is now locked for 15 minutes due to 5 consecutive failed attempts");
            }
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Transaction PIN is incorrect. Failed attempts: " + customer.getFailedPinAttempts() + "/5");
        }
        customer.resetPinAttempts();
        customers.save(customer);

        Account source = accounts.findById(request.sourceAccountId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Source account not found"));
        if (!source.getCustomer().getId().equals(customer.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only transfer from your own account");
        }
        if (source.getStatus() != com.fincore.core_banking_services.account.AccountStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Source account is " + source.getStatus() + ". Only active accounts can perform transfers.");
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
        String utr = "FINC" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        return new TransferResponse("Transfer completed successfully.", utr, source.getAccountNumber(), destination.getAccountNumber(), request.amount(), "SETTLED");
    }

    private Customer currentCustomer(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required");
        }
        String principal = authentication.getName();
        return customers.findByEmailIgnoreCase(principal)
                .or(() -> customers.findByNameIgnoreCase(principal))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found for: " + principal));
    }

    private Customer requireVerifiedCustomer(Authentication authentication) {
        Customer customer = currentCustomer(authentication);
        if (customer.getKycStatus() != KycStatus.VERIFIED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "KYC must be VERIFIED before banking operations");
        }
        return customer;
    }

    public record PortalResponse(UUID customerId, String name, String email,
                                 KycStatus kycStatus, List<AccountResponse> accounts, boolean hasTransactionPin) {}
    public record PinRequest(String currentPin, String pin) {}
    public record PinResponse(boolean hasTransactionPin, String message) {}
    public record CustomerTransferRequest(UUID sourceAccountId, String destinationAccountNumber, BigDecimal amount, String transactionPin) {}
    public record TransferResponse(String message, String utr, String fromAccount, String toAccount, BigDecimal amount, String status) {
        public TransferResponse(String message) {
            this(message, null, null, null, null, "SETTLED");
        }
    }
    public record TransactionResponse(UUID id, String transactionType, BigDecimal amount,
                                     BigDecimal balanceAfter, UUID referenceId, java.time.Instant createdAt) {}
}
