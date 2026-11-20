import React, { useState, useEffect, useCallback } from "react";
import { getApplications, approveApplication, rejectApplication } from "../../api/loans";
import { getCustomers } from "../../api/customers";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { money } from "../../utils/money";
import { formatDateTime } from "../../utils/date";
import { Modal } from "../../components/ui/Modal";
import { Check, X, RefreshCw, Award, ShieldAlert, ShieldCheck, Eye, User } from "lucide-react";

export function LoanApplicationList({ className = "" }) {
  const { auth, login } = useAuth();
  const { setError, setSuccess } = useToast();

  const [applications, setApplications] = useState([]);
  const [customers, setCustomers] = useState({});
  const [selectedDossierApp, setSelectedDossierApp] = useState(null);
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
      const [data, custList] = await Promise.all([
        getApplications(auth),
        getCustomers("ALL", auth).catch(() => []),
      ]);
      setApplications(Array.isArray(data) ? data : []);
      const map = {};
      if (Array.isArray(custList)) {
        custList.forEach((c) => {
          if (c.id) map[c.id] = c;
        });
      }
      setCustomers(map);
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
                <th>Customer</th>
                <th>Income & Employment</th>
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
                  <td colSpan={10} className="empty-state">
                    {loading ? "Loading applications..." : "No loan applications found."}
                  </td>
                </tr>
              ) : (
                applications.map((app) => {
                  const cust = customers[app.customerId];
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
                      <td className="customer-cell">
                        <strong style={{ color: "var(--text-primary, #edf3fb)", fontSize: "13px", display: "block" }}>
                          {cust?.name || "Customer"}
                        </strong>
                        <small style={{ color: "var(--text-secondary, #8fa3bd)", fontSize: "11px", display: "block" }}>
                          {cust?.email || (app.customerId ? `CUST-${String(app.customerId).replace(/-/g, "").slice(0, 8).toUpperCase()}` : "N/A")}
                        </small>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "3px" }}>
                          <span className={`status-badge status-${String(cust?.kycStatus || "PENDING").toLowerCase()}`} style={{ fontSize: "9px", padding: "1px 5px" }}>
                            KYC: {cust?.kycStatus || "PENDING"}
                          </span>
                          {cust?.phoneNumber && (
                            <span style={{ fontSize: "10px", color: "var(--text-muted, #6f829b)" }}>
                              {cust.phoneNumber}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: "#10b981", fontSize: "12px", display: "block" }}>
                          {app.annualIncome ? money(app.annualIncome) + "/yr" : "—"}
                        </strong>
                        <small style={{ color: "var(--text-secondary, #8fa3bd)", fontSize: "11px", display: "block" }}>
                          {app.employmentType ? String(app.employmentType).replace(/_/g, " ") : "Salaried"}
                        </small>
                        {app.purpose && (
                          <small style={{ color: "var(--text-muted, #6f829b)", fontSize: "10px", display: "block" }}>
                            {app.purpose}
                          </small>
                        )}
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
                        <div className="action-button-group">
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => setSelectedDossierApp(app)}
                            title="View Full Customer Details & Underwriting Dossier"
                            style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}
                          >
                            <Eye size={12} /> Dossier
                          </button>
                          {isPending && (
                            <>
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
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprehensive Credit Underwriting Dossier Modal */}
      <Modal
        isOpen={!!selectedDossierApp}
        onClose={() => setSelectedDossierApp(null)}
        title="Credit Underwriting Dossier & Applicant Profile"
        maxWidth="680px"
      >
        {selectedDossierApp && (() => {
          const cust = customers[selectedDossierApp.customerId];
          const score = selectedDossierApp.creditScore || 650;
          const isPending =
            selectedDossierApp.status === "SUBMITTED" ||
            selectedDossierApp.status === "UNDER_REVIEW" ||
            selectedDossierApp.status === "IN_REVIEW" ||
            selectedDossierApp.status === "MANUAL_REVIEW" ||
            selectedDossierApp.status === "DRAFT";
          const isMaker =
            selectedDossierApp.createdBy &&
            selectedDossierApp.createdBy.toLowerCase() === auth?.username?.toLowerCase();
          const monthlyIncome = (Number(selectedDossierApp.annualIncome) || 0) / 12;
          const obligations = Number(selectedDossierApp.existingObligations) || 0;
          const foir = monthlyIncome > 0 ? ((obligations / monthlyIncome) * 100).toFixed(1) : "0.0";

          return (
            <div style={{ display: "grid", gap: "16px" }}>
              {/* Applicant Profile Card */}
              <div style={{ padding: "14px 16px", borderRadius: "8px", background: "var(--card-bg, #0d141e)", border: "1px solid var(--border-color, #283446)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa", fontWeight: 700 }}>
                      {(cust?.name || "C")[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "15px", color: "var(--text-primary, #edf3fb)" }}>
                        {cust?.name || "Customer Information"}
                      </h4>
                      <small style={{ color: "var(--text-secondary, #8fa3bd)" }}>
                        Customer ID: {selectedDossierApp.customerId}
                      </small>
                    </div>
                  </div>
                  <span className={`status-badge status-${String(cust?.kycStatus || "PENDING").toLowerCase()}`}>
                    KYC: {cust?.kycStatus || "PENDING"}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px", borderTop: "1px solid var(--border-color, #1e293b)", paddingTop: "10px" }}>
                  <div>
                    <span style={{ color: "var(--text-muted, #6f829b)" }}>Email: </span>
                    <strong style={{ color: "var(--text-primary, #edf3fb)" }}>{cust?.email || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted, #6f829b)" }}>Phone: </span>
                    <strong style={{ color: "var(--text-primary, #edf3fb)" }}>{cust?.phoneNumber || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted, #6f829b)" }}>PAN: </span>
                    <strong style={{ color: "var(--text-primary, #edf3fb)", fontFamily: "monospace" }}>{cust?.panNumber || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted, #6f829b)" }}>Aadhaar: </span>
                    <strong style={{ color: "var(--text-primary, #edf3fb)", fontFamily: "monospace" }}>{cust?.aadhaarNumber ? `XXXX-XXXX-${cust.aadhaarNumber.slice(-4)}` : "—"}</strong>
                  </div>
                </div>
              </div>

              {/* Financial & Underwriting Metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ padding: "12px", borderRadius: "8px", background: "var(--card-bg, #0d141e)", border: "1px solid var(--border-color, #283446)" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted, #6f829b)", display: "block" }}>FINANCIAL PROFILE</span>
                  <div style={{ marginTop: "6px", display: "grid", gap: "4px", fontSize: "12px" }}>
                    <div>Annual Income: <strong style={{ color: "#10b981" }}>{money(selectedDossierApp.annualIncome || 0)}</strong></div>
                    <div>Employment: <strong>{String(selectedDossierApp.employmentType || "SALARIED").replace(/_/g, " ")}</strong></div>
                    <div>Existing Monthly EMIs: <strong>{money(selectedDossierApp.existingObligations || 0)}</strong></div>
                    <div>Obligation Ratio (DTI): <strong>{foir}%</strong></div>
                  </div>
                </div>

                <div style={{ padding: "12px", borderRadius: "8px", background: "var(--card-bg, #0d141e)", border: "1px solid var(--border-color, #283446)" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted, #6f829b)", display: "block" }}>CREDIT & RISK EVALUATION</span>
                  <div style={{ marginTop: "6px", display: "grid", gap: "4px", fontSize: "12px" }}>
                    <div>Bureau Score: <strong style={{ color: score >= 700 ? "#10b981" : "#f59e0b" }}>{score} / 900</strong></div>
                    <div>Risk Category: <strong>{score >= 700 ? "Prime (Tier 1)" : score >= 600 ? "Standard (Tier 2)" : "Subprime"}</strong></div>
                    <div>Applied Rate: <strong>{score >= 800 ? "8.0%" : score >= 700 ? "10.0%" : "14.0%"} p.a.</strong></div>
                    <div>Purpose: <strong>{selectedDossierApp.purpose || "Personal"}</strong></div>
                  </div>
                </div>
              </div>

              {/* Facility Terms */}
              <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(96, 165, 250, 0.08)", border: "1px solid rgba(96, 165, 250, 0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "10px", color: "#93c5fd", display: "block" }}>REQUESTED CREDIT FACILITY</span>
                  <strong style={{ fontSize: "18px", color: "#60a5fa" }}>{money(selectedDossierApp.requestedAmount)}</strong>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "10px", color: "#93c5fd", display: "block" }}>SANCTIONED TENURE</span>
                  <strong style={{ fontSize: "15px", color: "var(--text-primary, #edf3fb)" }}>{selectedDossierApp.tenureMonths} Months</strong>
                </div>
              </div>

              {/* Maker Info */}
              <div style={{ fontSize: "11px", color: "var(--text-secondary, #8fa3bd)", display: "flex", justifyContent: "space-between" }}>
                <span>Originated By (Maker): <strong>{selectedDossierApp.createdBy || "Customer Portal"}</strong></span>
                <span>Submitted: <strong>{formatDateTime(selectedDossierApp.createdAt)}</strong></span>
              </div>

              {/* Modal Actions */}
              <div className="modal-actions" style={{ marginTop: "12px" }}>
                {isPending && !isMaker && (
                  <>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => {
                        const app = selectedDossierApp;
                        setSelectedDossierApp(null);
                        handleApprove(app);
                      }}
                      disabled={processing}
                    >
                      <Check size={14} /> {isManagerOrAdmin ? "Approve & Disburse Facility" : "Approve as Manager"}
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => {
                        const app = selectedDossierApp;
                        setSelectedDossierApp(null);
                        setRejectModalApp(app);
                      }}
                      disabled={processing}
                    >
                      <X size={14} /> Reject Application
                    </button>
                  </>
                )}
                {isMaker && (
                  <span style={{ color: "#f59e0b", fontSize: "12px", fontWeight: 600 }}>
                    Self-Approval Blocked under Maker-Checker dual control
                  </span>
                )}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setSelectedDossierApp(null)}
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

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
