package com.fincore.core_banking_services.account;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AccountRepository extends JpaRepository<Account, UUID> {
     List<Account> findByCustomer_Id(UUID customerID);
     boolean existsByAccountNumber(String accountNumber);


}
