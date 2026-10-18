
package com.fincore.core_banking_services;

import com.fincore.core_banking_services.account.Account;
import com.fincore.core_banking_services.account.AccountRepository;

import com.fincore.core_banking_services.account.AccountStatus;
import com.fincore.core_banking_services.customer.Customer;
import com.fincore.core_banking_services.customer.CustomerRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class AccountIntegrationTest {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private CustomerRepository customerRepository;
    @Test
    void shouldPersistAndRetrieveAccountBalance() {
        // 1. Create a customer for this test
        Customer customer = new Customer(
                "Test Customer",
                "test-" + UUID.randomUUID() + "@example.com"
        );

        Customer savedCustomer = customerRepository.saveAndFlush(customer);

        // 2. Create an account linked to that customer
        Account account = new Account();
        account.setAccountNumber(
                "T-" + UUID.randomUUID().toString().substring(0, 8)
        );
        account.setBalance(new BigDecimal("1000.00"));
        account.setCustomer(savedCustomer);
        account.setStatus(AccountStatus.ACTIVE);

        // 3. Save the account to PostgreSQL
        Account savedAccount = accountRepository.saveAndFlush(account);
        UUID accountId = savedAccount.getId();

        // 4. Update the balance
        savedAccount.setBalance(new BigDecimal("1001.00"));
        accountRepository.saveAndFlush(savedAccount);

        // 5. Clear the persistence context so we fetch from the database
        entityManager.clear();

        // 6. Retrieve the account again and verify the saved balance
        Account reloadedAccount =
                accountRepository.findById(accountId).orElseThrow();

        assertEquals(
                0,
                new BigDecimal("1001.00").compareTo(reloadedAccount.getBalance()),
                "Updated balance should be persisted in PostgreSQL"
        );
    }

}
