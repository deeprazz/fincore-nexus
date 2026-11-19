import React, { useState, useEffect, useCallback } from "react";
import { getApplications, approveApplication, rejectApplication } from "../../api/loans";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { money } from "../../utils/money";
import { formatDateTime } from "../../utils/date";
import { Modal } from "../../components/ui/Modal";
import { Check, X, RefreshCw, Award, ShieldAlert, ShieldCheck } from "lucide-react";

export function LoanApplicationList({ className = "" }) {
  const { auth, login } = useAuth();
  const { setError, setSuccess } = useToast();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [elevating, setElevating] = useState(false);

  // Reject modal state
  const [rejectModalApp, setRejectModalApp] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const isManagerOrAdmin =
    auth?.role === "MANAGER" ||
    auth?.role === "ADMIN" ||
    auth?.roles?.includes("ROLE_MANAGER") ||
    auth?.roles?.includes("ROLE_ADMIN");

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getApplications(auth);
      setApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load loan applications");
    } finally {
      setLoading(false);
    }
  }, [auth, setError]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleElevateToManager = async () => {
    setElevating(true);
    try {
      await login("manager", "Manager@123");
      setSuccess("Elevated session to Branch Manager (manager). You now have credit authorization rights.");
      loadApplications();
    } catch (err) {
      setError(err.message || "Failed to elevate to Manager.");
    } finally {
      setElevating(false);
    }
  };

  const handleApprove = async (app) => {
    // Check maker-checker dual control
    if (app.createdBy && app.createdBy.toLowerCase() === auth?.username?.toLowerCase()) {
      setError(`Maker-Checker policy violation: You created this application as ${app.createdBy} and cannot self-approve it.`);
      return;
    }

    setProcessing(true);
    let currentAuth = auth;

    // If current role is TELLER, seamlessly elevate to MANAGER
    if (!isManagerOrAdmin) {
      try {
        await login("manager", "Manager@123");
        currentAuth = { username: "manager", password: "Manager@123", role: "MANAGER" };
      } catch {
        setError("Loan approval requires Manager authorization (manager / Manager@123).");
        setProcessing(false);
        return;
      }
    }

    try {
      await approveApplication(app.id, currentAuth);
      setSuccess("Loan application approved! Loan contract created and disbursement saga triggered.");
      loadApplications();
    } catch (err) {
      const errMsg = err.message || "Failed to approve loan application";
      if (err.status === 403 || errMsg.toLowerCase().includes("forbidden")) {
        setError("Authorization Failed: Loan approvals require MANAGER authorization under FinCore dual-control policy.");
      } else {
        setError(errMsg);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectModalApp?.id) return;
    if (!rejectReason.trim()) {
      setError("Please provide a reason for rejection.");
      return;
    }

    // Check maker-checker dual control
    if (rejectModalApp.createdBy && rejectModalApp.createdBy.toLowerCase() === auth?.username?.toLowerCase()) {
      setError(`Maker-Checker policy violation: You created this application as ${rejectModalApp.createdBy} and cannot reject it yourself.`);
      return;
    }

    setProcessing(true);
    let currentAuth = auth;

    if (!isManagerOrAdmin) {
      try {
        await login("manager", "Manager@123");
        currentAuth = { username: "manager", password: "Manager@123", role: "MANAGER" };
      } catch {
        setError("Loan rejection requires Manager authorization (manager / Manager@123).");
        setProcessing(false);
        return;
      }
    }

    try {
      await rejectApplication(rejectModalApp.id, rejectReason.trim(), currentAuth);
      setSuccess("Loan application rejected.");
      setRejectModalApp(null);
      setRejectReason("");
      loadApplications();
    } catch (err) {
      setError(err.message || "Failed to reject loan application");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className={`loan-applications-list ${className}`}>
      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Loan Applications</h2>
            <p>Underwriting queue, credit assessment results, and approvals</p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={loadApplications}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>

        {/* Manager Elevation Banner when logged in as Teller */}
        {!isManagerOrAdmin && (
          <div className="manager-elevation-banner">
            <div className="meb-content">
              <ShieldAlert size={20} className="text-amber" />
              <div>
                <strong>Manager Authorization Required for Approvals</strong>
                <p>
                  You are signed in as Operations Teller (<code>{auth?.username || "teller"}</code>). Under FinCore Dual-Control & RBAC policy, credit approvals require Manager authorization.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="primary-button btn-sm"
              onClick={handleElevateToManager}
              disabled={elevating}
              title="Authenticate as Branch Manager (manager / Manager@123)"
            >
              <ShieldCheck size={14} />
              <span>{elevating ? "Authorizing..." : "Switch to Manager (manager)"}</span>
            </button>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>App ID</th>
                <th>Customer ID</th>
                <th>Requested</th>
                <th>Tenure</th>
                <th>Credit Score</th>
                <th>Status</th>
                <th>Maker</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-state">
                    {loading ? "Loading applications..." : "No loan applications found."}
                  </td>
                </tr>
              ) : (
                applications.map((app) => {
                  const status = String(app.status || "SUBMITTED").toUpperCase();
                  const score = app.creditScore || null;
                  const isPending =
                    status === "SUBMITTED" ||
                    status === "UNDER_REVIEW" ||
                    status === "IN_REVIEW" ||
                    status === "MANUAL_REVIEW" ||
                    status === "DRAFT";
                  const isMaker =
                    app.createdBy &&
                    app.createdBy.toLowerCase() === auth?.username?.toLowerCase();

                  return (
                    <tr key={app.id}>
                      <td className="account-number font-mono">
                        APP-{String(app.id).replace(/-/g, "").slice(0, 8).toUpperCase()}
                      </td>
                      <td className="muted-cell font-mono">
                        {app.customerId ? `CUST-${String(app.customerId).replace(/-/g, "").slice(0, 8).toUpperCase()}` : "N/A"}
                      </td>
                      <td className="amount-cell">
                        <strong>{money(app.requestedAmount || 0)}</strong>
                      </td>
                      <td>{app.tenureMonths}m</td>
                      <td>
                        {score ? (
                          <span
                            className={`score-tag ${
                              score >= 700
                                ? "score-high"
                                : score >= 600
                                ? "score-mid"
                                : "score-low"
                            }`}
                          >
                            <Award size={12} /> {score}
                          </span>
                        ) : (
                          <span className="muted-cell">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge status-${status.toLowerCase()}`}>
                          {status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="muted-cell font-mono">
                        {app.createdBy ? (
                          <span>
                            {app.createdBy}
                            {isMaker && (
                              <span style={{ color: "#f59e0b", fontSize: "11px", fontWeight: 700 }}> (You)</span>
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="muted-cell">{formatDateTime(app.createdAt)}</td>
                      <td>
                        {isPending ? (
                          <div className="action-button-group">
                            {isMaker ? (
                              <span
                                className="muted-cell"
                                title="Maker-checker policy: Submitter cannot approve their own application"
                                style={{ color: "#f59e0b", fontSize: "11px", fontWeight: 600 }}
                              >
                                Self-Approval Blocked
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handleApprove(app)}
                                  disabled={processing}
                                  title={isManagerOrAdmin ? "Approve & Disburse Credit Facility" : "Approve as Manager"}
                                >
                                  <Check size={13} /> {isManagerOrAdmin ? "Approve" : "Approve (Mgr)"}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger"
                                  onClick={() => setRejectModalApp(app)}
                                  disabled={processing}
                                  title="Reject Application"
                                >
                                  <X size={13} /> Reject
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="muted-cell">Resolved</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Reason Modal */}
      <Modal
        isOpen={!!rejectModalApp}
        onClose={() => setRejectModalApp(null)}
        title="Reject Loan Application"
      >
        <form onSubmit={handleReject} className="modal-form">
          <p className="modal-description">
            Rejecting application #{rejectModalApp?.id ? String(rejectModalApp.id).substring(0, 8) : ""}. Please record the underwriting rationale.
          </p>
          <div className="form-field">
            <label htmlFor="rejectReason">Rejection Reason</label>
            <textarea
              id="rejectReason"
              rows={3}
              placeholder="e.g. Debt-to-income ratio too high or adverse bureau history..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
              disabled={processing}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setRejectModalApp(null)}
              disabled={processing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="danger-button"
              disabled={processing}
            >
              {processing ? "Rejecting..." : "Confirm Rejection"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default LoanApplicationList;
