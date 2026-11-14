package com.fincore.payment_service.fraud;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalTime;
import static org.junit.jupiter.api.Assertions.*;

class FraudDetectionEngineTest {

    private final FraudDetectionEngine engine = new FraudDetectionEngine();

    @Test
    void lowRiskPayment_shouldAllow() {
        FraudAssessmentResult result = engine.evaluate(
                new BigDecimal("5000.00"),
                new BigDecimal("6000.00"), // normal amount
                0, // 0 txns in 5 mins
                false, // not new beneficiary
                false, // verified beneficiary
                LocalTime.of(14, 30), // afternoon
                0 // 0 failures
        );
        assertEquals(FraudDecision.ALLOW, result.getDecision());
        assertTrue(result.getScore().compareTo(new BigDecimal("0.5000")) < 0);
        assertTrue(result.getTriggeredRules().isEmpty());
    }

    @Test
    void highRiskMultipleRules_shouldBlock() {
        FraudAssessmentResult result = engine.evaluate(
                new BigDecimal("200000.00"),
                new BigDecimal("10000.00"), // 20x average (+0.35)
                4, // high velocity (+0.30)
                true, // new beneficiary (+0.25)
                false,
                LocalTime.of(2, 15), // odd hour (+0.20)
                3 // repeated failures (+0.30)
        );
        assertEquals(FraudDecision.BLOCK, result.getDecision());
        assertTrue(result.getScore().compareTo(new BigDecimal("0.8000")) >= 0);
        assertFalse(result.getTriggeredRules().isEmpty());
    }

    @Test
    void moderateRisk_shouldReview() {
        // High amount (+0.35) + new beneficiary (+0.25) = 0.60 -> REVIEW
        FraudAssessmentResult result = engine.evaluate(
                new BigDecimal("50000.00"),
                new BigDecimal("10000.00"), // 5x average (+0.35)
                0,
                true, // new beneficiary (+0.25)
                false,
                LocalTime.of(11, 0), // daytime
                0
        );
        assertEquals(FraudDecision.REVIEW, result.getDecision());
        assertTrue(result.getScore().compareTo(new BigDecimal("0.5000")) >= 0);
        assertTrue(result.getScore().compareTo(new BigDecimal("0.8000")) < 0);
    }

    @Test
    void unverifiedBeneficiary_increasesRiskScore() {
        FraudAssessmentResult result = engine.evaluate(
                new BigDecimal("5000.00"),
                new BigDecimal("5000.00"),
                0,
                false,
                true, // unverified (+0.40)
                LocalTime.of(12, 0),
                0
        );
        assertTrue(result.getScore().compareTo(new BigDecimal("0.4000")) >= 0);
        assertTrue(result.getTriggeredRules().contains("UNVERIFIED_BENEFICIARY"));
    }
}
