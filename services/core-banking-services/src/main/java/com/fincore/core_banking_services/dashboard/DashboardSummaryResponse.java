package com.fincore.core_banking_services.dashboard;

import java.math.BigDecimal;

public record DashboardSummaryResponse(
        long activeAccounts,
        long totalAccounts,
        long transactionsToday,
        BigDecimal sumOfBalances,
        long uptimeSeconds,
        String uptimeFormatted,
        double latencyP50Ms,
        double latencyP95Ms
) {}
