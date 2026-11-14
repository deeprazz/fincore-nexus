
package com.fincore.core_banking_services.account;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccountRepository extends JpaRepository<Account, UUID> {

     List<Account> findByCustomer_Id(UUID customerId);

     default List<Account> findByCustomerId(UUID customerId) {
         return findByCustomer_Id(customerId);
     }

     boolean existsByCustomer_Id(UUID customerId);

     boolean existsByAccountNumber(String accountNumber);

    java.util.Optional<Account> findByAccountNumber(String accountNumber);

     @Query(value = "SELECT nextval('account_number_seq')", nativeQuery = true)
     Long getNextAccountNumber();

     @Lock(LockModeType.PESSIMISTIC_WRITE)
     @Query("SELECT a FROM Account a WHERE a.id = :id")
     Optional<Account> findByIdForUpdate(@Param("id") UUID id);

     long countByStatus(AccountStatus status);

     @Query("SELECT COALESCE(SUM(a.balance), 0) FROM Account a WHERE a.status = :status")
     java.math.BigDecimal sumBalanceByStatus(@Param("status") AccountStatus status);

     @Query("SELECT COALESCE(SUM(a.balance), 0) FROM Account a")
     java.math.BigDecimal sumAllBalances();
}
