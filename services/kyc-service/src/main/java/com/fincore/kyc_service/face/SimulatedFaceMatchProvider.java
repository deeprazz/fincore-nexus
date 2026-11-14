package com.fincore.kyc_service.face;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Biometric facial comparison engine (SIMULATED).
 * Computes facial geometry landmark similarity vector between ID photo and applicant live selfie.
 */
@Component
public class SimulatedFaceMatchProvider implements FaceMatchProvider {

    private static final Logger log = LoggerFactory.getLogger(SimulatedFaceMatchProvider.class);

    @Override
    public FaceMatchResult compareFaces(byte[] idPhoto, byte[] selfiePhoto) {
        log.info("[SIMULATED] Comparing applicant ID photo (size: {} bytes) with live selfie (size: {} bytes)",
                idPhoto != null ? idPhoto.length : 0,
                selfiePhoto != null ? selfiePhoto.length : 0);

        // Realistic deterministic simulation: high similarity for valid photos
        BigDecimal score = BigDecimal.valueOf(94.80).setScale(2, RoundingMode.HALF_UP);
        boolean matched = score.compareTo(BigDecimal.valueOf(80.00)) >= 0;

        return new FaceMatchResult(
                matched,
                score,
                "FinCore Biometric Engine (Simulated)",
                "Facial landmark match score: 94.80% (Threshold: 80.00%)"
        );
    }
}
