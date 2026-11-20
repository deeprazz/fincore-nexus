
package com.fincore.core_banking_services.account;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountService accountService;
    private final com.fincore.core_banking_services.approval.ApprovalService approvalService;

    @org.springframework.beans.factory.annotation.Autowired
    public AccountController(
            AccountService accountService,
            com.fincore.core_banking_services.approval.ApprovalService approvalService) {
        this.accountService = accountService;
        this.approvalService = approvalService;
    }

    public AccountController(AccountService accountService) {
        this(accountService, null);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AccountResponse> getAccountById(
            @PathVariable UUID id) {

        return accountService.getAccountResponseWithCacheCheck(id)
                .map(cached -> ResponseEntity.ok()
                        .header("X-Cache", cached.cacheHit() ? "HIT" : "MISS")
                        .body(cached.response()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<AccountResponse>> getAllAccounts() {
        return ResponseEntity.ok(accountService.getAllAccounts());
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<List<AccountResponse>> getAccountsByCustomer(
            @PathVariable UUID customerId) {
        return ResponseEntity.ok(accountService.getAccountsByCustomerId(customerId));
    }

    @PostMapping
    public ResponseEntity<AccountResponse> createAccount(
            @RequestBody CreateAccountRequest request) {

        Account account = accountService.createAccount(request);

        AccountResponse response = new AccountResponse(
                account.getId(),
                account.getAccountNumber(),
                account.getBalance()
        );

        return ResponseEntity
                .created(URI.create("/api/accounts/" + account.getId()))
                .body(response);
    }

    @PostMapping("/{id}/withdraw")
    public ResponseEntity<?> withdraw(
            @PathVariable UUID id,
            @RequestBody WithdrawRequest request,
            org.springframework.security.core.Authentication auth) {

        if (approvalService != null && approvalService.isThresholdExceeded(request.getAmount())) {
            String maker = (auth != null && auth.getName() != null && !auth.getName().isBlank())
                    ? auth.getName()
                    : "teller";
            com.fincore.core_banking_services.approval.PendingApproval pending =
                    approvalService.submitPendingApproval("WITHDRAWAL", id, null, request.getAmount(),
                            "Large withdrawal exceeding approval threshold", maker);
            return ResponseEntity.status(org.springframework.http.HttpStatus.ACCEPTED).body(
                    java.util.Map.of(
                            "status", "PENDING_APPROVAL",
                            "approvalId", pending.getId().toString(),
                            "message", "Withdrawal of ₹" + request.getAmount() + " exceeds threshold (₹" + approvalService.getThreshold() + ") and has been placed in PENDING_APPROVAL."
                    )
            );
        }

        return ResponseEntity.ok(
                accountService.withdraw(id, request.getAmount(), request.getReferenceId()));
    }

    @PostMapping("/{id}/deposit")
    public ResponseEntity<AccountResponse> deposit(
            @PathVariable UUID id,
            @RequestBody DepositRequest request) {

        return ResponseEntity.ok(
                accountService.deposit(id, request.getAmount(), request.getReferenceId()));
    }

    @PostMapping("/transfer")
    public ResponseEntity<?> transfer(
            @RequestBody TransferRequest request,
            org.springframework.security.core.Authentication auth) {

        if (approvalService != null && approvalService.isThresholdExceeded(request.getAmount())) {
            String maker = (auth != null && auth.getName() != null && !auth.getName().isBlank())
                    ? auth.getName()
                    : "teller";
            com.fincore.core_banking_services.approval.PendingApproval pending =
                    approvalService.submitPendingApproval("TRANSFER", request.getFromAccountId(), request.getToAccountId(),
                            request.getAmount(), "Large transfer exceeding approval threshold", maker);
            return ResponseEntity.status(org.springframework.http.HttpStatus.ACCEPTED).body(
                    java.util.Map.of(
                            "status", "PENDING_APPROVAL",
                            "approvalId", pending.getId().toString(),
                            "message", "Transfer of ₹" + request.getAmount() + " exceeds threshold (₹" + approvalService.getThreshold() + ") and has been placed in PENDING_APPROVAL."
                    )
            );
        }

        accountService.transfer(request);
        return ResponseEntity.ok(java.util.Map.of("status", "SUCCESS", "message", "Transfer successful"));
    }

    @PostMapping("/{id}/freeze")
    public ResponseEntity<AccountResponse> freezeAccount(
            @PathVariable UUID id) {

        return ResponseEntity.ok(accountService.freezeAccount(id));
    }

    @PostMapping("/{id}/unfreeze")
    public ResponseEntity<AccountResponse> unfreezeAccount(
            @PathVariable UUID id) {

        return ResponseEntity.ok(accountService.unfreezeAccount(id));
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<AccountResponse> closeAccount(
            @PathVariable UUID id) {

        return ResponseEntity.ok(accountService.closeAccount(id));
    }

//    @GetMapping("/{id}/statement")
//    public ResponseEntity<?> getStatement(
//            @PathVariable UUID id,
//            @RequestParam
//            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
//            LocalDate from,
//            @RequestParam
//            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
//            LocalDate to) {
//
//        if (from == null || to == null) {
//            return ResponseEntity.badRequest()
//                    .body("Start date and end date are required");
//        }
//
//        if (from.isAfter(to)) {
//            return ResponseEntity.badRequest()
//                    .body("Start date must be on or before end date");
//        }
//
//        return ResponseEntity.ok(
//                accountService.getStatement(id, from, to));
//    }
}
