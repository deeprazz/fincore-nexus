package com.fincore.payment_service.fraud;

import java.math.BigDecimal;
import java.util.List;

public class FraudAssessmentResult {
    private final BigDecimal score;
    private final FraudDecision decision;
    private final List<String> triggeredRules;

    public FraudAssessmentResult(BigDecimal score, FraudDecision decision, List<String> triggeredRules) {
        this.score = score;
        this.decision = decision;
        this.triggeredRules = triggeredRules;
    }

    public BigDecimal getScore() { return score; }
    public FraudDecision getDecision() { return decision; }
    public List<String> getTriggeredRules() { return triggeredRules; }
    public String getTriggeredRulesAsString() { return String.join(", ", triggeredRules); }
}
