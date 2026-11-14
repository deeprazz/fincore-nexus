import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { getAuditLogs } from "../../api/audit";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export function AuditPage() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const { auth } = useAuth();
  const { setError } = useToast();

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Audit Trail</h2>
          <p>
            Recent successful account, transaction, customer and KYC actions (latest 100).
          </p>
        </div>
        <button
          className="secondary-button"
          onClick={loadData}
          disabled={loading}
          type="button"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Entity ID</th>
              <th>Actor</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log) => (
              <tr key={log.id}>
                <td>
                  {log.createdAt
                    ? new Date(log.createdAt).toLocaleString("en-IN")
                    : "—"}
                </td>
                <td>{log.action}</td>
                <td>{log.entityType}</td>
                <td className="muted-cell">{log.entityId || "—"}</td>
                <td>{log.actor}</td>
                <td>{log.details}</td>
              </tr>
            ))}
            {!auditLogs.length && (
              <tr>
                <td colSpan="6" className="empty-state">
                  No audit events yet.
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
