import React from "react";

export default function FraudCheckBadge({ score, decision, rules }) {
  if (score === undefined || score === null) return null;

  const numScore = typeof score === "number" ? score : parseFloat(score) || 0;
  let badgeColor = "bg-green-100 text-green-800 border-green-300";
  if (decision === "BLOCK") {
    badgeColor = "bg-red-100 text-red-800 border-red-300";
  } else if (decision === "REVIEW") {
    badgeColor = "bg-amber-100 text-amber-800 border-amber-300";
  }

  const rulesList = typeof rules === "string" && rules.trim()
    ? rules.split(",").map((r) => r.trim()).filter(Boolean)
    : Array.isArray(rules) ? rules : [];

  return (
    <div className="fraud-badge-card p-3 rounded-lg border bg-surface-alt">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="text-xs font-semibold text-muted uppercase tracking-wider">Fraud Risk Engine</div>
        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${badgeColor}`}>
          {decision || (numScore >= 0.8 ? "BLOCK" : numScore >= 0.5 ? "REVIEW" : "ALLOW")}
        </span>
      </div>

      <div className="flex items-center gap-3 my-2">
        <div className="flex-1 bg-surface rounded-full h-2 overflow-hidden border">
          <div
            className={`h-full ${
              numScore >= 0.8 ? "bg-red-500" : numScore >= 0.5 ? "bg-amber-500" : "bg-green-500"
            }`}
            style={{ width: `${Math.min(100, numScore * 100)}%` }}
          />
        </div>
        <span className="text-xs font-mono font-bold">{(numScore * 100).toFixed(1)}%</span>
      </div>

      {rulesList.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {rulesList.map((rule, idx) => (
            <span key={idx} className="text-2xs bg-surface px-1.5 py-0.5 rounded border text-muted">
              {rule}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
