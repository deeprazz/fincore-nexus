package com.fincore.kyc_service.face;

import java.math.BigDecimal;

public record FaceMatchResult(
        boolean matched,
        BigDecimal confidenceScore,
        String provider,
        String details
) {}
