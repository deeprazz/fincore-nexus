package com.fincore.core_banking_services;

import com.fincore.core_banking_services.account.AccountRepository;
import com.fincore.core_banking_services.account.AccountStatus;
import com.fincore.core_banking_services.dashboard.DashboardService;
import com.fincore.core_banking_services.dashboard.DashboardSummaryResponse;
import com.fincore.core_banking_services.transaction.BankingTransactionRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private BankingTransactionRepository transactionRepository;

    private MeterRegistry meterRegistry;
    private DashboardService dashboardService;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        dashboardService = new DashboardService(accountRepository, transactionRepository, meterRegistry);
    }

    @Test
    void shouldReturnComputedDashboardSummary() {
        when(accountRepository.countByStatus(AccountStatus.ACTIVE)).thenReturn(42L);
        when(accountRepository.count()).thenReturn(50L);
        when(transactionRepository.countByCreatedAtGreaterThanEqual(any(Instant.class))).thenReturn(15L);
        when(accountRepository.sumBalanceByStatus(AccountStatus.ACTIVE)).thenReturn(new BigDecimal("123456.78"));

        DashboardSummaryResponse summary = dashboardService.getSummary();

        assertNotNull(summary);
        assertEquals(42L, summary.activeAccounts());
        assertEquals(50L, summary.totalAccounts());
        assertEquals(15L, summary.transactionsToday());
        assertEquals(new BigDecimal("123456.78"), summary.sumOfBalances());
        assertTrue(summary.uptimeSeconds() >= 0);
        assertNotNull(summary.uptimeFormatted());
        assertEquals(0.0, summary.latencyP50Ms());
        assertEquals(0.0, summary.latencyP95Ms());
    }
}
