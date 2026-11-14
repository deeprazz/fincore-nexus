import React, { useState, useEffect } from "react";
import { ShieldCheck, CheckCircle2, XCircle, RefreshCw, AlertTriangle, Lock } from "lucide-react";
import { getPciDssReport } from "../../api/kyc";

export default function ComplianceChecklist() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPciDssReport();
      setReport(data);
    } catch (err) {
      setError(err.message || "Failed to load PCI-DSS compliance assessment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
        Evaluating real-time system configuration controls...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-700 flex items-center space-x-2">
        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!report) return null;

  const { totalControls, passedControls, complianceScore, fullyCompliant, controls = [] } = report;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">PCI-DSS Regulatory Self-Assessment</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic control evaluation inspected directly from active system configuration, database triggers, and cipher engines
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-500 uppercase">Compliance Score</p>
            <p className="text-2xl font-black text-slate-900">{complianceScore}%</p>
          </div>
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
              fullyCompliant
                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                : "bg-amber-50 text-amber-700 border-amber-300"
            }`}
          >
            {fullyCompliant ? "100% COMPLIANT" : `${passedControls}/${totalControls} CONTROLS PASSED`}
          </span>
          <button
            onClick={fetchReport}
            className="p-2 border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-600"
            title="Re-evaluate controls"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Controls Grid */}
      <div className="space-y-3">
        {controls.map((check) => {
          const isPassed = check.passed;
          return (
            <div
              key={check.controlId}
              className={`p-4 rounded-xl border transition-all ${
                isPassed ? "bg-slate-50/60 border-slate-200/80" : "bg-rose-50/40 border-rose-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {check.controlId}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{check.title}</h4>
                  </div>
                  <p className="text-xs text-slate-600">{check.description}</p>
                </div>

                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                    isPassed
                      ? "bg-emerald-100/70 text-emerald-800"
                      : "bg-rose-100/70 text-rose-800"
                  }`}
                >
                  {isPassed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> PASS
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" /> FAIL
                    </>
                  )}
                </span>
              </div>

              {/* Verified Evidence Output */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-start space-x-2 text-[11px] text-slate-500 font-mono">
                <Lock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <span>Evidence: {check.evidence}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
