package com.fincore.payment_service.settlement;

import java.time.Instant;
import java.util.List;

public record ReconciliationReportResponse(
        Instant reconciledAt,
        long totalSettledPayments,
        long totalCoreTransactions,
        long matched,
        long missingInCore,
        long amountMismatch,
        long orphanInCore,
        String status,
        List<ReconciliationDiscrepancy> discrepancies
) {}
