package com.fincore.loan_service.loan;

import java.math.BigDecimal;
import java.util.Map;

public record PortfolioResponse(
        long activeLoans,
        BigDecimal totalDisbursedYTD,
        BigDecimal npaRatio,
        Map<String, Long> byCategory
) {}
