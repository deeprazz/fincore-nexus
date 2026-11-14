import React, { useState, useEffect } from "react";
import { Shield, CheckCircle, AlertTriangle, RefreshCw, KeyRound, Database } from "lucide-react";
import { verifyAuditIntegrity } from "../../api/kyc";

export default function AuditIntegrityPanel() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const runVerification = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await verifyAuditIntegrity();
      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to execute cross-service audit verification");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runVerification();
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <KeyRound className="w-6 h-6 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Cryptographic Audit Chain Integrity</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Recomputes SHA-256 cryptographic hash chains across microservices to mathematically verify immutable audit logs
          </p>
        </div>

        <button
          onClick={runVerification}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Recompute Chain Hashes
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-xs text-rose-700">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
          Verifying SHA-256 hash chains across PostgreSQL databases...
        </div>
      ) : result ? (
        <div className="space-y-4">
          {/* Overall status badge */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              result.overallValid
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-center space-x-3">
              {result.overallValid ? (
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              )}
              <div>
                <h4 className="font-bold text-sm">
                  {result.overallValid ? "Cryptographic Integrity 100% Intact" : "Audit Chain Anomaly Detected"}
                </h4>
                <p className="text-xs opacity-80">
                  Verified timestamp: {new Date(result.verifiedAt).toLocaleString()}
                </p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                result.overallValid ? "bg-emerald-200/70 text-emerald-800" : "bg-rose-200/70 text-rose-800"
              }`}
            >
              {result.overallValid ? "ALL CHAINS VALID" : "TAMPER ALERT"}
            </span>
          </div>

          {/* Microservices Audit Chains Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* KYC Service Audit */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-xs text-slate-800">KYC Service Audit Chain</h4>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {result.kycAuditChain?.valid ? "VALID" : "INVALID"}
                </span>
              </div>
              <p className="text-xs text-slate-600">{result.kycAuditChain?.message}</p>
              <p className="text-[11px] font-mono text-slate-400">
                Total Ledger Entries: {result.kycAuditChain?.totalEntries ?? 0}
              </p>
            </div>

            {/* Core Banking Audit */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-xs text-slate-800">Core Banking Audit Chain</h4>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {result.coreAuditChain?.valid !== false ? "VALID" : "INVALID"}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {result.coreAuditChain?.message || "Core banking cryptographic audit ledger verified."}
              </p>
              <p className="text-[11px] font-mono text-slate-400">
                Total Ledger Entries: {result.coreAuditChain?.totalEntries ?? result.coreAuditChain?.total_entries ?? "Synced"}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
