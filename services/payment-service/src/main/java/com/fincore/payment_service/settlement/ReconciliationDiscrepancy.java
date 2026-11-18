package com.fincore.payment_service.settlement;

import java.math.BigDecimal;
import java.util.UUID;

public record ReconciliationDiscrepancy(
        UUID paymentId,
        String utr,
        String discrepancyType,
        BigDecimal paymentAmount,
        BigDecimal coreAmount,
        String description
) {}
