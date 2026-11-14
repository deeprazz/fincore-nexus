package com.fincore.core_banking_services;

import com.fincore.core_banking_services.account.Account;
import com.fincore.core_banking_services.account.AccountRepository;
import com.fincore.core_banking_services.account.AccountService;
import com.fincore.core_banking_services.customer.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerPortalControllerTest {

    @Mock
    private CustomerRepository customers;

    @Mock
    private AccountRepository accounts;

    @Mock
    private AccountService accountService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private CustomerPortalController portalController;

    private Customer customer;
    private final String customerEmail = "customer@example.com";

    @BeforeEach
    void setUp() {
        customer = new Customer("Test Customer", customerEmail, "hashedPass");
        customer.updateKycStatus(KycStatus.VERIFIED);
        customer.setTransactionPinHash("hashedPin");
    }

    @Test
    void transferShouldRejectNullRequest() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> portalController.transfer(null, authentication));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("Transfer request is required", ex.getReason());
    }

    @Test
    void transferShouldLockAfterFiveFailedPinAttempts() {
        when(authentication.getName()).thenReturn(customerEmail);
        when(customers.findByEmailIgnoreCase(customerEmail)).thenReturn(Optional.of(customer));
        when(passwordEncoder.matches("9999", "hashedPin")).thenReturn(false);

        CustomerPortalController.CustomerTransferRequest request =
                new CustomerPortalController.CustomerTransferRequest(
                        UUID.randomUUID(), "FC1000001", new BigDecimal("100.00"), "9999");

        // First 4 attempts: UNAUTHORIZED
        for (int i = 1; i <= 4; i++) {
            ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                    () -> portalController.transfer(request, authentication));
            assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
            assertEquals(i, customer.getFailedPinAttempts());
            assertFalse(customer.isPinLocked());
        }

        // 5th attempt: LOCKED
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> portalController.transfer(request, authentication));
        assertEquals(HttpStatus.LOCKED, ex.getStatusCode());
        assertEquals(5, customer.getFailedPinAttempts());
        assertTrue(customer.isPinLocked());
        assertNotNull(customer.getPinLockedUntil());
    }

    @Test
    void transferShouldRejectWhenPinAlreadyLocked() {
        when(authentication.getName()).thenReturn(customerEmail);
        when(customers.findByEmailIgnoreCase(customerEmail)).thenReturn(Optional.of(customer));
        customer.setFailedPinAttempts(5);
        customer.setPinLockedUntil(Instant.now().plusSeconds(900));

        CustomerPortalController.CustomerTransferRequest request =
                new CustomerPortalController.CustomerTransferRequest(
                        UUID.randomUUID(), "FC1000001", new BigDecimal("100.00"), "1234");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> portalController.transfer(request, authentication));
        assertEquals(HttpStatus.LOCKED, ex.getStatusCode());
    }

    @Test
    void transferShouldResetFailedAttemptsOnSuccess() {
        when(authentication.getName()).thenReturn(customerEmail);
        when(customers.findByEmailIgnoreCase(customerEmail)).thenReturn(Optional.of(customer));
        when(passwordEncoder.matches("1234", "hashedPin")).thenReturn(true);

        UUID sourceId = UUID.randomUUID();
        Account source = new Account();
        source.setId(sourceId);
        source.setCustomer(customer);
        source.setAccountNumber("SRC123");
        source.setStatus(com.fincore.core_banking_services.account.AccountStatus.ACTIVE);

        Account dest = new Account();
        dest.setId(UUID.randomUUID());
        dest.setAccountNumber("DEST123");
        dest.setStatus(com.fincore.core_banking_services.account.AccountStatus.ACTIVE);

        when(accounts.findById(sourceId)).thenReturn(Optional.of(source));
        when(accounts.findByAccountNumber("DEST123")).thenReturn(Optional.of(dest));

        customer.setFailedPinAttempts(3);

        CustomerPortalController.CustomerTransferRequest request =
                new CustomerPortalController.CustomerTransferRequest(
                        sourceId, "DEST123", new BigDecimal("50.00"), "1234");

        CustomerPortalController.TransferResponse response = portalController.transfer(request, authentication);
        assertNotNull(response);
        assertEquals(0, customer.getFailedPinAttempts());
        assertNull(customer.getPinLockedUntil());
        verify(accountService).transfer(any());
    }
}
