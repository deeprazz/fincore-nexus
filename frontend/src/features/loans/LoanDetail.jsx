import React, { useState, useEffect, useCallback } from "react";
import { getLoan, prepayLoan, forecloseLoan } from "../../api/loans";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { money } from "../../utils/money";
import { formatDate } from "../../utils/date";
import { DisbursementSagaTimeline } from "./DisbursementSagaTimeline";
import { Modal } from "../../components/ui/Modal";
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  AlertCircle,
  FileText,
  CreditCard,
  Ban,
} from "lucide-react";

export function LoanDetail({
  loanId,
  loan: initialLoan,
  onBack,
  onViewSchedule,
  className = "",
}) {
  const { auth } = useAuth();
  const { setError, setSuccess } = useToast();

  const [loan, setLoan] = useState(initialLoan || null);
  const [loading, setLoading] = useState(!initialLoan && !!loanId);

  // Prepay Modal state
  const [isPrepayOpen, setIsPrepayOpen] = useState(false);
  const [prepayAmount, setPrepayAmount] = useState("");
  const [prepaying, setPrepaying] = useState(false);

  // Foreclose Modal state
  const [isForecloseOpen, setIsForecloseOpen] = useState(false);
  const [foreclosing, setForeclosing] = useState(false);

  const fetchLoanData = useCallback(async () => {
    const targetId = loanId || initialLoan?.id;
    if (!targetId) return;
    setLoading(true);
    try {
      const data = await getLoan(targetId, auth);
      setLoan(data);
    } catch (err) {
      setError(err.message || "Failed to load loan details");
    } finally {
      setLoading(false);
    }
  }, [loanId, initialLoan?.id, auth, setError]);

  useEffect(() => {
    if (!initialLoan && loanId) {
      fetchLoanData();
    } else if (initialLoan) {
      setLoan(initialLoan);
    }
  }, [loanId, initialLoan, fetchLoanData]);

  const handlePrepay = async (e) => {
    e.preventDefault();
    const amountNum = Number(prepayAmount);
    if (!amountNum || amountNum <= 0) {
      setError("Please enter a valid prepayment amount greater than 0");
      return;
    }

    setPrepaying(true);
    try {
      await prepayLoan(loan.id, amountNum, auth);
      setSuccess(`Prepayment of ${money(amountNum)} recorded successfully.`);
      setIsPrepayOpen(false);
      setPrepayAmount("");
      fetchLoanData();
    } catch (err) {
      setError(err.message || "Failed to process loan prepayment");
    } finally {
      setPrepaying(false);
    }
  };

  const handleForeclose = async () => {
    setForeclosing(true);
    try {
      await forecloseLoan(loan.id, auth);
      setSuccess("Loan successfully foreclosed and closed.");
      setIsForecloseOpen(false);
      fetchLoanData();
    } catch (err) {
      setError(err.message || "Failed to foreclose loan");
    } finally {
      setForeclosing(false);
    }
  };

  if (loading) {
    return (
      <div className="panel">
        <div className="empty-state">Loading loan information...</div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="panel">
        <div className="empty-state">Loan not found.</div>
        {onBack && (
          <button type="button" className="secondary-button" onClick={onBack}>
            <ArrowLeft size={16} /> Go Back
          </button>
        )}
      </div>
    );
  }

  const interestRateDisplay =
    loan.interestRate != null
      ? loan.interestRate > 1
        ? `${loan.interestRate}%`
        : `${(loan.interestRate * 100).toFixed(1)}%`
      : "10.0%";

  const isClosed =
    loan.status === "CLOSED" ||
    loan.status === "PAID_OFF" ||
    loan.status === "FORECLOSED";

  return (
    <div className={`loan-detail-view ${className}`}>
      {/* Top action header */}
      <div className="detail-top-nav">
        {onBack && (
          <button type="button" className="secondary-button" onClick={onBack}>
            <ArrowLeft size={16} /> Back to Loans
          </button>
        )}
        <div className="detail-actions-right">
          {onViewSchedule && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => onViewSchedule(loan)}
            >
              <FileText size={16} /> EMI Amortisation Schedule
            </button>
          )}
          {!isClosed && (
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsPrepayOpen(true)}
              >
                <DollarSign size={16} /> Prepay Loan
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => setIsForecloseOpen(true)}
              >
                <Ban size={16} /> Foreclose Loan
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Loan Overview Card */}
      <div className="panel loan-summary-panel">
        <div className="panel-heading">
          <div>
            <h2>Loan Account #{String(loan.id).substring(0, 8)}</h2>
            <p>
              Customer: <strong>{loan.customerId ? String(loan.customerId).substring(0, 8) + "..." : "N/A"}</strong>
              {loan.accountId && (
                <> · Disbursed To Account: <strong>{String(loan.accountId).substring(0, 8)}...</strong></>
              )}
            </p>
          </div>
          <div className="loan-badges-header">
            <span className={`status-badge status-${String(loan.status || "ACTIVE").toLowerCase()}`}>
              {String(loan.status || "ACTIVE").replaceAll("_", " ")}
            </span>
            <span className={`status-badge status-${String(loan.npaCategory || "STANDARD").toLowerCase()}`}>
              {String(loan.npaCategory || "STANDARD").replaceAll("_", " ")}
            </span>
          </div>
        </div>

        {/* Highlight Metrics */}
        <div className="loan-metrics-grid">
          <div className="loan-metric-box">
            <span className="metric-title">Principal Sanctioned</span>
            <span className="metric-val">{money(loan.principalAmount || loan.principal || 0)}</span>
            <span className="metric-sub">Tenure: {loan.tenureMonths} Months</span>
          </div>
          <div className="loan-metric-box">
            <span className="metric-title">Outstanding Balance</span>
            <span className="metric-val text-primary">
              {money(loan.outstandingAmount || loan.outstandingBalance || 0)}
            </span>
            <span className="metric-sub">
              Days Past Due: <strong>{loan.daysPastDue || 0}d</strong>
            </span>
          </div>
          <div className="loan-metric-box">
            <span className="metric-title">Monthly EMI</span>
            <span className="metric-val text-success">{money(loan.emiAmount || 0)}</span>
            <span className="metric-sub">Due monthly</span>
          </div>
          <div className="loan-metric-box">
            <span className="metric-title">Interest Rate</span>
            <span className="metric-val">{interestRateDisplay}</span>
            <span className="metric-sub">Annual reducing rate</span>
          </div>
        </div>

        {/* Loan Dates & Info Grid */}
        <div className="loan-dates-grid">
          <div className="date-item">
            <Calendar size={16} className="text-muted" />
            <div>
              <span className="muted-label">Disbursed Date</span>
              <strong>{formatDate(loan.disbursedAt || loan.startDate)}</strong>
            </div>
          </div>
          <div className="date-item">
            <Calendar size={16} className="text-muted" />
            <div>
              <span className="muted-label">Maturity / End Date</span>
              <strong>{formatDate(loan.endDate)}</strong>
            </div>
          </div>
          <div className="date-item">
            <CreditCard size={16} className="text-muted" />
            <div>
              <span className="muted-label">Application ID</span>
              <strong className="font-mono">{loan.applicationId ? String(loan.applicationId).substring(0, 8) + "..." : "Direct"}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Disbursement Saga Timeline */}
      <div className="panel mt-4">
        <DisbursementSagaTimeline
          status={loan.status}
          timestamps={{
            application_submitted: loan.createdAt,
            approved: loan.disbursedAt,
            disbursed: loan.disbursedAt,
            active: loan.startDate,
          }}
        />
      </div>

      {/* Prepay Modal */}
      <Modal
        isOpen={isPrepayOpen}
        onClose={() => setIsPrepayOpen(false)}
        title="Prepay Loan Amount"
      >
        <form onSubmit={handlePrepay} className="modal-form">
          <p className="modal-description">
            Make an ad-hoc principal prepayment. This reduces total outstanding interest and tenure.
          </p>
          <div className="form-field">
            <label htmlFor="prepayAmount">Prepayment Amount (₹)</label>
            <input
              id="prepayAmount"
              type="number"
              min="100"
              max={loan.outstandingAmount || loan.outstandingBalance || 10000000}
              step="100"
              placeholder="e.g. 50000"
              value={prepayAmount}
              onChange={(e) => setPrepayAmount(e.target.value)}
              required
              disabled={prepaying}
            />
            <span className="field-help">
              Current Outstanding: {money(loan.outstandingAmount || loan.outstandingBalance || 0)}
            </span>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setIsPrepayOpen(false)}
              disabled={prepaying}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={prepaying}
            >
              {prepaying ? "Processing Prepayment..." : "Confirm Prepayment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Foreclose Modal */}
      <Modal
        isOpen={isForecloseOpen}
        onClose={() => setIsForecloseOpen(false)}
        title="Confirm Loan Foreclosure"
      >
        <div className="modal-form">
          <div className="warning-banner">
            <AlertCircle size={20} className="text-danger" />
            <div>
              <strong>Action cannot be undone</strong>
              <p>
                Foreclosing this loan will immediately settle the entire remaining outstanding balance of{" "}
                <strong>{money(loan.outstandingAmount || loan.outstandingBalance || 0)}</strong> and close the loan account.
              </p>
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setIsForecloseOpen(false)}
              disabled={foreclosing}
            >
              Cancel
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={handleForeclose}
              disabled={foreclosing}
            >
              {foreclosing ? "Foreclosing..." : "Foreclose and Close Loan"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default LoanDetail;
