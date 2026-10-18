package com.fincore.core_banking_services.account;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AccountRepository extends JpaRepository<Account, UUID> {
     List<Account> findByCustomer_Id(UUID customerID);
     boolean existsByAccountNumber(String accountNumber);

     @Query(value = "SELECT nextval('account_number_seq')", nativeQuery = true)
     Long getNextAccountNumber();

     @Lock(LockModeType.PESSIMISTIC_WRITE)
     @Query("SELECT a FROM Account a WHERE a.id = :id")
     Optional<Account> findByIdForUpdate(@Param("id") UUID id);


}
