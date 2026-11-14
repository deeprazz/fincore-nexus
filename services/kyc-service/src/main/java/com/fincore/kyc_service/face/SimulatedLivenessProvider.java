package com.fincore.kyc_service.face;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Passive/Active liveness detection provider (SIMULATED).
 * Validates optical micro-movements, eye blink, and head rotation challenges.
 */
@Component
public class SimulatedLivenessProvider implements LivenessProvider {

    private static final Logger log = LoggerFactory.getLogger(SimulatedLivenessProvider.class);

    @Override
    public LivenessResult verifyLiveness(byte[] selfieBytes, String challengeType) {
        log.info("[SIMULATED] Verifying applicant liveness for challenge '{}', payload size: {} bytes",
                challengeType, selfieBytes != null ? selfieBytes.length : 0);

        String challenge = (challengeType != null && !challengeType.isBlank()) ? challengeType : "EYE_BLINK";

        return new LivenessResult(
                true,
                challenge,
                "FinCore Liveness Engine (Simulated)",
                "Liveness confirmed. Challenge '" + challenge + "' passed optical anti-spoof checks."
        );
    }
}
