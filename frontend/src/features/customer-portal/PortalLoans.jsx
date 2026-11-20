import React, { useState, useEffect, useCallback } from "react";
import {
  Landmark,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Calculator,
  ShieldCheck,
  FileText,
  RefreshCw,
  Percent,
  Sparkles,
} from "lucide-react";
import {
  getCustomerLoans,
  getCustomerApplications,
  submitApplication,
  getEmiSchedule,
  prepayLoan,
} from "../../api/loans";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useMoney } from "../../hooks/useMoney";
import { formatDate } from "../../utils/date";
import { CreditAssessmentCard } from "../loans/CreditAssessmentCard";
import { EmiScheduleTable } from "../loans/EmiScheduleTable";
import "../loans/loans.css";

export function PortalLoans() {
  const { auth, customerPortal, refreshPortalData } = useAuth();
  const { setError, setSuccess } = useToast();
  const money = useMoney();

  const customerId = customerPortal?.customerId || customerPortal?.id || auth?.customerId || auth?.id;
  const isKycVerified = customerPortal?.kycStatus === "VERIFIED";

  const [activeTab, setActiveTab] = useState("apply"); // 'apply' | 'loans' | 'applications' | 'calculator'
  const [loading, setLoading] = useState(false);
  const [loans, setLoans] = useState([]);
  const [applications, setApplications] = useState([]);

  // Expanded schedule states
  const [expandedLoanId, setExpandedLoanId] = useState(null);
  const [loanSchedules, setLoanSchedules] = useState({});
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Prepayment state
  const [prepayLoanId, setPrepayLoanId] = useState(null);
  const [prepayAmount, setPrepayAmount] = useState("");
  const [selectedDebitAccountId, setSelectedDebitAccountId] = useState("");
  const [prepaying, setPrepaying] = useState(false);

  const customerAccounts = customerPortal?.accounts || [];

  // Application Form State
  const [formData, setFormData] = useState({
    requestedAmount: "50000",
    tenureMonths: "24",
    annualIncome: "600000",
    employmentType: "SALARIED",
    purpose: "Personal Loan",
    existingObligations: "0",
  });
  const [submitting, setSubmitting] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [createdApplication, setCreatedApplication] = useState(null);

  // Live Estimator State
  const [liveEstimate, setLiveEstimate] = useState({
    emi: 2273,
    totalInterest: 4552,
    totalPayable: 54552,
  });

  // Standalone Calculator State
  const [calcAmount, setCalcAmount] = useState(100000);
  const [calcRate, setCalcRate] = useState(10.5);
  const [calcTenure, setCalcTenure] = useState(24);
  const [calcResult, setCalcResult] = useState({ emi: 4638, interest: 11312, total: 111312 });

  // Recalculate standalone calculator
  useEffect(() => {
    const P = Number(calcAmount) || 0;
    const r = (Number(calcRate) || 0) / 12 / 100;
    const n = Number(calcTenure) || 1;
    if (P <= 0 || n <= 0) return;
    if (r <= 0) {
      const emi = P / n;
      setCalcResult({ emi: Math.round(emi), interest: 0, total: Math.round(P) });
      return;
    }
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const total = emi * n;
    const interest = total - P;
    setCalcResult({
      emi: Math.round(emi),
      interest: Math.round(interest),
      total: Math.round(total),
    });
  }, [calcAmount, calcRate, calcTenure]);

  // Recalculate live estimate for application form
  useEffect(() => {
    const P = Number(formData.requestedAmount) || 0;
    const n = Number(formData.tenureMonths) || 12;
    const annualRate = 0.085; // 8.5% default benchmark
    const r = annualRate / 12;
    if (P > 0 && n > 0) {
      const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      const total = emi * n;
      setLiveEstimate({
        emi: Math.round(emi),
        totalInterest: Math.round(total - P),
        totalPayable: Math.round(total),
      });
    }
  }, [formData.requestedAmount, formData.tenureMonths]);

  // Fetch loans and applications
  const fetchData = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const [loansRes, appsRes] = await Promise.all([
        getCustomerLoans(customerId, auth).catch(() => []),
        getCustomerApplications(customerId, auth).catch(() => []),
      ]);
      setLoans(Array.isArray(loansRes) ? loansRes : []);
      setApplications(Array.isArray(appsRes) ? appsRes : []);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, [customerId, auth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle Schedule View
  const toggleSchedule = async (loanId) => {
    if (expandedLoanId === loanId) {
      setExpandedLoanId(null);
      return;
    }
    setExpandedLoanId(loanId);
    if (!loanSchedules[loanId]) {
      setLoadingSchedule(true);
      try {
        const schedule = await getEmiSchedule(loanId, auth);
        setLoanSchedules((prev) => ({ ...prev, [loanId]: schedule }));
      } catch (err) {
        setError(err.message || "Failed to load EMI schedule");
      } finally {
        setLoadingSchedule(false);
      }
    }
  };

  // Submit Application
  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    let effectiveCustomerId = customerId || customerPortal?.customerId || customerPortal?.id || auth?.customerId || auth?.id;

    if (!effectiveCustomerId && refreshPortalData) {
      try {
        const refreshed = await refreshPortalData();
        effectiveCustomerId = refreshed?.customerId || refreshed?.id;
      } catch {
        // continue
      }
    }

    if (!effectiveCustomerId) {
      setError("Customer profile not loaded. Please ensure you are logged in as a registered customer.");
      return;
    }
    setSubmitting(true);
    setAssessmentResult(null);
    setCreatedApplication(null);

    try {
      const payload = {
        customerId: effectiveCustomerId,
        requestedAmount: Number(formData.requestedAmount),
        tenureMonths: parseInt(formData.tenureMonths, 10),
        annualIncome: Number(formData.annualIncome),
        employmentType: formData.employmentType,
        purpose: formData.purpose,
        existingObligations: Number(formData.existingObligations || 0),
      };

      const result = await submitApplication(payload, auth);
      setCreatedApplication(result);

      const score = result.creditScore || 650;
      const decision = result.status || (score >= 700 ? "APPROVED" : score >= 600 ? "MANUAL_REVIEW" : "REJECTED");
      const rate = score >= 800 ? 0.08 : score >= 700 ? 0.10 : score >= 600 ? 0.14 : 0.0;
      const reason =
        result.rejectionReason ||
        (score >= 700
          ? "Credit score meets prime underwriting criteria."
          : score >= 600
          ? "Eligible with manual verification."
          : "Credit score below underwriting threshold.");

      setAssessmentResult({ score, decision, rate, reason });
      setSuccess("Loan application submitted successfully!");
      fetchData();
      if (refreshPortalData) refreshPortalData();
    } catch (err) {
      setError(err.message || "Failed to submit loan application");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Prepayment
  const handlePrepaySubmit = async (e, loanId) => {
    e.preventDefault();
    const amount = Number(prepayAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid prepayment amount.");
      return;
    }

    const accountToDebit = selectedDebitAccountId || customerAccounts[0]?.id || null;
    const chosenAccount = customerAccounts.find((a) => a.id === accountToDebit);
    if (chosenAccount && chosenAccount.balance != null && Number(chosenAccount.balance) < amount) {
      setError(`Insufficient balance in account ${chosenAccount.accountNumber || ""}. Available: ${money(chosenAccount.balance)}, required: ${money(amount)}.`);
      return;
    }

    setPrepaying(true);
    try {
      await prepayLoan(loanId, amount, auth, accountToDebit);
      setSuccess(`Prepayment of ${money(amount)} processed successfully. Amount debited from your bank account.`);
      setPrepayLoanId(null);
      setPrepayAmount("");
      // Refresh schedule cache & loan list
      setLoanSchedules((prev) => {
        const copy = { ...prev };
        delete copy[loanId];
        return copy;
      });
      fetchData();
      if (refreshPortalData) {
        await refreshPortalData();
      }
    } catch (err) {
      setError(err.message || "Prepayment failed");
    } finally {
      setPrepaying(false);
    }
  };

  // Quick Amount preset chips
  const quickAmounts = [25000, 50000, 100000, 250000, 500000];

  // Aggregated metrics
  const totalBorrowed = loans.reduce(
    (sum, l) => sum + Number(l.outstandingAmount || l.principalAmount || 0),
    0
  );
  const activeLoans = loans.filter((l) => l.status === "ACTIVE");
  const nextEmiSum = activeLoans.reduce((sum, l) => sum + Number(l.emiAmount || 0), 0);

  return (
    <>
      {/* Top Header */}
      <div className="customer-page-header">
        <div>
          <div className="customer-eyebrow">PERSONAL BANKING · CREDIT HUB</div>
          <h1>Loans & Line of Credit</h1>
          <p>
            Instant personal and consumer credit, transparent EMI schedules, and flexible
            repayments.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="secondary-btn customer-refresh"
            onClick={fetchData}
            disabled={loading}
            title="Refresh loan data"
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KYC Alert or Eligibility Strip */}
      <section className="customer-welcome-strip">
        <div>
          <span className="customer-welcome-label">CREDIT FACILITY ELIGIBILITY</span>
          <h2>
            {isKycVerified
              ? "Pre-Approved Credit Ready to Access"
              : "KYC Verification Needed for Instant Disbursement"}
          </h2>
          <p>
            {isKycVerified
              ? "Your profile is verified. Submit your application below to receive instant risk evaluation and swift disbursement."
              : "Your identity details are under review. You can apply and check credit scores; final disbursement will be released upon KYC approval."}
          </p>
        </div>
        <div className="customer-kyc-summary">
          <span className={`customer-status-pill ${isKycVerified ? "verified" : "pending"}`}>
            {customerPortal?.kycStatus || "PENDING"}
          </span>
          <span>Verification Status</span>
        </div>
      </section>

      {/* Top Metric Cards */}
      <section className="customer-metric-grid" aria-label="Loan metrics">
        <article className="customer-metric-card customer-metric-primary">
          <div className="customer-metric-top">
            <span>Outstanding Balance</span>
            <Landmark size={18} />
          </div>
          <strong>{money(totalBorrowed)}</strong>
          <small>Across {loans.length} active loan{loans.length === 1 ? "" : "s"}</small>
        </article>

        <article className="customer-metric-card">
          <div className="customer-metric-top">
            <span>Monthly EMI Obligations</span>
            <CreditCard size={18} />
          </div>
          <strong>{money(nextEmiSum)}</strong>
          <small>Next due installment sum</small>
        </article>

        <article className="customer-metric-card">
          <div className="customer-metric-top">
            <span>Active Facilities</span>
            <ShieldCheck size={18} />
          </div>
          <strong className="customer-metric-status">{activeLoans.length}</strong>
          <small>{loans.length - activeLoans.length} closed / pending</small>
        </article>

        <article className="customer-metric-card">
          <div className="customer-metric-top">
            <span>Total Applications</span>
            <FileText size={18} />
          </div>
          <strong>{applications.length}</strong>
          <small>Credit requests on file</small>
        </article>
      </section>

      {/* Navigation Tabs */}
      <div className="tabs-container loans-nav-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === "apply" ? "active" : ""}`}
          onClick={() => setActiveTab("apply")}
        >
          <PlusCircle size={15} />
          <span>Apply for Loan</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "loans" ? "active" : ""}`}
          onClick={() => setActiveTab("loans")}
        >
          <Landmark size={15} />
          <span>My Loans & Schedules</span>
          <span className="tab-count">{loans.length}</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "applications" ? "active" : ""}`}
          onClick={() => setActiveTab("applications")}
        >
          <Clock size={15} />
          <span>My Applications</span>
          <span className="tab-count">{applications.length}</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "calculator" ? "active" : ""}`}
          onClick={() => setActiveTab("calculator")}
        >
          <Calculator size={15} />
          <span>EMI Calculator</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: APPLY FOR A LOAN */}
      {/* ========================================================================= */}
      {activeTab === "apply" && (
        <div className="customer-loans-layout">
          {/* Left: Application Form */}
          <section className="customer-section">
            <div className="customer-section-heading">
              <div>
                <span className="customer-eyebrow">DIGITAL UNDERWRITING</span>
                <h3>Loan Application Form</h3>
              </div>
              <span className="customer-status-pill verified">INSTANT EVALUATION</span>
            </div>

            <form onSubmit={handleSubmitApplication} className="customer-loan-form">
              {/* Customer Profile Readonly Banner */}
              <div className="customer-applicant-badge">
                <div>
                  <small className="customer-badge-sub">
                    APPLICANT NAME & PROFILE
                  </small>
                  <div className="customer-badge-title">
                    {customerPortal?.name || auth?.username || "Authenticated Customer"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <small className="customer-badge-sub">
                    CUSTOMER ID
                  </small>
                  <div className="customer-badge-id">
                    {customerId ? `CUST-${String(customerId).slice(0, 8).toUpperCase()}` : (auth?.username ? `CUST-${auth.username.toUpperCase()}` : "N/A")}
                  </div>
                </div>
              </div>

              {/* Requested Amount */}
              <label>
                <span>Requested Loan Amount (₹)</span>
                <input
                  type="number"
                  name="requestedAmount"
                  min="1000"
                  max="10000000"
                  step="1000"
                  required
                  value={formData.requestedAmount}
                  onChange={(e) => setFormData({ ...formData, requestedAmount: e.target.value })}
                  placeholder="e.g. 50000"
                />
              </label>

              {/* Quick Amount Chips */}
              <div className="loan-quick-chips">
                {quickAmounts.map((amt) => {
                  const isSelected = formData.requestedAmount === String(amt);
                  return (
                    <button
                      key={amt}
                      type="button"
                      className={`loan-chip-btn ${isSelected ? "active" : ""}`}
                      onClick={() => setFormData({ ...formData, requestedAmount: String(amt) })}
                    >
                      ₹{(amt / 1000).toLocaleString()}k
                    </button>
                  );
                })}
              </div>

              {/* Tenure & Employment */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label>
                  <span>Tenure (Months)</span>
                  <select
                    name="tenureMonths"
                    value={formData.tenureMonths}
                    onChange={(e) => setFormData({ ...formData, tenureMonths: e.target.value })}
                  >
                    <option value="6">6 Months (0.5 Year)</option>
                    <option value="12">12 Months (1 Year)</option>
                    <option value="24">24 Months (2 Years)</option>
                    <option value="36">36 Months (3 Years)</option>
                    <option value="48">48 Months (4 Years)</option>
                    <option value="60">60 Months (5 Years)</option>
                  </select>
                </label>

                <label>
                  <span>Employment Type</span>
                  <select
                    name="employmentType"
                    value={formData.employmentType}
                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                  >
                    <option value="SALARIED">Salaried Employee</option>
                    <option value="SELF_EMPLOYED">Self-Employed Professional</option>
                    <option value="BUSINESS">Business Owner</option>
                    <option value="OTHER">Freelancer / Other</option>
                  </select>
                </label>
              </div>

              {/* Income & Existing Obligations */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label>
                  <span>Annual Income (₹)</span>
                  <input
                    type="number"
                    name="annualIncome"
                    min="0"
                    step="1000"
                    required
                    value={formData.annualIncome}
                    onChange={(e) => setFormData({ ...formData, annualIncome: e.target.value })}
                    placeholder="e.g. 600000"
                  />
                </label>

                <label>
                  <span>Existing Monthly EMIs (₹)</span>
                  <input
                    type="number"
                    name="existingObligations"
                    min="0"
                    step="1000"
                    value={formData.existingObligations}
                    onChange={(e) => setFormData({ ...formData, existingObligations: e.target.value })}
                    placeholder="0"
                  />
                </label>
              </div>

              {/* Loan Purpose */}
              <label>
                <span>Loan Purpose</span>
                <select
                  name="purpose"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                >
                  <option value="Personal Loan">Personal Loan / Emergency</option>
                  <option value="Home Improvement">Home Renovation & Improvement</option>
                  <option value="Education">Education & Higher Studies</option>
                  <option value="Vehicle Purchase">Vehicle / Auto Loan</option>
                  <option value="Business Expansion">Business Working Capital</option>
                  <option value="Medical">Medical Expenses</option>
                  <option value="Debt Consolidation">Debt Consolidation</option>
                </select>
              </label>

              {/* Submit CTA */}
              <button
                type="submit"
                className="primary-btn customer-loan-submit-btn"
                disabled={submitting || !formData.requestedAmount || Number(formData.requestedAmount) <= 0 || !formData.annualIncome || Number(formData.annualIncome) <= 0}
                style={{ marginTop: "12px", minHeight: "44px" }}
              >
                {submitting ? (
                  <span>Evaluating Credit Risk...</span>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Submit Application & Check Eligibility</span>
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Right: Real-time Live Estimate & Assessment Result */}
          <div style={{ display: "grid", gap: "20px", alignContent: "start" }}>
            {/* Live EMI Preview Card */}
            <section className="customer-section live-estimate-card">
              <div className="customer-section-heading">
                <div>
                  <span className="customer-eyebrow">LIVE ESTIMATE</span>
                  <h3>Estimated Monthly Installment</h3>
                </div>
                <Percent size={18} className="live-estimate-icon" />
              </div>

              <div style={{ margin: "14px 0", textAlign: "center" }}>
                <small className="live-estimate-sub">Estimated EMI</small>
                <div className="live-estimate-amount">
                  {money(liveEstimate.emi)}
                  <span className="live-estimate-unit">
                    /mo
                  </span>
                </div>
                <small className="live-estimate-sub">
                  Benchmark Rate: 8.5% p.a. · {formData.tenureMonths} Months
                </small>
              </div>

              <div className="live-estimate-breakdown">
                <div>
                  <span className="live-estimate-sub">Total Interest</span>
                  <div className="live-estimate-val">
                    {money(liveEstimate.totalInterest)}
                  </div>
                </div>
                <div>
                  <span className="live-estimate-sub">Total Repayment</span>
                  <div className="live-estimate-val">
                    {money(liveEstimate.totalPayable)}
                  </div>
                </div>
              </div>
            </section>

            {/* Assessment Feedback Card if submitted */}
            {assessmentResult && (
              <CreditAssessmentCard
                score={assessmentResult.score}
                decision={assessmentResult.decision}
                reason={assessmentResult.reason}
                rate={assessmentResult.rate}
              />
            )}

            {createdApplication && (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "10px",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                }}
              >
                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                  <CheckCircle2 size={18} color="#10b981" />
                  <strong style={{ color: "#10b981" }}>Application Registered</strong>
                </div>
                <p style={{ margin: "0 0 10px", fontSize: "12px", color: "var(--text-secondary, #aebbd0)" }}>
                  Your reference ID is <strong>APP-{String(createdApplication.id).slice(0, 8).toUpperCase()}</strong>.
                  Our automated credit engine has received your application.
                </p>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ width: "100%", fontSize: "12px" }}
                  onClick={() => setActiveTab("applications")}
                >
                  View in My Applications
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MY LOANS & SCHEDULES */}
      {/* ========================================================================= */}
      {activeTab === "loans" && (
        <section className="customer-section">
          <div className="customer-section-heading">
            <div>
              <span className="customer-eyebrow">CREDIT PORTFOLIO</span>
              <h3>Active Loans & Disbursed Facilities</h3>
            </div>
            <button
              type="button"
              className="primary-btn"
              style={{ fontSize: "12px", minHeight: "32px", padding: "6px 12px" }}
              onClick={() => setActiveTab("apply")}
            >
              <PlusCircle size={14} />
              <span>Apply for New Loan</span>
            </button>
          </div>

          {loans.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <Landmark size={44} style={{ color: "var(--text-secondary, #6f829b)", margin: "0 auto 12px" }} />
              <h4 style={{ color: "var(--text-primary, #edf3fb)", margin: "0 0 6px" }}>No Loans Originated Yet</h4>
              <p style={{ color: "var(--text-secondary, #8fa3bd)", fontSize: "13px", maxWidth: "400px", margin: "0 auto 16px" }}>
                You currently have no active or historical loans with FinCore. Apply today for instant approval and flexible EMI terms.
              </p>
              <button
                type="button"
                className="primary-btn"
                onClick={() => setActiveTab("apply")}
                style={{ minHeight: "36px" }}
              >
                Apply for Your First Loan
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "16px" }}>
              {loans.map((loan) => {
                const isExpanded = expandedLoanId === loan.id;
                const isPrepayingThis = prepayLoanId === loan.id;
                const schedule = loanSchedules[loan.id] || [];

                return (
                  <div key={loan.id} className="portal-loan-item">
                    {/* Loan Summary Bar */}
                    <div
                      style={{
                        padding: "16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "14px",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#82b6ff", fontSize: "14px" }}>
                            LN-{String(loan.id).slice(0, 8).toUpperCase()}
                          </span>
                          <span
                            className={`customer-status-pill ${
                              loan.status === "ACTIVE"
                                ? "verified"
                                : loan.status === "CLOSED"
                                ? "muted"
                                : "pending"
                            }`}
                          >
                            {loan.status === "PENDING_DISBURSEMENT" ? "PENDING DISBURSEMENT" : loan.status}
                          </span>
                        </div>
                        <small style={{ color: "var(--text-secondary, #8fa3bd)", fontSize: "11px", marginTop: "4px", display: "block" }}>
                          Tenure: {loan.tenureMonths} Months · Rate: {(Number(loan.interestRate || 0.1) * 100).toFixed(1)}% p.a.
                        </small>
                        <div style={{ display: "flex", gap: "10px", marginTop: "6px", fontSize: "11px", color: "var(--text-secondary, #8fa3bd)", flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Calendar size={12} color="#60a5fa" />
                            <span>Start: <strong style={{ color: "var(--text-primary, #edf3fb)" }}>{formatDate(loan.startDate || loan.disbursedAt)}</strong></span>
                          </span>
                          <span>·</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <Calendar size={12} color="#a78bfa" />
                            <span>Maturity: <strong style={{ color: "var(--text-primary, #edf3fb)" }}>{formatDate(loan.endDate)}</strong></span>
                          </span>
                          {loan.startDate && (
                            <>
                              <span>·</span>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#10b981" }}>
                                <Clock size={12} />
                                <span>1st Due: <strong>{formatDate(loan.startDate)}</strong></span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Financials */}
                      <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
                        <div>
                          <small style={{ color: "var(--text-secondary, #8fa3bd)", fontSize: "10px", display: "block" }}>
                            PRINCIPAL
                          </small>
                          <strong style={{ color: "var(--text-primary, #edf3fb)", fontSize: "14px" }}>
                            {money(loan.principalAmount)}
                          </strong>
                        </div>
                        <div>
                          <small style={{ color: "var(--text-secondary, #8fa3bd)", fontSize: "10px", display: "block" }}>
                            OUTSTANDING
                          </small>
                          <strong style={{ color: "#ef4444", fontSize: "14px" }}>
                            {money(loan.outstandingAmount)}
                          </strong>
                        </div>
                        <div>
                          <small style={{ color: "var(--text-secondary, #8fa3bd)", fontSize: "10px", display: "block" }}>
                            MONTHLY EMI
                          </small>
                          <strong style={{ color: "#10b981", fontSize: "14px" }}>
                            {money(loan.emiAmount)}
                          </strong>
                        </div>
                        <div>
                          <small style={{ color: "var(--text-secondary, #8fa3bd)", fontSize: "10px", display: "block" }}>
                            FIRST DUE DATE
                          </small>
                          <strong style={{ color: "#60a5fa", fontSize: "13px" }}>
                            {formatDate(loan.startDate || loan.disbursedAt)}
                          </strong>
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: "8px" }}>
                          {loan.status === "ACTIVE" && (
                            <button
                              type="button"
                              className="secondary-btn"
                              style={{ fontSize: "11px", minHeight: "32px", padding: "4px 10px" }}
                              onClick={() => setPrepayLoanId(isPrepayingThis ? null : loan.id)}
                            >
                              Prepay
                            </button>
                          )}
                          <button
                            type="button"
                            className="secondary-btn"
                            style={{ fontSize: "11px", minHeight: "32px", padding: "4px 10px" }}
                            onClick={() => toggleSchedule(loan.id)}
                          >
                            {isExpanded ? (
                              <>
                                <span>Hide Schedule</span>
                                <ChevronUp size={12} />
                              </>
                            ) : (
                              <>
                                <span>View Schedule</span>
                                <ChevronDown size={12} />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Prepayment Form Subpanel */}
                    {isPrepayingThis && (
                      <div
                        style={{
                          padding: "16px",
                          background: "var(--bg-tertiary, #151f2c)",
                          borderTop: "1px solid var(--border-color, #283446)",
                        }}
                      >
                        <form
                          onSubmit={(e) => handlePrepaySubmit(e, loan.id)}
                          style={{ display: "grid", gap: "12px" }}
                        >
                          <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
                            {customerAccounts.length > 0 && (
                              <label style={{ fontSize: "12px", color: "var(--text-primary, #edf3fb)", display: "flex", alignItems: "center", gap: "8px" }}>
                                <span>Debit From Account:</span>
                                <select
                                  value={selectedDebitAccountId || (customerAccounts[0]?.id || "")}
                                  onChange={(e) => setSelectedDebitAccountId(e.target.value)}
                                  style={{
                                    padding: "6px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid var(--border-color, #283446)",
                                    background: "var(--card-bg, #0d141e)",
                                    color: "var(--text-primary, #edf3fb)",
                                    fontSize: "12px",
                                    minWidth: "220px",
                                  }}
                                >
                                  {customerAccounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                      {acc.accountNumber || String(acc.id).slice(0, 8)} (Balance: {money(acc.balance || 0)})
                                    </option>
                                  ))}
                                </select>
                              </label>
                            )}

                            <label style={{ fontSize: "12px", color: "var(--text-primary, #edf3fb)", display: "flex", alignItems: "center", gap: "8px" }}>
                              <span>Amount (₹):</span>
                              <input
                                type="number"
                                min="100"
                                max={loan.outstandingAmount}
                                step="100"
                                required
                                value={prepayAmount}
                                onChange={(e) => setPrepayAmount(e.target.value)}
                                placeholder="e.g. 10000"
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  border: "1px solid var(--border-color, #283446)",
                                  background: "var(--card-bg, #0d141e)",
                                  color: "var(--text-primary, #edf3fb)",
                                  fontSize: "12px",
                                  minWidth: "140px",
                                }}
                              />
                            </label>

                            <button
                              type="submit"
                              className="primary-btn"
                              disabled={prepaying || !prepayAmount || Number(prepayAmount) <= 0}
                              style={{ minHeight: "32px", fontSize: "12px", padding: "6px 16px" }}
                            >
                              {prepaying ? "Deducting Funds..." : "Confirm & Pay"}
                            </button>
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() => {
                                setPrepayLoanId(null);
                                setPrepayAmount("");
                              }}
                              style={{ minHeight: "32px", fontSize: "12px" }}
                            >
                              Cancel
                            </button>
                          </div>
                          {Number(prepayAmount) > 0 && (
                            <small style={{ color: "#60a5fa", fontSize: "11px" }}>
                              ℹ {money(Number(prepayAmount))} will be immediately withdrawn from your bank account and applied against this loan facility.
                            </small>
                          )}
                        </form>
                      </div>
                    )}

                    {/* Expandable Repayment Schedule */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: "16px",
                          borderTop: "1px solid var(--border-color, #283446)",
                          background: "var(--bg-secondary, #0c121b)",
                        }}
                      >
                        <h4 style={{ fontSize: "13px", margin: "0 0 12px", color: "var(--text-primary, #edf3fb)" }}>
                          Amortisation Schedule & Installment Tracking
                        </h4>
                        {loadingSchedule ? (
                          <div style={{ textAlign: "center", padding: "20px", color: "var(--text-secondary, #8fa3bd)" }}>
                            Loading schedule installments...
                          </div>
                        ) : (
                          <EmiScheduleTable schedule={schedule} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MY APPLICATIONS */}
      {/* ========================================================================= */}
      {activeTab === "applications" && (
        <section className="customer-section">
          <div className="customer-section-heading">
            <div>
              <span className="customer-eyebrow">APPLICATION TRACKER</span>
              <h3>Submitted Loan Applications</h3>
            </div>
            <button
              type="button"
              className="primary-btn"
              style={{ fontSize: "12px", minHeight: "32px", padding: "6px 12px" }}
              onClick={() => setActiveTab("apply")}
            >
              <PlusCircle size={14} />
              <span>Apply for New Loan</span>
            </button>
          </div>

          {applications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <Clock size={44} style={{ color: "var(--text-secondary, #6f829b)", margin: "0 auto 12px" }} />
              <h4 style={{ color: "var(--text-primary, #edf3fb)", margin: "0 0 6px" }}>No Loan Applications</h4>
              <p style={{ color: "var(--text-secondary, #8fa3bd)", fontSize: "13px", maxWidth: "400px", margin: "0 auto 16px" }}>
                You have not submitted any credit applications yet. Submit an application in under 2 minutes.
              </p>
              <button
                type="button"
                className="primary-btn"
                onClick={() => setActiveTab("apply")}
                style={{ minHeight: "36px" }}
              >
                Start an Application
              </button>
            </div>
          ) : (
            <div className="customer-transactions-wrap">
              <table className="customer-transactions-table">
                <thead>
                  <tr>
                    <th>Application ID</th>
                    <th>Date</th>
                    <th>Requested Amount</th>
                    <th>Tenure</th>
                    <th>Purpose</th>
                    <th>Credit Score</th>
                    <th>Status</th>
                    <th>Notes / Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => {
                    const score = app.creditScore || "—";
                    const statusClass =
                      app.status === "APPROVED" || app.status === "DISBURSED"
                        ? "status-paid"
                        : app.status === "REJECTED"
                        ? "status-overdue"
                        : "status-pending";

                    return (
                      <tr key={app.id}>
                        <td style={{ fontFamily: "monospace", fontWeight: 700, color: "#82b6ff" }}>
                          APP-{String(app.id).slice(0, 8).toUpperCase()}
                        </td>
                        <td>
                          {formatDate(app.createdAt)}
                        </td>
                        <td>
                          <strong>{money(app.requestedAmount)}</strong>
                        </td>
                        <td>{app.tenureMonths} Months</td>
                        <td>{app.purpose || "General Purpose"}</td>
                        <td>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 700,
                              background:
                                Number(score) >= 700
                                  ? "rgba(16, 185, 129, 0.2)"
                                  : Number(score) >= 600
                                  ? "rgba(245, 158, 11, 0.2)"
                                  : "rgba(239, 68, 68, 0.2)",
                              color:
                                Number(score) >= 700
                                  ? "#10b981"
                                  : Number(score) >= 600
                                  ? "#f59e0b"
                                  : "#ef4444",
                            }}
                          >
                            {score}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${statusClass}`}>
                            {app.status}
                          </span>
                        </td>
                        <td style={{ fontSize: "11px", color: "var(--text-secondary, #8fa3bd)" }}>
                          {app.rejectionReason || (app.status === "APPROVED" ? "Approved by Underwriter" : "Under review")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: INTERACTIVE EMI CALCULATOR */}
      {/* ========================================================================= */}
      {activeTab === "calculator" && (
        <section className="customer-section">
          <div className="customer-section-heading">
            <div>
              <span className="customer-eyebrow">PLAN YOUR FINANCES</span>
              <h3>Interactive Loan & EMI Calculator</h3>
            </div>
            <Calculator size={18} style={{ color: "#82b6ff" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(300px, 1fr)", gap: "24px", marginTop: "10px" }}>
            {/* Sliders */}
            <div style={{ display: "grid", gap: "20px" }}>
              {/* Amount Slider */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary, #8fa3bd)" }}>
                    Loan Amount
                  </span>
                  <strong style={{ color: "var(--text-primary, #edf3fb)" }}>
                    {money(calcAmount)}
                  </strong>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="2500000"
                  step="10000"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--primary-color, #2563eb)" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--text-secondary, #6f829b)" }}>
                  <span>₹10,000</span>
                  <span>₹25,00,000</span>
                </div>
              </div>

              {/* Interest Rate Slider */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary, #8fa3bd)" }}>
                    Interest Rate (% p.a.)
                  </span>
                  <strong style={{ color: "var(--text-primary, #edf3fb)" }}>
                    {calcRate}%
                  </strong>
                </div>
                <input
                  type="range"
                  min="6"
                  max="24"
                  step="0.25"
                  value={calcRate}
                  onChange={(e) => setCalcRate(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--primary-color, #2563eb)" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--text-secondary, #6f829b)" }}>
                  <span>6% (Prime)</span>
                  <span>24% (Unsecured)</span>
                </div>
              </div>

              {/* Tenure Slider */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary, #8fa3bd)" }}>
                    Tenure (Months)
                  </span>
                  <strong style={{ color: "var(--text-primary, #edf3fb)" }}>
                    {calcTenure} Months ({(calcTenure / 12).toFixed(1)} yrs)
                  </strong>
                </div>
                <input
                  type="range"
                  min="6"
                  max="84"
                  step="6"
                  value={calcTenure}
                  onChange={(e) => setCalcTenure(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--primary-color, #2563eb)" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--text-secondary, #6f829b)" }}>
                  <span>6 Months</span>
                  <span>84 Months (7 Years)</span>
                </div>
              </div>

              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    requestedAmount: String(calcAmount),
                    tenureMonths: String(calcTenure),
                  }));
                  setActiveTab("apply");
                }}
                style={{ minHeight: "40px" }}
              >
                Apply with this Calculation
              </button>
            </div>

            {/* Visual Calculation Result */}
            <div className="portal-calc-card">
              <small className="portal-calc-sub">
                YOUR ESTIMATED MONTHLY EMI
              </small>
              <div className="portal-calc-amount">
                {money(calcResult.emi)}
              </div>
              <small className="portal-calc-sub" style={{ marginBottom: "20px" }}>
                Payable monthly for {calcTenure} installments
              </small>

              {/* Progress bar ratio */}
              <div
                style={{
                  height: "8px",
                  borderRadius: "999px",
                  background: "#3b82f6",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    width: `${Math.round((calcAmount / (calcResult.total || 1)) * 100)}%`,
                    background: "#10b981",
                  }}
                  title="Principal Proportion"
                />
                <div
                  style={{
                    width: `${Math.round((calcResult.interest / (calcResult.total || 1)) * 100)}%`,
                    background: "#f59e0b",
                  }}
                  title="Interest Proportion"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "12px" }}>
                <div className="portal-calc-metric">
                  <div style={{ color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                    Principal
                  </div>
                  <strong className="portal-calc-metric-val">
                    {money(calcAmount)}
                  </strong>
                </div>

                <div className="portal-calc-metric">
                  <div style={{ color: "#f59e0b", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
                    Interest
                  </div>
                  <strong className="portal-calc-metric-val">
                    {money(calcResult.interest)}
                  </strong>
                </div>
              </div>

              <div className="portal-calc-total">
                <span className="portal-calc-total-label">Total Amount Payable:</span>
                <strong className="portal-calc-total-val">{money(calcResult.total)}</strong>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

export default PortalLoans;
