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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs(auth);
      setAuditLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [auth, setError]);

  const handleVerifyChain = useCallback(async () => {
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
      setError(err.message || "Failed to verify audit chain");
    } finally {
      setVerifying(false);
    }
  }, [auth, setError, setSuccess]);

  useEffect(() => {
    loadData();
    handleVerifyChain();
  }, [loadData, handleVerifyChain]);

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
        <div
          style={{
            margin: "0 0 16px 0",
            padding: "12px 16px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            backgroundColor: verification.valid ? "#dcfce7" : "#fee2e2",
            border: `1px solid ${verification.valid ? "#86efac" : "#fca5a5"}`,
            color: verification.valid ? "#14532d" : "#7f1d1d",
          }}
        >
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
                  <span style={{ fontSize: "0.8125rem", color: "#4b5563" }}>
                    {log.entityType} {log.entityId ? `(${String(log.entityId).substring(0, 8)}…)` : ""}
                  </span>
                </td>
                <td>{log.actor}</td>
                <td style={{ maxWidth: "300px", wordBreak: "break-word" }}>{log.details}</td>
                <td>
                  {log.hash ? (
                    <code
                      style={{
                        fontSize: "0.75rem",
                        backgroundColor: "#f3f4f6",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        color: "#1f2937",
                      }}
                      title={`Hash: ${log.hash}\nPrev: ${log.prevHash || "GENESIS"}`}
                    >
                      {log.hash.substring(0, 12)}…
                    </code>
                  ) : (
                    <span style={{ color: "#9ca3af", fontSize: "0.75rem" }}>legacy</span>
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
