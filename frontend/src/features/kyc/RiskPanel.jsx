import React from "react";
import { Shield, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

export function RiskBadge({ level }) {
  const config = {
    LOW: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Low Risk" },
    MEDIUM: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Medium Risk" },
    HIGH: { bg: "bg-rose-50 text-rose-700 border-rose-200", label: "High Risk" },
  };

  const c = config[level] || config.LOW;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg}`}>
      {c.label}
    </span>
  );
}

export default function RiskPanel({ application }) {
  if (!application) return null;

  const {
    riskLevel = "LOW",
    riskScore = 0.05,
    pepMatch = false,
    sanctionsMatch = false,
    riskReasons = "",
  } = application;

  const scorePct = Math.round(Number(riskScore) * 100);
  const reasonsList = riskReasons
    ? riskReasons.split(";").map((r) => r.trim()).filter(Boolean)
    : ["No adverse risk indicators identified."];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-800">Risk & Compliance Assessment</h3>
        </div>
        <RiskBadge level={riskLevel} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Risk Score */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Calculated Risk Score</p>
          <div className="flex items-baseline mt-1 space-x-2">
            <span className="text-2xl font-bold text-slate-900">{Number(riskScore).toFixed(2)}</span>
            <span className="text-xs text-slate-500 font-medium">({scorePct}%)</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${
                riskLevel === "HIGH" ? "bg-rose-500" : riskLevel === "MEDIUM" ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(5, scorePct))}%` }}
            />
          </div>
        </div>

        {/* PEP Check */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">PEP Screening</p>
          <div className="flex items-center mt-2 space-x-2">
            {pepMatch ? (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-semibold text-amber-700">PEP Identified</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-700">Clean / No Match</span>
              </>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Politically Exposed Persons registry</p>
        </div>

        {/* Sanctions Check */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Sanctions Watchlist</p>
          <div className="flex items-center mt-2 space-x-2">
            {sanctionsMatch ? (
              <>
                <XCircle className="w-5 h-5 text-rose-500" />
                <span className="text-sm font-semibold text-rose-700">Watchlist Match</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-700">Clear / Unrestricted</span>
              </>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Global OFAC/UN sanctions database</p>
        </div>
      </div>

      {/* Risk Reasons */}
      <div className="pt-2">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Evaluated Risk Factors</p>
        <ul className="space-y-1.5">
          {reasonsList.map((reason, idx) => (
            <li key={idx} className="flex items-start text-xs text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 mr-2 shrink-0" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
