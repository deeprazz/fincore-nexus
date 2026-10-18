package com.fincore.core_banking_services.account;

import com.fincore.core_banking_services.customer.Customer;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import com.fincore.core_banking_services.customer.CustomerRepository;
import java.util.Optional;
import java.util.UUID;
import java.math.BigDecimal;
@Service
public class AccountService {

    private final AccountRepository repository;
    private final CustomerRepository customerRepository;

    public AccountService(AccountRepository repository,CustomerRepository customerRepository) {
        this.repository = repository;
        this.customerRepository = customerRepository;
    }

    public Optional<Account> getAccountById(UUID id) {
        return repository.findById(id);
    }

    @Transactional
    public AccountResponse withdraw(UUID accountId, BigDecimal amount) {
        Optional<Account> accountOptional = repository.findById(accountId);
        if (accountOptional.isEmpty()){
            throw new IllegalArgumentException("account does not exist");
        }
        Account account = accountOptional.get();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Withdrawal amount must be greater than zero"
            );
        }
        if (account.getBalance().compareTo(amount) < 0) {
            throw new IllegalArgumentException("Insufficient balance");
        }

        BigDecimal newBalance = account.getBalance().subtract(amount);
        account.setBalance(newBalance);
        repository.save(account);
        return new AccountResponse(
                account.getId(),
                account.getAccountNumber(),
                account.getBalance()
        );

    }


    @Transactional
    public AccountResponse deposit(UUID accountId, BigDecimal amount) {

        Optional<Account> accountOptional = repository.findById(accountId);

        if (accountOptional.isEmpty()) {
            throw new IllegalArgumentException("Account does not exist");
        }

        Account account = accountOptional.get();

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Deposit amount must be greater than zero"
            );
        }

        BigDecimal newBalance = account.getBalance().add(amount);
        account.setBalance(newBalance);

        repository.save(account);

        return new AccountResponse(
                account.getId(),
                account.getAccountNumber(),
                account.getBalance()
        );
    }


    public List<AccountResponse> getAllAccounts() {
        return repository.findAll()
                .stream()
                .map(account -> new AccountResponse(
                        account.getId(),
                        account.getAccountNumber(),
                        account.getBalance()
                ))
                .collect(Collectors.toList());
    }


    // validating the balance so , balance will be >=0 , can't be negative.
    private void validateInitialBalance(BigDecimal balance){
        if (balance == null){
            throw new IllegalArgumentException("Intial balance is required");
        }
        if (balance.signum()<0){
            throw new IllegalArgumentException("Initial balance cannot be negative");
        }

    }


    public Account createAccount(String accountNumber, BigDecimal initialBalance, Customer customer){
        validateInitialBalance(initialBalance);
        validateAccountNumber(accountNumber);
        if (customer == null) {
            throw new IllegalArgumentException("Customer is required");
        }
        if (!customerRepository.existsById(customer.getId())) {
            throw new IllegalArgumentException("Customer not found");
        }
        if (repository.existsByAccountNumber(accountNumber)) {
            throw new IllegalArgumentException("Account number already exists");
        }
        Account account = new Account();
        account.setAccountNumber(accountNumber);
        account.setBalance(initialBalance);
        account.setCustomer(customer);
        account.setStatus(AccountStatus.ACTIVE);
        return repository.save(account);

    }
    private void validateAccountNumber(String accountNumber) {
        if (accountNumber == null || accountNumber.isBlank()){
            throw new IllegalArgumentException("Account number is required");
        }
    }

    public Optional<AccountResponse> getAccountResponseById(UUID id) {
        return repository.findById(id)
                .map(account -> new AccountResponse(
                        account.getId(),
                        account.getAccountNumber(),
                        account.getBalance()
                ));
    }
    public Account createAccount(CreateAccountRequest request) {
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        return createAccount(
                request.getAccountNumber(),
                request.getInitialBalance(),
                customer
        );
    }

}