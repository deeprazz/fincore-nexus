package com.fincore.core_banking_services.account;

import com.fincore.core_banking_services.customer.Customer;
import com.fincore.core_banking_services.customer.CustomerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
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
        Optional<Account> accountOptional =
                repository.findByIdForUpdate(accountId);
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

        Optional<Account> accountOptional =
                repository.findByIdForUpdate(accountId);

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

    @Transactional
    public void transfer(TransferRequest request) {

        if (request == null) {
            throw new IllegalArgumentException(
                    "Transfer request is required"
            );
        }

        if (request.getFromAccountId() == null) {
            throw new IllegalArgumentException(
                    "Source account ID is required"
            );
        }

        if (request.getToAccountId() == null) {
            throw new IllegalArgumentException(
                    "Destination account ID is required"
            );
        }

        BigDecimal amount = request.getAmount();


        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Transfer amount must be greater than zero"
            );
        }

        //  this will Prevent transferring to the same account
        if (request.getFromAccountId().equals(request.getToAccountId())) {
            throw new IllegalArgumentException(
                    "Cannot transfer to the same account"
            );
        }

        UUID fromId = request.getFromAccountId();
        UUID toId = request.getToAccountId();

        Account fromAccount;
        Account toAccount;

        if (fromId.compareTo(toId) < 0) {
            fromAccount = repository.findByIdForUpdate(fromId)
                    .orElseThrow(() ->
                            new IllegalArgumentException("Source account does not exist"));

            toAccount = repository.findByIdForUpdate(toId)
                    .orElseThrow(() ->
                            new IllegalArgumentException("Destination account does not exist"));
        } else {
            toAccount = repository.findByIdForUpdate(toId)
                    .orElseThrow(() ->
                            new IllegalArgumentException("Destination account does not exist"));

            fromAccount = repository.findByIdForUpdate(fromId)
                    .orElseThrow(() ->
                            new IllegalArgumentException("Source account does not exist"));
        }
        // sufficient balance will be checked here
        if (fromAccount.getBalance().compareTo(amount) < 0) {
            throw new IllegalArgumentException("Insufficient balance");
        }

        // new balance calculation
        fromAccount.setBalance(fromAccount.getBalance().subtract(amount));
        toAccount.setBalance(toAccount.getBalance().add(amount));

        // saving both accounts
        repository.save(fromAccount);
        repository.save(toAccount);
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
    @Transactional
    public Account createAccount(CreateAccountRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Account request is required");
        }

        if (request.getCustomerId() == null) {
            throw new IllegalArgumentException("Customer ID is required");
        }

        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Customer not found"));

        validateInitialBalance(request.getInitialBalance());

        String accountNumber = String.format(
                "%012d",
                repository.getNextAccountNumber()
        );

        return createAccount(
                accountNumber,
                request.getInitialBalance(),
                customer
        );
    }

}