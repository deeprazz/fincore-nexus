
package com.fincore.core_banking_services.transaction;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final BankingTransactionRepository repository;

    public TransactionController(BankingTransactionRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/account/{accountId}")
    public List<BankingTransaction> getTransactionsByAccount(
            @PathVariable UUID accountId) {

        return repository.findByAccountIdOrderByCreatedAtDesc(accountId);
    }
}
