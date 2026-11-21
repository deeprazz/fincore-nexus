import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";
import { getAuditLogs, verifyAuditChain } from "../../api/audit";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export function AuditPage() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [verification, setVerification] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);

  const { auth } = useAuth();
  const { setError, setSuccess } = useToast();

  const isTeller = auth?.role === "TELLER";

  const loadData = useCallback(async () => {
    if (isTeller) return;
    setLoading(true);
    try {
      const data = await getAuditLogs(auth);
      setAuditLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.status !== 403) {
        setError(err.message || "Failed to load audit logs");
      }
    } finally {
      setLoading(false);
    }
  }, [auth, isTeller, setError]);

  const handleVerifyChain = useCallback(async () => {
    if (isTeller) return;
    setVerifying(true);
    try {
      const result = await verifyAuditChain(auth);
      setVerification(result);
      if (result.valid) {
        setSuccess(result.message || "Audit chain verified intact.");
      } else {
        setError(result.message || "Audit chain verification failed!");
      }
    } catch (err) {
      if (err.status !== 403) {
        setError(err.message || "Failed to verify audit chain");
      }
    } finally {
      setVerifying(false);
    }
  }, [auth, isTeller, setError, setSuccess]);

  useEffect(() => {
    if (!isTeller) {
      loadData();
      handleVerifyChain();
    }
  }, [isTeller, loadData, handleVerifyChain]);

  if (isTeller) {
    return (
      <div className="auth-restricted-card">
        <div className="auth-restricted-icon-box">
          <ShieldCheck size={28} />
        </div>
        <div>
          <h3 className="auth-restricted-title">Manager Authorization Required</h3>
          <p className="auth-restricted-desc">
            Under FinCore Security & Governance policy, inspecting cryptographic audit trails and verifying SHA-256 hash chains requires <strong>MANAGER</strong> or <strong>ADMIN</strong> authorization.
          </p>
        </div>
        <div className="auth-restricted-session-pill">
          Current Session: {auth?.username || "teller"} (Role: {auth?.role})
        </div>
        <p className="auth-restricted-hint">
          Please authenticate using an authorized Manager (<code>manager / Manager@123</code>) or Admin (<code>admin / Admin@123</code>) account to view immutable audit trails.
        </p>
      </div>
    );
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Cryptographic Audit Trail</h2>
          <p>
            Immutable, append-only log with SHA-256 hash chaining (latest 100 entries).
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="secondary-button"
            onClick={handleVerifyChain}
            disabled={verifying}
            type="button"
          >
            <ShieldCheck size={16} /> {verifying ? "Verifying..." : "Verify Hash Chain"}
          </button>
          <button
            className="secondary-button"
            onClick={loadData}
            disabled={loading}
            type="button"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {verification && (
        <div className={`audit-verify-banner ${verification.valid ? "valid" : "invalid"}`}>
          {verification.valid ? (
            <ShieldCheck size={20} color="#16a34a" />
          ) : (
            <AlertTriangle size={20} color="#dc2626" />
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
              {verification.valid ? "Hash Chain Cryptographically Valid" : "Tamper Alert: Hash Chain Broken"}
            </div>
            <div style={{ fontSize: "0.8125rem", opacity: 0.9 }}>
              {verification.message}
            </div>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Actor</th>
              <th>Details</th>
              <th>SHA-256 Hash</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log) => (
              <tr key={log.id}>
                <td style={{ whiteSpace: "nowrap" }}>
                  {log.createdAt
                    ? new Date(log.createdAt).toLocaleString("en-IN")
                    : "—"}
                </td>
                <td>
                  <strong>{log.action}</strong>
                </td>
                <td>
                  <span className="audit-entity-tag">
                    {log.entityType} {log.entityId ? `(#${String(log.entityId).substring(0, 8).toUpperCase()})` : ""}
                  </span>
                </td>
                <td>{log.actor}</td>
                <td style={{ maxWidth: "300px", wordBreak: "break-word" }}>{log.details}</td>
                <td>
                  {log.hash ? (
                    <code
                      className="audit-hash-badge"
                      title={`Hash: ${log.hash}\nPrev: ${log.prevHash || "GENESIS"}`}
                    >
                      {log.hash.substring(0, 12)}…
                    </code>
                  ) : (
                    <span className="audit-hash-legacy">genesis</span>
                  )}
                </td>
              </tr>
            ))}
            {!auditLogs.length && (
              <tr>
                <td colSpan="6" className="empty-state">
                  No audit events recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AuditPage;
