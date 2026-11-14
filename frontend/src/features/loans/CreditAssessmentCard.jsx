import React from "react";
import { ShieldCheck, AlertTriangle, XCircle, Award } from "lucide-react";

export function CreditAssessmentCard({
  score = 650,
  decision = "MANUAL_REVIEW",
  reason = "",
  rate = 0.1,
  className = "",
}) {
  const normalizedDecision = String(decision || "MANUAL_REVIEW").toUpperCase();
  const numericScore = Number(score) || 300;
  // Calculate percentage within 300-900 range (total span 600)
  const scorePercent = Math.min(
    100,
    Math.max(0, Math.round(((numericScore - 300) / 600) * 100))
  );

  let decisionBadgeClass = "badge-review";
  let DecisionIcon = AlertTriangle;
  let scoreColor = "#f59e0b"; // amber

  if (normalizedDecision === "APPROVED") {
    decisionBadgeClass = "badge-approved";
    DecisionIcon = ShieldCheck;
    scoreColor = numericScore >= 800 ? "#10b981" : "#22c55e"; // green
  } else if (normalizedDecision === "REJECTED") {
    decisionBadgeClass = "badge-rejected";
    DecisionIcon = XCircle;
    scoreColor = "#ef4444"; // red
  }

  const interestRateDisplay =
    rate != null && rate > 0
      ? rate > 1
        ? `${rate.toFixed(1)}% p.a.`
        : `${(rate * 100).toFixed(1)}% p.a.`
      : "N/A";

  return (
    <div className={`credit-assessment-card ${className}`}>
      <div className="cac-header">
        <div className="cac-title-wrap">
          <Award size={20} className="cac-icon" />
          <div>
            <h4>Credit Assessment</h4>
            <span className="cac-subtitle">Instant bureau & risk analysis</span>
          </div>
        </div>
        <div className={`cac-decision-badge ${decisionBadgeClass}`}>
          <DecisionIcon size={14} />
          <span>{normalizedDecision.replaceAll("_", " ")}</span>
        </div>
      </div>

      <div className="cac-score-section">
        <div className="cac-gauge">
          <div className="cac-score-number" style={{ color: scoreColor }}>
            {numericScore}
          </div>
          <div className="cac-score-range">Score (300 - 900)</div>
        </div>

        <div className="cac-meter-wrap">
          <div className="cac-meter-bar">
            <div
              className="cac-meter-fill"
              style={{
                width: `${scorePercent}%`,
                backgroundColor: scoreColor,
              }}
            />
          </div>
          <div className="cac-meter-labels">
            <span>300 (Poor)</span>
            <span>600 (Fair)</span>
            <span>700 (Good)</span>
            <span>900 (Excellent)</span>
          </div>
        </div>
      </div>

      <div className="cac-details-grid">
        <div className="cac-detail-item">
          <span className="cac-detail-label">Interest Rate</span>
          <span className="cac-detail-value highlight">{interestRateDisplay}</span>
        </div>
        <div className="cac-detail-item">
          <span className="cac-detail-label">Risk Category</span>
          <span className="cac-detail-value">
            {numericScore >= 800
              ? "Tier 1 (Prime)"
              : numericScore >= 700
              ? "Tier 2 (Near Prime)"
              : numericScore >= 600
              ? "Tier 3 (Subprime)"
              : "High Risk"}
          </span>
        </div>
      </div>

      {reason && (
        <div className="cac-reason">
          <strong>Decision Remarks:</strong> {reason}
        </div>
      )}
    </div>
  );
}

export default CreditAssessmentCard;
