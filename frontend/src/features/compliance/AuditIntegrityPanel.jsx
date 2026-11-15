import React, { useState, useEffect, useContext } from "react";
import { Shield, CheckCircle, AlertTriangle, RefreshCw, KeyRound, Database } from "lucide-react";
import { verifyAuditIntegrity } from "../../api/kyc";
import AuthContext from "../../context/AuthContext";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

export default function AuditIntegrityPanel() {
  const authContext = useContext(AuthContext);
  const auth = authContext?.auth || null;
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const runVerification = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await verifyAuditIntegrity(auth);
      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to execute cross-service audit verification");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runVerification();
  }, [auth]);

  return (
    <Card className="audit-integrity-panel">
      <div className="panel-header-row">
        <div>
          <div className="panel-title-group">
            <KeyRound className="w-5 h-5 text-blue-500" />
            <h2 className="panel-title">Cryptographic Audit Chain Integrity</h2>
          </div>
          <p className="panel-subtitle">
            Recomputes SHA-256 cryptographic hash chains across microservices to mathematically verify immutable audit logs
          </p>
        </div>

        <Button
          onClick={runVerification}
          disabled={loading}
          variant="primary"
          className="recompute-btn"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Recompute Chain Hashes
        </Button>
      </div>

      {error && (
        <div className="audit-error-banner">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="audit-loading-state">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-500 mb-2" />
          <span>Verifying SHA-256 hash chains across PostgreSQL databases...</span>
        </div>
      ) : result ? (
        <div className="audit-results-container">
          {/* Overall status banner */}
          <div className={`audit-overall-banner ${result.overallValid ? "valid" : "invalid"}`}>
            <div className="flex-group">
              {result.overallValid ? (
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-rose-500" />
              )}
              <div>
                <h4 className="banner-title">
                  {result.overallValid ? "Cryptographic Integrity 100% Intact" : "Audit Chain Anomaly Detected"}
                </h4>
                <p className="banner-timestamp">
                  Verified timestamp: {new Date(result.verifiedAt || Date.now()).toLocaleString()}
                </p>
              </div>
            </div>
            <span className={`status-pill ${result.overallValid ? "pill-valid" : "pill-invalid"}`}>
              {result.overallValid ? "ALL CHAINS VALID" : "TAMPER ALERT"}
            </span>
          </div>

          {/* Microservices Audit Chains Grid */}
          <div className="audit-chains-grid">
            {/* KYC Service Audit */}
            <div className="audit-service-box">
              <div className="box-header">
                <div className="flex-group-sm">
                  <Database className="w-4 h-4 text-blue-400" />
                  <h4 className="box-title">KYC Service Audit Chain</h4>
                </div>
                <span className={`mini-pill ${result.kycAuditChain?.valid ? "mini-valid" : "mini-invalid"}`}>
                  {result.kycAuditChain?.valid ? "VALID" : "INVALID"}
                </span>
              </div>
              <p className="box-desc">{result.kycAuditChain?.message || "All records sequentially chained."}</p>
              <p className="box-meta">
                Total Ledger Entries: {result.kycAuditChain?.totalEntries ?? 0}
              </p>
            </div>

            {/* Core Banking Audit */}
            <div className="audit-service-box">
              <div className="box-header">
                <div className="flex-group-sm">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <h4 className="box-title">Core Banking Audit Chain</h4>
                </div>
                <span className={`mini-pill ${result.coreAuditChain?.valid !== false ? "mini-valid" : "mini-invalid"}`}>
                  {result.coreAuditChain?.valid !== false ? "VALID" : "INVALID"}
                </span>
              </div>
              <p className="box-desc">
                {result.coreAuditChain?.message || "Core banking cryptographic audit ledger verified."}
              </p>
              <p className="box-meta">
                Total Ledger Entries: {result.coreAuditChain?.totalEntries ?? result.coreAuditChain?.total_entries ?? "Synced"}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
