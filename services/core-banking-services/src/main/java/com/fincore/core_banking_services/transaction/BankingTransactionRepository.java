
package com.fincore.core_banking_services.transaction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BankingTransactionRepository
        extends JpaRepository<BankingTransaction, UUID> {

    List<BankingTransaction> findByAccountIdOrderByCreatedAtDesc(
            UUID accountId
    );
}
