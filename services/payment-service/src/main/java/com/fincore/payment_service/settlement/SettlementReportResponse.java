package com.fincore.payment_service.settlement;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

public record SettlementReportResponse(
        LocalDate reportDate,
        long totalPayments,
        BigDecimal totalVolume,
        long settledCount,
        BigDecimal settledVolume,
        long pendingSettlementCount,
        long failedCount,
        long reversedCount,
        int batchesGenerated,
        Map<String, Long> paymentsByRail,
        String reconciliationStatus
) {}
