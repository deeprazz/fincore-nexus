
package com.fincore.core_banking_services.account;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<AccountResponse> getAccountById(
            @PathVariable UUID id) {

        return accountService.getAccountResponseById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<AccountResponse>> getAllAccounts() {
        return ResponseEntity.ok(accountService.getAllAccounts());
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
    public ResponseEntity<AccountResponse> withdraw(
            @PathVariable UUID id,
            @RequestBody WithdrawRequest request) {

        return ResponseEntity.ok(
                accountService.withdraw(id, request.getAmount()));
    }

    @PostMapping("/{id}/deposit")
    public ResponseEntity<AccountResponse> deposit(
            @PathVariable UUID id,
            @RequestBody DepositRequest request) {

        return ResponseEntity.ok(
                accountService.deposit(id, request.getAmount()));
    }

    @PostMapping("/transfer")
    public ResponseEntity<String> transfer(
            @RequestBody TransferRequest request) {

        accountService.transfer(request);
        return ResponseEntity.ok("Transfer successful");
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
