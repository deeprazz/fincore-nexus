import React, { useState, useEffect, useCallback } from "react";
import { getLoan, getEmiSchedule } from "../../api/loans";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { money } from "../../utils/money";
import { formatDate } from "../../utils/date";
import { EmiScheduleTable } from "./EmiScheduleTable";
import { ArrowLeft, Calendar, FileText, Download } from "lucide-react";

export function EmiSchedulePage({
  loanId,
  loan: initialLoan,
  onBack,
  className = "",
}) {
  const { auth } = useAuth();
  const { setError } = useToast();

  const [loan, setLoan] = useState(initialLoan || null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadScheduleData = useCallback(async () => {
    const targetId = loanId || initialLoan?.id;
    if (!targetId) return;

    setLoading(true);
    try {
      const [loanData, scheduleData] = await Promise.all([
        !initialLoan ? getLoan(targetId, auth) : Promise.resolve(initialLoan),
        getEmiSchedule(targetId, auth),
      ]);
      setLoan(loanData);
      setSchedule(Array.isArray(scheduleData) ? scheduleData : []);
    } catch (err) {
      setError(err.message || "Failed to load EMI schedule");
    } finally {
      setLoading(false);
    }
  }, [loanId, initialLoan, auth, setError]);

  useEffect(() => {
    loadScheduleData();
  }, [loadScheduleData]);

  const handleExportCsv = () => {
    if (!schedule || schedule.length === 0) return;
    const headers = [
      "InstallmentNumber",
      "DueDate",
      "EmiAmount",
      "PrincipalComponent",
      "InterestComponent",
      "OutstandingBalance",
      "Status",
      "Penalty",
    ];
    const rows = schedule.map((s, idx) => [
      s.installmentNumber || idx + 1,
      s.dueDate || "",
      s.emiAmount || 0,
      s.principalComponent || 0,
      s.interestComponent || 0,
      s.outstandingBalance ?? s.outstandingAfter ?? 0,
      s.status || "PENDING",
      s.penalty || 0,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `EMI_Schedule_Loan_${String(loan?.id || loanId || "details").substring(0, 8)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`emi-schedule-page ${className}`}>
      {/* Top Bar */}
      <div className="detail-top-nav">
        {onBack && (
          <button type="button" className="secondary-button" onClick={onBack}>
            <ArrowLeft size={16} /> Back to Loans
          </button>
        )}
        <div className="detail-actions-right">
          <button
            type="button"
            className="secondary-button"
            onClick={handleExportCsv}
            disabled={schedule.length === 0}
          >
            <Download size={16} /> Export Schedule (CSV)
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={loadScheduleData}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="panel loan-summary-panel">
        <div className="panel-heading">
          <div className="panel-title-with-icon">
            <FileText size={20} className="text-primary" />
            <div>
              <h2>EMI Amortisation Schedule</h2>
              <p>
                Loan Account #{loan?.id ? String(loan.id).substring(0, 8) : ""} · 
                Installments: {schedule.length} Total
              </p>
            </div>
          </div>
          {loan && (
            <div className="loan-badges-header">
              <span className={`status-badge status-${String(loan.status || "ACTIVE").toLowerCase()}`}>
                {String(loan.status || "ACTIVE").replaceAll("_", " ")}
              </span>
            </div>
          )}
        </div>

        {loan && (
          <div className="loan-metrics-grid">
            <div className="loan-metric-box">
              <span className="metric-title">Principal</span>
              <span className="metric-val">{money(loan.principalAmount || loan.principal || 0)}</span>
              <span className="metric-sub">Tenure: {loan.tenureMonths} Months</span>
            </div>
            <div className="loan-metric-box">
              <span className="metric-title">Monthly EMI</span>
              <span className="metric-val text-primary">{money(loan.emiAmount || 0)}</span>
              <span className="metric-sub">Principal + Interest</span>
            </div>
            <div className="loan-metric-box">
              <span className="metric-title">Interest Rate</span>
              <span className="metric-val">
                {loan.interestRate != null
                  ? loan.interestRate > 1
                    ? `${loan.interestRate}%`
                    : `${(loan.interestRate * 100).toFixed(1)}%`
                  : "10.0%"}
              </span>
              <span className="metric-sub">Annual reducing</span>
            </div>
            <div className="loan-metric-box">
              <span className="metric-title">Current Outstanding</span>
              <span className="metric-val text-warning">
                {money(loan.outstandingAmount || loan.outstandingBalance || 0)}
              </span>
              <span className="metric-sub">Maturity: {formatDate(loan.endDate)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Table Panel */}
      <div className="panel mt-4">
        <div className="panel-heading">
          <div>
            <h3>Installment Breakdown</h3>
            <p>Monthly principal repayment, interest component, and remaining balance</p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Loading amortization schedule...</div>
        ) : (
          <EmiScheduleTable schedule={schedule} />
        )}
      </div>
    </div>
  );
}

export default EmiSchedulePage;
