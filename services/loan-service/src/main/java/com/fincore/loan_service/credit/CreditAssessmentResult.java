package com.fincore.loan_service.credit;

public class CreditAssessmentResult {
    private final int score;
    private final String decision;  // APPROVED, MANUAL_REVIEW, REJECTED
    private final String reason;
    private final double annualInterestRate; // determined by score band

    public CreditAssessmentResult(int score, String decision, String reason, double annualInterestRate) {
        this.score = score;
        this.decision = decision;
        this.reason = reason;
        this.annualInterestRate = annualInterestRate;
    }

    public int getScore() { return score; }
    public String getDecision() { return decision; }
    public String getReason() { return reason; }
    public double getAnnualInterestRate() { return annualInterestRate; }
}
