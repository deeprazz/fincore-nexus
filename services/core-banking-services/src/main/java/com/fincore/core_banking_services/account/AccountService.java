
package com.fincore.core_banking_services.account;

import com.fincore.core_banking_services.audit.AuditLog;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import com.fincore.core_banking_services.customer.Customer;
import com.fincore.core_banking_services.customer.CustomerRepository;
import com.fincore.core_banking_services.transaction.BankingTransaction;
import com.fincore.core_banking_services.transaction.BankingTransactionRepository;
import com.fincore.core_banking_services.events.TransactionCompletedEvent;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
    private final BankingTransactionRepository transactionRepository;
    private final ApplicationEventPublisher eventPublisher;

    @PersistenceContext
    private EntityManager entityManager;

    public AccountService(
            AccountRepository repository,
            CustomerRepository customerRepository,
            BankingTransactionRepository transactionRepository,
            ApplicationEventPublisher eventPublisher) {
        this.repository = repository;
        this.customerRepository = customerRepository;
        this.transactionRepository = transactionRepository;
        this.eventPublisher = eventPublisher;
    }

    private void audit(String action, String entityType, UUID entityId, String details) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String actor = authentication != null && authentication.isAuthenticated()
                ? authentication.getName() : "SYSTEM";
        entityManager.persist(new AuditLog(action, entityType, entityId, actor, details));
    }

    public Optional<Account> getAccountById(UUID id) {
        return repository.findById(id);
    }

    // Reject transactions on frozen or closed accounts.
    private void requireActiveAccount(Account account) {
        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new IllegalArgumentException(
                    "Account is " + account.getStatus()
                            + ". Only active accounts can perform transactions.");
        }
    }

    @Transactional
    public AccountResponse withdraw(UUID accountId, BigDecimal amount) {
        Account account = repository.findByIdForUpdate(accountId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Account does not exist"));

        requireActiveAccount(account);

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Withdrawal amount must be greater than zero");
        }

        if (account.getBalance().compareTo(amount) < 0) {
            throw new IllegalArgumentException("Insufficient balance");
        }

        BigDecimal newBalance = account.getBalance().subtract(amount);
        account.setBalance(newBalance);
        repository.save(account);

        BankingTransaction transaction = transactionRepository.save(new BankingTransaction(
                account.getId(),
                "WITHDRAWAL",
                amount,
                newBalance,
                null
        ));
        publishTransactionCompleted(transaction);
        audit("WITHDRAWAL_COMPLETED", "ACCOUNT", account.getId(),
                "amount=" + amount + "; balanceAfter=" + newBalance);

        return new AccountResponse(
                account.getId(),
                account.getAccountNumber(),
                account.getBalance()
        );
    }

    @Transactional
    public AccountResponse deposit(UUID accountId, BigDecimal amount) {
        Account account = repository.findByIdForUpdate(accountId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Account does not exist"));

        requireActiveAccount(account);

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Deposit amount must be greater than zero");
        }

        BigDecimal newBalance = account.getBalance().add(amount);
        account.setBalance(newBalance);
        repository.save(account);

        BankingTransaction transaction = transactionRepository.save(new BankingTransaction(
                account.getId(),
                "DEPOSIT",
                amount,
                newBalance,
                null
        ));
        publishTransactionCompleted(transaction);
        audit("DEPOSIT_COMPLETED", "ACCOUNT", account.getId(),
                "amount=" + amount + "; balanceAfter=" + newBalance);

        return new AccountResponse(
                account.getId(),
                account.getAccountNumber(),
                account.getBalance()
        );
    }

    @Transactional
    public void transfer(TransferRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Transfer request is required");
        }

        if (request.getFromAccountId() == null) {
            throw new IllegalArgumentException("Source account ID is required");
        }

        if (request.getToAccountId() == null) {
            throw new IllegalArgumentException("Destination account ID is required");
        }

        BigDecimal amount = request.getAmount();

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "Transfer amount must be greater than zero");
        }

        UUID fromId = request.getFromAccountId();
        UUID toId = request.getToAccountId();

        if (fromId.equals(toId)) {
            throw new IllegalArgumentException(
                    "Cannot transfer to the same account");
        }

        // Lock accounts in a consistent order to reduce deadlocks.
        Account fromAccount;
        Account toAccount;

        if (fromId.compareTo(toId) < 0) {
            fromAccount = repository.findByIdForUpdate(fromId)
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Source account does not exist"));

            toAccount = repository.findByIdForUpdate(toId)
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Destination account does not exist"));
        } else {
            toAccount = repository.findByIdForUpdate(toId)
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Destination account does not exist"));

            fromAccount = repository.findByIdForUpdate(fromId)
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Source account does not exist"));
        }

        // Both accounts must be active.
        requireActiveAccount(fromAccount);
        requireActiveAccount(toAccount);

        if (fromAccount.getBalance().compareTo(amount) < 0) {
            throw new IllegalArgumentException("Insufficient balance");
        }

        BigDecimal fromBalanceAfter =
                fromAccount.getBalance().subtract(amount);

        BigDecimal toBalanceAfter =
                toAccount.getBalance().add(amount);

        fromAccount.setBalance(fromBalanceAfter);
        toAccount.setBalance(toBalanceAfter);

        repository.save(fromAccount);
        repository.save(toAccount);

        UUID referenceId = UUID.randomUUID();

        // Both transaction records are saved within the same transaction.
        BankingTransaction outgoingTransaction = transactionRepository.save(
                new BankingTransaction(
                        fromAccount.getId(),
                        "TRANSFER_OUT",
                        amount,
                        fromBalanceAfter,
                        referenceId
                ));

        BankingTransaction incomingTransaction = transactionRepository.save(
                new BankingTransaction(
                        toAccount.getId(),
                        "TRANSFER_IN",
                        amount,
                        toBalanceAfter,
                        referenceId
                ));
        publishTransactionCompleted(outgoingTransaction);
        publishTransactionCompleted(incomingTransaction);
        audit("TRANSFER_COMPLETED", "TRANSFER", referenceId,
                "fromAccountId=" + fromId + "; toAccountId=" + toId
                        + "; amount=" + amount);
    }

    private void publishTransactionCompleted(BankingTransaction transaction) {
        eventPublisher.publishEvent(new TransactionCompletedEvent(
                transaction.getId(),
                transaction.getAccountId(),
                transaction.getTransactionType(),
                transaction.getAmount(),
                transaction.getBalanceAfter(),
                transaction.getReferenceId(),
                transaction.getCreatedAt()
        ));
    }

    private void validateInitialBalance(BigDecimal balance) {
        if (balance == null) {
            throw new IllegalArgumentException("Initial balance is required");
        }

        if (balance.signum() < 0) {
            throw new IllegalArgumentException(
                    "Initial balance cannot be negative");
        }
    }

    private void validateAccountNumber(String accountNumber) {
        if (accountNumber == null || accountNumber.isBlank()) {
            throw new IllegalArgumentException("Account number is required");
        }
    }

    /**
     * Permanently claims a customer's one-time account creation entitlement.
     * The database primary key prevents concurrent duplicate claims.
     */
    private void claimAccountEntitlement(UUID customerId) {
        int inserted = entityManager.createNativeQuery("""
                INSERT INTO customer_account_entitlement (customer_id)
                VALUES (:customerId)
                ON CONFLICT (customer_id) DO NOTHING
                """)
                .setParameter("customerId", customerId)
                .executeUpdate();

        if (inserted == 0) {
            throw new IllegalArgumentException(
                    "This customer has already used their one-time account "
                            + "creation entitlement. Closed accounts cannot "
                            + "be replaced with new accounts.");
        }
    }

    private Account saveNewAccount(
            String accountNumber,
            BigDecimal initialBalance,
            Customer customer) {

        validateInitialBalance(initialBalance);
        validateAccountNumber(accountNumber);

        if (customer == null) {
            throw new IllegalArgumentException("Customer is required");
        }
        if (customer.getKycStatus() != com.fincore.core_banking_services.customer.KycStatus.VERIFIED) {
            throw new IllegalArgumentException("Customer KYC must be VERIFIED before an account can be opened");
        }

        if (repository.existsByAccountNumber(accountNumber)) {
            throw new IllegalArgumentException("Account number already exists");
        }

        Account account = new Account();
        account.setAccountNumber(accountNumber);
        account.setBalance(initialBalance);
        account.setCustomer(customer);
        account.setStatus(AccountStatus.ACTIVE);

        Account saved = repository.save(account);
        audit("ACCOUNT_CREATED", "ACCOUNT", saved.getId(),
                "accountNumber=" + saved.getAccountNumber()
                        + "; initialBalance=" + saved.getBalance()
                        + "; customerId=" + customer.getId());
        return saved;
    }

    @Transactional
    public Account createAccount(
            String accountNumber,
            BigDecimal initialBalance,
            Customer customer) {

        validateInitialBalance(initialBalance);
        validateAccountNumber(accountNumber);

        if (customer == null || customer.getId() == null) {
            throw new IllegalArgumentException("Customer is required");
        }

        Customer persistedCustomer =
                customerRepository.findById(customer.getId())
                        .orElseThrow(() ->
                                new IllegalArgumentException("Customer not found"));

        claimAccountEntitlement(persistedCustomer.getId());

        return saveNewAccount(
                accountNumber,
                initialBalance,
                persistedCustomer
        );
    }

    public Optional<AccountResponse> getAccountResponseById(UUID id) {
        return repository.findById(id)
                .map(account -> new AccountResponse(
                        account.getId(),
                        account.getAccountNumber(),
                        account.getBalance()
                ));
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

    @Transactional
    public Account createAccount(CreateAccountRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Account request is required");
        }

        if (request.getCustomerId() == null) {
            throw new IllegalArgumentException("Customer ID is required");
        }

        Customer customer =
                customerRepository.findById(request.getCustomerId())
                        .orElseThrow(() ->
                                new IllegalArgumentException("Customer not found"));

        if (customer.getKycStatus() != com.fincore.core_banking_services.customer.KycStatus.VERIFIED) {
            throw new IllegalArgumentException("Customer KYC must be VERIFIED before opening an account");
        }

        validateInitialBalance(request.getInitialBalance());

        // Claim before generating the account number.
        claimAccountEntitlement(customer.getId());

        String accountNumber = String.format(
                "%012d",
                repository.getNextAccountNumber()
        );

        return saveNewAccount(
                accountNumber,
                request.getInitialBalance(),
                customer
        );
    }


    @Transactional
    public AccountResponse freezeAccount(UUID accountId) {
        Account account = repository.findByIdForUpdate(accountId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Account does not exist"));

        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new IllegalArgumentException(
                    "Only active accounts can be frozen");
        }

        account.setStatus(AccountStatus.FROZEN);
        repository.save(account);
        audit("ACCOUNT_FROZEN", "ACCOUNT", account.getId(),
                "accountNumber=" + account.getAccountNumber());

        return new AccountResponse(
                account.getId(),
                account.getAccountNumber(),
                account.getBalance());
    }

    @Transactional
    public AccountResponse unfreezeAccount(UUID accountId) {
        Account account = repository.findByIdForUpdate(accountId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Account does not exist"));

        if (account.getStatus() != AccountStatus.FROZEN) {
            throw new IllegalArgumentException(
                    "Only frozen accounts can be unfrozen");
        }

        account.setStatus(AccountStatus.ACTIVE);
        repository.save(account);
        audit("ACCOUNT_UNFROZEN", "ACCOUNT", account.getId(),
                "accountNumber=" + account.getAccountNumber());

        return new AccountResponse(
                account.getId(),
                account.getAccountNumber(),
                account.getBalance());
    }

    @Transactional
    public AccountResponse closeAccount(UUID accountId) {
        Account account = repository.findByIdForUpdate(accountId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Account does not exist"));

        if (account.getStatus() == AccountStatus.CLOSED) {
            throw new IllegalArgumentException("Account is already closed");
        }

        if (account.getBalance().compareTo(BigDecimal.ZERO) != 0) {
            throw new IllegalArgumentException(
                    "Account balance must be zero before closing. "
                            + "Current balance: " + account.getBalance());
        }

        account.setStatus(AccountStatus.CLOSED);
        repository.save(account);
        audit("ACCOUNT_CLOSED", "ACCOUNT", account.getId(),
                "accountNumber=" + account.getAccountNumber());

        return new AccountResponse(
                account.getId(),
                account.getAccountNumber(),
                account.getBalance());
    }


    @Transactional(readOnly = true)
    public AccountStatementResponse getStatement(
            UUID accountId,
            LocalDate from,
            LocalDate to) {

        if (from == null || to == null) {
            throw new IllegalArgumentException(
                    "Statement start and end dates are required");
        }

        if (from.isAfter(to)) {
            throw new IllegalArgumentException(
                    "Start date must be on or before end date");
        }

        Account account = repository.findById(accountId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Account does not exist"));

        Instant fromInstant = from.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant toExclusive = to.plusDays(1)
                .atStartOfDay(ZoneOffset.UTC)
                .toInstant();

        List<BankingTransaction> transactions =
                transactionRepository
                        .findByAccountIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(
                                accountId,
                                fromInstant,
                                toExclusive
                        );

        return new AccountStatementResponse(
                account.getId(),
                account.getAccountNumber(),
                from,
                to,
                account.getBalance(),
                transactions
        );
    }

}
