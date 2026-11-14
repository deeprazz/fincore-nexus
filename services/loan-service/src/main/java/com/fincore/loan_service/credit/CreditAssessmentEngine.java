package com.fincore.loan_service.credit;

import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Deterministic credit scoring engine. Score range: 300–900.
 * No external calls; all logic is local.
 */
@Component
public class CreditAssessmentEngine {

    /**
     * @param annualIncome         yearly income in INR
     * @param requestedAmount      loan principal
     * @param tenureMonths         loan tenure
     * @param kycVerified          true if customer's kycStatus == VERIFIED
     * @param existingObligations  total existing loan obligations (monthly)
     * @param overdueEmiCount      number of currently OVERDUE EMIs (from loan-service DB)
     */
    public CreditAssessmentResult assess(
            BigDecimal annualIncome,
            BigDecimal requestedAmount,
            int tenureMonths,
            boolean kycVerified,
            BigDecimal existingObligations,
            int overdueEmiCount) {

        int score = 300; // base score

        // 1. Income score (0–300): (annualIncome / 100000) * 60, capped at 300
        double incomeScore = annualIncome.doubleValue() / 100_000.0 * 60.0;
        score += (int) Math.min(incomeScore, 300.0);

        // 2. Loan-to-income ratio (0–200): lower LTI = higher score
        // LTI = requestedAmount / annualIncome
        // LTI <= 1: +200, LTI <= 2: +150, LTI <= 3: +100, LTI <= 4: +50, else 0
        double lti = requestedAmount.doubleValue() / Math.max(annualIncome.doubleValue(), 1.0);
        if (lti <= 1.0) score += 200;
        else if (lti <= 2.0) score += 150;
        else if (lti <= 3.0) score += 100;
        else if (lti <= 4.0) score += 50;

        // 3. KYC bonus
        if (kycVerified) score += 100;

        // 4. Existing obligations penalty
        // Monthly obligation ratio = existingObligations / (annualIncome/12)
        BigDecimal monthlyIncome = annualIncome.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
        if (monthlyIncome.compareTo(BigDecimal.ZERO) > 0) {
            double obligationRatio = existingObligations.doubleValue() / monthlyIncome.doubleValue();
            if (obligationRatio > 0.5) score -= 100;
            else if (obligationRatio > 0.3) score -= 50;
            else if (obligationRatio > 0.2) score -= 25;
        }

        // 5. Overdue EMI penalty
        if (overdueEmiCount > 0) score -= (overdueEmiCount * 50);

        // Clamp to 300–900
        score = Math.max(300, Math.min(900, score));

        // Decision and rate
        String decision;
        String reason;
        double rate;

        if (score >= 700) {
            decision = "APPROVED";
            reason = "Credit score meets approval threshold";
            rate = score >= 800 ? 0.08 : 0.10; // 8% or 10% per annum
        } else if (score >= 600) {
            decision = "MANUAL_REVIEW";
            reason = "Credit score requires manual review";
            rate = 0.14;
        } else {
            decision = "REJECTED";
            reason = "Credit score below minimum threshold (600)";
            rate = 0.0;
        }

        return new CreditAssessmentResult(score, decision, reason, rate);
    }
}
