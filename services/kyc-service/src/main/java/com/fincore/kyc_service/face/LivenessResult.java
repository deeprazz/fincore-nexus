package com.fincore.kyc_service.face;

public record LivenessResult(
        boolean verified,
        String challengeCompleted,
        String provider,
        String details
) {}
