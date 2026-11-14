package com.fincore.payment_service.fraud;

import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Component
public class FraudDetectionEngine {

    /**
     * Evaluates a payment request against fraud rules.
     * Score range: 0.0000 - 1.0000
     * ALLOW (< 0.50), REVIEW (0.50 - 0.79), BLOCK (>= 0.80)
     */
    public FraudAssessmentResult evaluate(
            BigDecimal amount,
            BigDecimal customerAverageAmount,
            long paymentsInLast5Minutes,
            boolean isNewBeneficiary,
            boolean isUnverifiedBeneficiary,
            LocalTime paymentTime,
            long recentFailedAttempts) {

        double riskScore = 0.0;
        List<String> triggeredRules = new ArrayList<>();

        // Rule 1: Velocity - more than 3 payments in last 5 minutes (+0.30)
        if (paymentsInLast5Minutes >= 3) {
            riskScore += 0.30;
            triggeredRules.add("HIGH_VELOCITY (" + paymentsInLast5Minutes + " txns in 5m)");
        } else if (paymentsInLast5Minutes >= 2) {
            riskScore += 0.15;
            triggeredRules.add("MODERATE_VELOCITY (2 txns in 5m)");
        }

        // Rule 2: Amount vs Customer Average (+0.35 if > 4x average, +0.20 if > 2x average)
        if (customerAverageAmount != null && customerAverageAmount.compareTo(BigDecimal.ZERO) > 0) {
            double ratio = amount.doubleValue() / customerAverageAmount.doubleValue();
            if (ratio >= 4.0) {
                riskScore += 0.35;
                triggeredRules.add("UNUSUAL_AMOUNT (" + String.format("%.1fx", ratio) + " customer avg)");
            } else if (ratio >= 2.0) {
                riskScore += 0.20;
                triggeredRules.add("ELEVATED_AMOUNT (" + String.format("%.1fx", ratio) + " customer avg)");
            }
        }

        // Rule 3: Beneficiary risk
        if (isUnverifiedBeneficiary) {
            riskScore += 0.40;
            triggeredRules.add("UNVERIFIED_BENEFICIARY");
        } else if (isNewBeneficiary) {
            riskScore += 0.25;
            triggeredRules.add("NEW_BENEFICIARY (<24h active)");
        }

        // Rule 4: Odd-hour transfer (11:00 PM to 5:00 AM) (+0.20)
        if (paymentTime != null) {
            int hour = paymentTime.getHour();
            if (hour >= 23 || hour < 5) {
                riskScore += 0.20;
                triggeredRules.add("ODD_HOUR_TRANSACTION (" + hour + ":00)");
            }
        }

        // Rule 5: Repeated recent failures (+0.30 if >= 3 failures)
        if (recentFailedAttempts >= 3) {
            riskScore += 0.30;
            triggeredRules.add("REPEATED_FAILURES (" + recentFailedAttempts + " in 1h)");
        }

        // Clamp risk score to [0.0, 1.0]
        riskScore = Math.max(0.0, Math.min(1.0, riskScore));
        BigDecimal finalScore = BigDecimal.valueOf(riskScore).setScale(4, RoundingMode.HALF_UP);

        FraudDecision decision;
        if (finalScore.compareTo(new BigDecimal("0.8000")) >= 0) {
            decision = FraudDecision.BLOCK;
        } else if (finalScore.compareTo(new BigDecimal("0.5000")) >= 0) {
            decision = FraudDecision.REVIEW;
        } else {
            decision = FraudDecision.ALLOW;
        }

        return new FraudAssessmentResult(finalScore, decision, triggeredRules);
    }
}
