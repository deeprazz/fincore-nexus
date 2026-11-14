package com.fincore.core_banking_services.dashboard;

import com.fincore.core_banking_services.account.AccountRepository;
import com.fincore.core_banking_services.account.AccountStatus;
import com.fincore.core_banking_services.transaction.BankingTransactionRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.distribution.ValueAtPercentile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.management.ManagementFactory;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.concurrent.TimeUnit;

@Service
public class DashboardService {

    private final AccountRepository accountRepository;
    private final BankingTransactionRepository transactionRepository;
    private final MeterRegistry meterRegistry;

    public DashboardService(
            AccountRepository accountRepository,
            BankingTransactionRepository transactionRepository,
            MeterRegistry meterRegistry) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.meterRegistry = meterRegistry;
    }

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary() {
        long activeAccounts = accountRepository.countByStatus(AccountStatus.ACTIVE);
        long totalAccounts = accountRepository.count();

        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        long transactionsToday = transactionRepository.countByCreatedAtGreaterThanEqual(
                today.atStartOfDay().toInstant(ZoneOffset.UTC)
        );

        BigDecimal sumOfBalances = accountRepository.sumBalanceByStatus(AccountStatus.ACTIVE);
        if (sumOfBalances == null) {
            sumOfBalances = BigDecimal.ZERO;
        }

        long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();
        long uptimeSeconds = uptimeMs / 1000;
        String uptimeFormatted = formatUptime(uptimeSeconds);

        double p50 = 0.0;
        double p95 = 0.0;

        if (meterRegistry != null) {
            Timer timer = meterRegistry.find("http.server.requests").timer();
            if (timer != null) {
                var snapshot = timer.takeSnapshot();
                if (snapshot != null) {
                    for (ValueAtPercentile vap : snapshot.percentileValues()) {
                        if (Math.abs(vap.percentile() - 0.5) < 0.05) {
                            p50 = vap.value(TimeUnit.MILLISECONDS);
                        } else if (Math.abs(vap.percentile() - 0.95) < 0.05) {
                            p95 = vap.value(TimeUnit.MILLISECONDS);
                        }
                    }
                }
                if (p50 == 0.0 && timer.count() > 0) {
                    p50 = timer.mean(TimeUnit.MILLISECONDS);
                    p95 = timer.max(TimeUnit.MILLISECONDS);
                }
            }
        }

        // Round to 2 decimal places
        p50 = Math.round(p50 * 100.0) / 100.0;
        p95 = Math.round(p95 * 100.0) / 100.0;

        return new DashboardSummaryResponse(
                activeAccounts,
                totalAccounts,
                transactionsToday,
                sumOfBalances,
                uptimeSeconds,
                uptimeFormatted,
                p50,
                p95
        );
    }

    private String formatUptime(long totalSeconds) {
        long days = totalSeconds / 86400;
        long hours = (totalSeconds % 86400) / 3600;
        long minutes = (totalSeconds % 3600) / 60;
        long seconds = totalSeconds % 60;

        if (days > 0) {
            return String.format("%dd %dh %dm", days, hours, minutes);
        } else if (hours > 0) {
            return String.format("%dh %dm %ds", hours, minutes, seconds);
        } else if (minutes > 0) {
            return String.format("%dm %ds", minutes, seconds);
        } else {
            return String.format("%ds", seconds);
        }
    }
}
