package com.fincore.kyc_service.risk;

import com.fincore.kyc_service.kyc.RiskLevel;

import java.math.BigDecimal;
import java.util.List;

public record RiskAssessmentResult(
        RiskLevel riskLevel,
        BigDecimal riskScore,
        boolean pepMatch,
        boolean sanctionsMatch,
        List<String> reasons
) {}
