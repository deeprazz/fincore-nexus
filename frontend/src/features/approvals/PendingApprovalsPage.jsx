import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { getApprovals, approveOperation, rejectOperation } from "../../api/approvals";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useMoney } from "../../hooks/useMoney";

export function PendingApprovalsPage() {
  const { auth } = useAuth();
  const { setError, setSuccess } = useToast();
  const money = useMoney();

  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const isTeller = auth?.role === "TELLER";

  const fetchApprovalsList = useCallback(async () => {
    if (isTeller) return;
    setLoading(true);
    try {
      const data = await getApprovals(auth, showAll);
      setApprovals(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.status !== 403) {
        setError(err.message || "Failed to load pending approvals");
      }
    } finally {
      setLoading(false);
    }
  }, [auth, isTeller, showAll, setError]);

  useEffect(() => {
    if (!isTeller) {
      fetchApprovalsList();
    }
  }, [isTeller, fetchApprovalsList]);

  if (isTeller) {
    return (
      <div className="auth-restricted-card">
        <div className="auth-restricted-icon-box">
          <ShieldAlert size={28} />
        </div>
        <div>
          <h3 className="auth-restricted-title">Manager Authorization Required</h3>
          <p className="auth-restricted-desc">
            Under FinCore Dual-Control policy, reviewing and approving pending operations (withdrawals, transfers, limit adjustments) requires <strong>MANAGER</strong> or <strong>ADMIN</strong> authorization.
          </p>
        </div>
        <div className="auth-restricted-session-pill">
          Current Session: {auth?.username || "teller"} (Role: {auth?.role})
        </div>
        <p className="auth-restricted-hint">
          Please authenticate using an authorized Manager (<code>manager / Manager@123</code>) account to authorize or reject operations.
        </p>
      </div>
    );
  }

  const handleApprove = async (approval) => {
    if (approval.maker?.toLowerCase() === auth?.username?.toLowerCase()) {
      setError(`Maker-checker policy violation: You created this request as ${approval.maker} and cannot self-approve it.`);
      return;
    }

    setProcessingId(approval.id);
    try {
      await approveOperation(approval.id, auth);
      setSuccess(`Approved ${approval.operationType} of ${money(approval.amount)} successfully.`);
      fetchApprovalsList();
    } catch (err) {
      setError(err.message || "Approval failed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (approval) => {
    if (approval.maker?.toLowerCase() === auth?.username?.toLowerCase()) {
      setError(`Maker-checker policy violation: You cannot reject your own request.`);
      return;
    }

    const reason = window.prompt("Enter rejection reason for this transaction:", "High-risk transaction detected");
    if (reason === null) return;

    setProcessingId(approval.id);
    try {
      await rejectOperation(approval.id, reason, auth);
      setSuccess(`Rejected ${approval.operationType} of ${money(approval.amount)}.`);
      fetchApprovalsList();
    } catch (err) {
      setError(err.message || "Rejection failed");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = approvals.filter((a) => a.status === "PENDING_APPROVAL").length;

  return (
    <div className="page-container" style={{ padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent-primary, #3b82f6)", fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <ShieldAlert size={16} /> Dual Authorization Governance
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "6px 0 4px" }}>High-Value Pending Approvals</h1>
          <p style={{ color: "var(--text-muted, #94a3b8)", fontSize: "0.95rem", margin: 0 }}>
            Maker-Checker dual control for cash withdrawals and transfers exceeding the ₹200,000 threshold.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => setShowAll((prev) => !prev)}
            style={{ fontSize: "0.85rem", padding: "8px 14px" }}
          >
            {showAll ? "Show Pending Only" : "Show All History"}
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={fetchApprovalsList}
            disabled={loading}
            style={{ fontSize: "0.85rem", padding: "8px 14px", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div className="panel" style={{ padding: "16px", borderRadius: "10px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)", textTransform: "uppercase" }}>Queue Status</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: pendingCount > 0 ? "#f59e0b" : "#10b981", marginTop: "4px" }}>
            {pendingCount} Pending
          </div>
          <small style={{ color: "var(--text-muted, #94a3b8)" }}>Awaiting manager review</small>
        </div>
        <div className="panel" style={{ padding: "16px", borderRadius: "10px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)", textTransform: "uppercase" }}>Security Rule</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary, #0f172a)", marginTop: "4px" }}>
            Maker ≠ Checker
          </div>
          <small style={{ color: "var(--text-muted, #64748b)" }}>Initiator cannot approve own transfer</small>
        </div>
        <div className="panel" style={{ padding: "16px", borderRadius: "10px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted, #64748b)", textTransform: "uppercase" }}>Threshold</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary, #0f172a)", marginTop: "4px" }}>
            {money(200000)}
          </div>
          <small style={{ color: "var(--text-muted, #94a3b8)" }}>Configurable fincore.approval.threshold</small>
        </div>
      </div>

      {loading && approvals.length === 0 ? (
        <div className="panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
          <RefreshCw size={24} className="spin" style={{ margin: "0 auto 12px" }} />
          Loading pending approvals…
        </div>
      ) : approvals.length === 0 ? (
        <div className="panel" style={{ padding: "48px", textAlign: "center" }}>
          <CheckCircle2 size={40} style={{ color: "#10b981", margin: "0 auto 12px" }} />
          <h3 style={{ margin: "0 0 6px" }}>No Operations Pending Approval</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
            All large transfers and cash withdrawals are fully reviewed and authorized.
          </p>
        </div>
      ) : (
        <div className="panel table-wrap" style={{ borderRadius: "10px", overflow: "hidden" }}>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: "0.8rem" }}>
                <th style={{ padding: "12px 16px" }}>Operation</th>
                <th style={{ padding: "12px 16px" }}>Amount</th>
                <th style={{ padding: "12px 16px" }}>Accounts</th>
                <th style={{ padding: "12px 16px" }}>Maker</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}>Submitted At</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((item) => {
                const isMaker = item.maker?.toLowerCase() === auth?.username?.toLowerCase();
                const isPending = item.status === "PENDING_APPROVAL";

                return (
                  <tr key={item.id} style={{ borderTop: "1px solid var(--border-color, #1f293d)" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <span className={`transaction-type ${item.operationType?.toLowerCase()}`} style={{ fontWeight: 600, fontSize: "0.8rem", padding: "4px 8px", borderRadius: "4px" }}>
                        {item.operationType}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 700, fontSize: "0.95rem" }}>
                      {money(item.amount)}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      <div>From: <code style={{ fontSize: "0.8rem" }}>{item.fromAccountId?.substring(0, 8)}…</code></div>
                      {item.toAccountId && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                          To: <code style={{ fontSize: "0.8rem" }}>{item.toAccountId?.substring(0, 8)}…</code>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <UserCheck size={14} />
                        <strong>{item.maker}</strong>
                      </span>
                      {isMaker && (
                        <span style={{ display: "block", fontSize: "0.75rem", color: "#f59e0b" }}>
                          (You are maker)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: "12px",
                          background: item.status === "APPROVED" ? "rgba(16, 185, 129, 0.15)" : item.status === "REJECTED" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                          color: item.status === "APPROVED" ? "#10b981" : item.status === "REJECTED" ? "#ef4444" : "#f59e0b",
                        }}
                      >
                        {item.status}
                      </span>
                      {item.checker && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          by {item.checker}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      {isPending ? (
                        <div style={{ display: "inline-flex", gap: "8px" }}>
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => handleApprove(item)}
                            disabled={isMaker || processingId === item.id}
                            title={isMaker ? "Maker cannot approve own transaction" : "Approve and move funds"}
                            style={{
                              fontSize: "0.8rem",
                              padding: "6px 12px",
                              opacity: isMaker ? 0.5 : 1,
                              cursor: isMaker ? "not-allowed" : "pointer",
                              background: "#10b981",
                            }}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => handleReject(item)}
                            disabled={isMaker || processingId === item.id}
                            title={isMaker ? "Maker cannot review own transaction" : "Reject transaction"}
                            style={{
                              fontSize: "0.8rem",
                              padding: "6px 12px",
                              opacity: isMaker ? 0.5 : 1,
                              cursor: isMaker ? "not-allowed" : "pointer",
                              color: "#ef4444",
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Closed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PendingApprovalsPage;
