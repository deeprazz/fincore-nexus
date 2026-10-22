package com.fincore.core_banking_services;
import com.fincore.core_banking_services.transaction.BankingTransactionRepository;
import com.fincore.core_banking_services.customer.CustomerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import com.fincore.core_banking_services.transaction.BankingTransaction;
import org.mockito.ArgumentCaptor;
import java.util.List;
import org.mockito.junit.jupiter.MockitoExtension;
import com.fincore.core_banking_services.account.Account;
import com.fincore.core_banking_services.account.AccountRepository;
import com.fincore.core_banking_services.account.AccountResponse;
import com.fincore.core_banking_services.account.AccountService;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import com.fincore.core_banking_services.account.TransferRequest;

import static org.mockito.Mockito.times;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private BankingTransactionRepository transactionRepository;

    @InjectMocks
    private AccountService accountService;

    private Account account;
    private UUID accountId;

    @BeforeEach
    void setUp() {
        accountId = UUID.randomUUID();

        account = new Account();
        account.setBalance(new BigDecimal("1000.00"));
        account.setAccountNumber("FC1000001");
    }

    @Test
    void depositShouldIncreaseBalance() {
        // Arrange: simulate an existing account
        when(accountRepository.findByIdForUpdate(accountId))
                .thenReturn(Optional.of(account));

        when(accountRepository.save(any(Account.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Act: deposit ₹500
        AccountResponse response = accountService.deposit(
                accountId,
                new BigDecimal("500.00")
        );

        // Assert: balance should become ₹1500
        assertEquals(
                0,
                new BigDecimal("1500.00")
                        .compareTo(response.getBalance())
        );

        verify(accountRepository).save(account);
    }


    @Test
    void depositShouldRejectZeroAmount() {
        when(accountRepository.findByIdForUpdate(accountId))
                .thenReturn(Optional.of(account));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> accountService.deposit(accountId, BigDecimal.ZERO)
        );

        assertEquals(
                "Deposit amount must be greater than zero",
                exception.getMessage()
        );

        verify(accountRepository, never()).save(any(Account.class));
    }

    @Test
    void depositShouldRejectNegativeAmount() {
        when(accountRepository.findByIdForUpdate(accountId))
                .thenReturn(Optional.of(account));

        assertThrows(
                IllegalArgumentException.class,
                () -> accountService.deposit(accountId, new BigDecimal("-100"))
        );

        verify(accountRepository, never()).save(any(Account.class));
    }

    @Test
    void depositShouldRejectNullAmount() {
        when(accountRepository.findByIdForUpdate(accountId))
                .thenReturn(Optional.of(account));

        assertThrows(
                IllegalArgumentException.class,
                () -> accountService.deposit(accountId, null)
        );

        verify(accountRepository, never()).save(any(Account.class));
    }

    @Test
    void depositShouldRejectMissingAccount() {
        when(accountRepository.findByIdForUpdate(accountId))
                .thenReturn(Optional.empty());

        assertThrows(
                IllegalArgumentException.class,
                () -> accountService.deposit(accountId, new BigDecimal("500"))
        );

        verify(accountRepository, never()).save(any(Account.class));
    }



    @Test
    void withdrawShouldDecreaseBalance() {
        // Arrange: account starts with ₹1000
        when(accountRepository.findByIdForUpdate(accountId))
                .thenReturn(Optional.of(account));

        when(accountRepository.save(any(Account.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Act: withdraw ₹300
        AccountResponse response = accountService.withdraw(
                accountId,
                new BigDecimal("300.00")
        );

        // Assert: balance should become ₹700
        assertEquals(
                0,
                new BigDecimal("700.00")
                        .compareTo(response.getBalance())
        );

        verify(accountRepository).save(account);
    }



    @Test
    void withdrawShouldRejectInsufficientBalance() {
        // Arrange: account has only ₹1000
        when(accountRepository.findByIdForUpdate(accountId))
                .thenReturn(Optional.of(account));

        // Act + Assert: withdrawing ₹1500 must fail
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> accountService.withdraw(
                        accountId,
                        new BigDecimal("1500.00")
                )
        );

        assertEquals("Insufficient balance", exception.getMessage());

        // The repository must not save the account
        verify(accountRepository, never()).save(any(Account.class));

        // Balance must remain unchanged
        assertEquals(
                0,
                new BigDecimal("1000.00").compareTo(account.getBalance())
        );
    }


    @Test
    void withdrawShouldRejectZeroAmount() {
        when(accountRepository.findByIdForUpdate(accountId))
                .thenReturn(Optional.of(account));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> accountService.withdraw(accountId, BigDecimal.ZERO)
        );

        assertEquals(
                "Withdrawal amount must be greater than zero",
                exception.getMessage()
        );

        verify(accountRepository, never()).save(any(Account.class));
    }



    @Test
    void withdrawShouldRejectNegativeAmount() {
        when(accountRepository.findByIdForUpdate(accountId))
                .thenReturn(Optional.of(account));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> accountService.withdraw(
                        accountId,
                        new BigDecimal("-100.00")
                )
        );

        assertEquals(
                "Withdrawal amount must be greater than zero",
                exception.getMessage()
        );

        verify(accountRepository, never()).save(any(Account.class));

        assertEquals(
                0,
                new BigDecimal("1000.00").compareTo(account.getBalance())
        );
    }



    @Test
    void withdrawShouldRejectNullAmount() {
        when(accountRepository.findByIdForUpdate(accountId))
                .thenReturn(Optional.of(account));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> accountService.withdraw(accountId, null)
        );

        assertEquals(
                "Withdrawal amount must be greater than zero",
                exception.getMessage()
        );

        verify(accountRepository, never()).save(any(Account.class));

        assertEquals(
                0,
                new BigDecimal("1000.00").compareTo(account.getBalance())
        );
    }

    @Test
    void withdrawShouldRejectMissingAccount() {
        // Arrange: account does not exist
        when(accountRepository.findByIdForUpdate(accountId))
                .thenReturn(Optional.empty());

        // Act + Assert: withdrawal must be rejected
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> accountService.withdraw(
                        accountId,
                        new BigDecimal("100.00")
                )
        );

        assertEquals(
                "account does not exist",
                exception.getMessage()
        );

        // No account should be saved
        verify(accountRepository, never()).save(any(Account.class));
    }



    @Test
    void transferShouldMoveMoneyBetweenAccounts() {
        // Arrange: create two accounts
        UUID senderId = UUID.randomUUID();
        UUID receiverId = UUID.randomUUID();

        Account sender = new Account();
        sender.setBalance(new BigDecimal("1000.00"));
        sender.setAccountNumber("FC1000001");

        Account receiver = new Account();
        receiver.setBalance(new BigDecimal("500.00"));
        receiver.setAccountNumber("FC1000002");

        TransferRequest request = new TransferRequest();
        request.setFromAccountId(senderId);
        request.setToAccountId(receiverId);
        request.setAmount(new BigDecimal("200.00"));

        // Mock repository lookups in UUID lock order
        if (senderId.compareTo(receiverId) < 0) {
            when(accountRepository.findByIdForUpdate(senderId))
                    .thenReturn(Optional.of(sender));
            when(accountRepository.findByIdForUpdate(receiverId))
                    .thenReturn(Optional.of(receiver));
        } else {
            when(accountRepository.findByIdForUpdate(receiverId))
                    .thenReturn(Optional.of(receiver));
            when(accountRepository.findByIdForUpdate(senderId))
                    .thenReturn(Optional.of(sender));
        }

        // Act: transfer ₹200
        accountService.transfer(request);

        // Assert: sender has ₹800, receiver has ₹700
        assertEquals(
                0,
                new BigDecimal("800.00").compareTo(sender.getBalance())
        );

        assertEquals(
                0,
                new BigDecimal("700.00").compareTo(receiver.getBalance())
        );

        // Both accounts must be saved
        verify(accountRepository, times(1)).save(sender);
        verify(accountRepository, times(1)).save(receiver);

        // Verify both transfer transaction records were saved
        ArgumentCaptor<BankingTransaction> captor =
                ArgumentCaptor.forClass(BankingTransaction.class);

        verify(transactionRepository, times(2)).save(captor.capture());

        List<BankingTransaction> transactions = captor.getAllValues();

        assertEquals(2, transactions.size());

        assertEquals("TRANSFER_OUT", transactions.get(0).getTransactionType());
        assertEquals("TRANSFER_IN", transactions.get(1).getTransactionType());

        assertNotNull(transactions.get(0).getReferenceId());
        assertEquals(
                transactions.get(0).getReferenceId(),
                transactions.get(1).getReferenceId()
        );
    }


    @Test
    void transferShouldRejectInsufficientBalance() {
        UUID senderId = UUID.randomUUID();
        UUID receiverId = UUID.randomUUID();

        Account sender = new Account();
        sender.setBalance(new BigDecimal("1000.00"));
        sender.setAccountNumber("FC1000001");

        Account receiver = new Account();
        receiver.setBalance(new BigDecimal("500.00"));
        receiver.setAccountNumber("FC1000002");

        TransferRequest request = new TransferRequest();
        request.setFromAccountId(senderId);
        request.setToAccountId(receiverId);
        request.setAmount(new BigDecimal("1500.00"));

        // Mock both accounts in the order used by the service
        if (senderId.compareTo(receiverId) < 0) {
            when(accountRepository.findByIdForUpdate(senderId))
                    .thenReturn(Optional.of(sender));
            when(accountRepository.findByIdForUpdate(receiverId))
                    .thenReturn(Optional.of(receiver));
        } else {
            when(accountRepository.findByIdForUpdate(receiverId))
                    .thenReturn(Optional.of(receiver));
            when(accountRepository.findByIdForUpdate(senderId))
                    .thenReturn(Optional.of(sender));
        }

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> accountService.transfer(request)
        );

        assertEquals("Insufficient balance", exception.getMessage());

        // Neither account should be saved
        verify(accountRepository, never()).save(any(Account.class));

        // Both balances must remain unchanged
        assertEquals(
                0,
                new BigDecimal("1000.00").compareTo(sender.getBalance())
        );
        assertEquals(
                0,
                new BigDecimal("500.00").compareTo(receiver.getBalance())
        );
    }


    @Test
    void transferShouldRejectZeroAmount() {
        TransferRequest request = new TransferRequest();
        request.setFromAccountId(UUID.randomUUID());
        request.setToAccountId(UUID.randomUUID());
        request.setAmount(BigDecimal.ZERO);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> accountService.transfer(request)
        );

        assertEquals(
                "Transfer amount must be greater than zero",
                exception.getMessage()
        );

        verify(accountRepository, never())
                .findByIdForUpdate(any(UUID.class));
        verify(accountRepository, never()).save(any(Account.class));
    }


    @Test
    void transferShouldRejectSameAccount() {
        UUID sameAccountId = UUID.randomUUID();

        TransferRequest request = new TransferRequest();
        request.setFromAccountId(sameAccountId);
        request.setToAccountId(sameAccountId);
        request.setAmount(new BigDecimal("100.00"));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> accountService.transfer(request)
        );

        assertEquals(
                "Cannot transfer to the same account",
                exception.getMessage()
        );

        verify(accountRepository, never())
                .findByIdForUpdate(any(UUID.class));
        verify(accountRepository, never()).save(any(Account.class));
    }

    @Test
    void transferShouldRejectMissingSourceAccount() {
        UUID sourceId = UUID.fromString(
                "00000000-0000-0000-0000-000000000001"
        );
        UUID destinationId = UUID.fromString(
                "00000000-0000-0000-0000-000000000002"
        );

        TransferRequest request = new TransferRequest();
        request.setFromAccountId(sourceId);
        request.setToAccountId(destinationId);
        request.setAmount(new BigDecimal("100.00"));

        when(accountRepository.findByIdForUpdate(sourceId))
                .thenReturn(Optional.empty());

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> accountService.transfer(request)
        );

        assertEquals("Source account does not exist", exception.getMessage());

        verify(accountRepository, never()).save(any(Account.class));
    }

    @Test
    void transferShouldRejectMissingDestinationAccount() {
        // Arrange: source ID is smaller, so it gets locked first
        UUID sourceId = UUID.fromString(
                "00000000-0000-0000-0000-000000000001"
        );
        UUID destinationId = UUID.fromString(
                "00000000-0000-0000-0000-000000000002"
        );

        TransferRequest request = new TransferRequest();
        request.setFromAccountId(sourceId);
        request.setToAccountId(destinationId);
        request.setAmount(new BigDecimal("100.00"));

        // Source account exists
        when(accountRepository.findByIdForUpdate(sourceId))
                .thenReturn(Optional.of(account));

        // Destination account does not exist
        when(accountRepository.findByIdForUpdate(destinationId))
                .thenReturn(Optional.empty());

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> accountService.transfer(request)
        );

        assertEquals(
                "Destination account does not exist",
                exception.getMessage()
        );

        // No money should be saved
        verify(accountRepository, never()).save(any(Account.class));
    }


    @Test
    void transferShouldRejectNegativeAmount() {
        TransferRequest request = new TransferRequest();
        request.setFromAccountId(UUID.randomUUID());
        request.setToAccountId(UUID.randomUUID());
        request.setAmount(new BigDecimal("-100.00"));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> accountService.transfer(request)
        );

        assertEquals(
                "Transfer amount must be greater than zero",
                exception.getMessage()
        );

        verify(accountRepository, never())
                .findByIdForUpdate(any(UUID.class));

        verify(accountRepository, never())
                .save(any(Account.class));
    }

    @Test
    void transferShouldRejectNullRequest() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> accountService.transfer(null)
        );

        assertEquals(
                "Transfer request is required",
                exception.getMessage()
        );

        verify(accountRepository, never())
                .findByIdForUpdate(any(UUID.class));

        verify(accountRepository, never())
                .save(any(Account.class));
    }


    @Test
    void transferShouldRejectNullSourceAccountId() {
        TransferRequest request = new TransferRequest();
        request.setFromAccountId(null);
        request.setToAccountId(UUID.randomUUID());
        request.setAmount(new BigDecimal("100.00"));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> accountService.transfer(request)
        );

        assertEquals(
                "Source account ID is required",
                exception.getMessage()
        );

        verify(accountRepository, never())
                .findByIdForUpdate(any(UUID.class));

        verify(accountRepository, never())
                .save(any(Account.class));
    }


    @Test
    void transferShouldRejectNullDestinationAccountId() {
        TransferRequest request = new TransferRequest();
        request.setFromAccountId(UUID.randomUUID());
        request.setToAccountId(null);
        request.setAmount(new BigDecimal("100.00"));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> accountService.transfer(request)
        );

        assertEquals(
                "Destination account ID is required",
                exception.getMessage()
        );

        verify(accountRepository, never())
                .findByIdForUpdate(any(UUID.class));

        verify(accountRepository, never())
                .save(any(Account.class));
    }





}
