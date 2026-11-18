import React, { useState, useEffect, useCallback } from "react";
import { getApplications, approveApplication, rejectApplication } from "../../api/loans";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { money } from "../../utils/money";
import { formatDateTime } from "../../utils/date";
import { Modal } from "../../components/ui/Modal";
import { Check, X, RefreshCw, Award } from "lucide-react";

export function LoanApplicationList({ className = "" }) {
  const { auth } = useAuth();
  const { setError, setSuccess } = useToast();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Reject modal state
  const [rejectModalApp, setRejectModalApp] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

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

  const handleApprove = async (appId) => {
    setProcessing(true);
    try {
      await approveApplication(appId, auth);
      setSuccess("Loan application approved! Disbursement saga triggered.");
      loadApplications();
    } catch (err) {
      setError(err.message || "Failed to approve loan application");
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

    setProcessing(true);
    try {
      await rejectApplication(rejectModalApp.id, rejectReason.trim(), auth);
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
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-state">
                    {loading ? "Loading applications..." : "No loan applications found."}
                  </td>
                </tr>
              ) : (
                applications.map((app) => {
                  const status = String(app.status || "SUBMITTED").toUpperCase();
                  const score = app.creditScore || null;
                  const isPending =
                    status === "SUBMITTED" ||
                    status === "IN_REVIEW" ||
                    status === "MANUAL_REVIEW";

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
                      <td className="muted-cell">{formatDateTime(app.createdAt)}</td>
                      <td>
                        {isPending ? (
                          <div className="action-button-group">
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleApprove(app.id)}
                              disabled={processing}
                              title="Approve & Disburse"
                            >
                              <Check size={13} /> Approve
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
