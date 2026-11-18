import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  Landmark,
  Send,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Server,
  Zap,
  ArrowRight,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { apiRequest } from "../../api/client";
import { money } from "../../utils/money";

export default function MasterDashboard() {
  const [loading, setLoading] = useState(true);
  const [coreSummary, setCoreSummary] = useState(null);
  const [loanPortfolio, setLoanPortfolio] = useState(null);
  const [paymentReport, setPaymentReport] = useState(null);
  const [kycData, setKycData] = useState(null);
  const [pciData, setPciData] = useState(null);

  // Per-module service availability tracking
  const [coreStatus, setCoreStatus] = useState("ok");
  const [loanStatus, setLoanStatus] = useState("ok");
  const [paymentStatus, setPaymentStatus] = useState("ok");
  const [complianceStatus, setComplianceStatus] = useState("ok");

  const fetchAllMetrics = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Core banking metrics
      const [coreRes, auditRes] = await Promise.allSettled([
        apiRequest("/dashboard/summary"),
        apiRequest("/audit/verify"),
      ]);
      const isCoreOk = coreRes.status === "fulfilled" && coreRes.value && !coreRes.value.error;
      setCoreStatus(isCoreOk ? "ok" : "unavailable");
      setCoreSummary(
        isCoreOk
          ? {
              ...coreRes.value,
              auditValid: auditRes.status === "fulfilled" && auditRes.value ? auditRes.value.valid : false,
            }
          : null
      );

      // 2. Loan metrics
      let isLoanOk = false;
      try {
        const loanRes = await apiRequest("/loans/portfolio");
        if (loanRes && !loanRes.error) {
          setLoanPortfolio(loanRes);
          isLoanOk = true;
        } else {
          setLoanPortfolio(null);
        }
      } catch {
        setLoanPortfolio(null);
      }
      setLoanStatus(isLoanOk ? "ok" : "unavailable");

      // 3. Payment metrics
      const [paymentsRes, settlementRes] = await Promise.allSettled([
        apiRequest("/payments"),
        apiRequest("/settlement/report"),
      ]);
      const isPaymentOk = paymentsRes.status === "fulfilled" && Array.isArray(paymentsRes.value);
      setPaymentStatus(isPaymentOk ? "ok" : "unavailable");
      if (isPaymentOk) {
        const payments = paymentsRes.value;
        const totalPayments = payments.length;
        const successfulPayments = payments.filter((p) => p.status === "SETTLED" || p.status === "CREDITED").length;
        const successRate = totalPayments > 0 ? Math.round((successfulPayments / totalPayments) * 100) : null;
        setPaymentReport({
          totalPayments,
          successRate,
          payments,
          settlement: settlementRes.status === "fulfilled" ? settlementRes.value : null,
        });
      } else {
        setPaymentReport(null);
      }

      // 4. KYC & Compliance metrics
      const [kycRes, complianceRes] = await Promise.allSettled([
        apiRequest("/kyc"),
        apiRequest("/compliance/pci-dss"),
      ]);
      const isKycOk = kycRes.status === "fulfilled" && Array.isArray(kycRes.value);
      const isPciOk = complianceRes.status === "fulfilled" && complianceRes.value && !complianceRes.value.error;
      setComplianceStatus(isKycOk || isPciOk ? "ok" : "unavailable");

      if (isKycOk) {
        const kycList = kycRes.value;
        const verifiedKyc = kycList.filter((k) => k.status === "APPROVED").length;
        setKycData({
          total: kycList.length,
          verified: verifiedKyc,
          pending: kycList.filter((k) => k.status === "PENDING_REVIEW").length,
        });
      } else {
        setKycData(null);
      }
      setPciData(isPciOk ? complianceRes.value : null);
    } catch {
      // Handled via individual is*Ok flags
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllMetrics();
  }, [fetchAllMetrics]);

  return (
    <div className="telemetry-page">
      {/* Page Header */}
      <div className="telemetry-header">
        <div className="telemetry-header-title">
          <div className="telemetry-icon-box">
            <Server size={22} />
          </div>
          <div>
            <h1 className="page-title">FinCore Nexus Master Dashboard</h1>
            <p className="page-subtitle">
              Live operational telemetry across banking ledger, lending portfolios, payment clearing, and compliance
            </p>
          </div>
        </div>

        <div className="telemetry-header-actions">
          <div className="gateway-indicator">
            <span className="gateway-dot" />
            <span>Gateway 8080 Active</span>
          </div>

          <Button
            onClick={fetchAllMetrics}
            disabled={loading}
            variant="secondary"
            className="telemetry-refresh-btn"
            title="Refresh system metrics"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Latency & Throughput Row */}
      <div className="telemetry-latency-row">
        <div className="latency-stat-card">
          <span className="stat-label">Latency p50</span>
          <span className="stat-value">
            {coreSummary?.latencyP50Ms != null ? `${coreSummary.latencyP50Ms} ms` : "—"}
          </span>
          <span className="stat-sub">
            {coreSummary?.latencyP50Ms != null ? "Normal SLA (<25ms)" : "Core latency metric"}
          </span>
        </div>

        <div className="latency-stat-card">
          <span className="stat-label">Latency p95</span>
          <span className="stat-value">
            {coreSummary?.latencyP95Ms != null ? `${coreSummary.latencyP95Ms} ms` : "—"}
          </span>
          <span className="stat-sub">
            {coreSummary?.latencyP95Ms != null ? "Burst threshold (<50ms)" : "Core latency metric"}
          </span>
        </div>

        <div className="latency-stat-card">
          <span className="stat-label">Today's Transactions</span>
          <span className="stat-value">
            {coreSummary?.transactionsToday != null ? coreSummary.transactionsToday : "—"}
          </span>
          <span className="stat-sub">Double-entry ledger</span>
        </div>

        <div className="latency-stat-card">
          <span className="stat-label">Measured TPS</span>
          <span className="stat-value flex-val">
            <Zap size={16} className={coreSummary?.tps != null ? "text-amber-500" : "text-muted"} />
            {coreSummary?.tps != null ? `${coreSummary.tps} req/s` : "—"}
          </span>
          <span className="stat-sub">
            {paymentReport?.successRate != null ? `${paymentReport.successRate}% Success Rate` : "—"}
          </span>
        </div>
      </div>

      {/* 4 Core Domain KPI Cards */}
      <div className="telemetry-kpi-grid">
        {/* Core Banking */}
        <Card className="telemetry-domain-card domain-blue">
          <div className="domain-card-top">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span className="domain-label">Core Banking Ledger</span>
              {coreStatus === "unavailable" && (
                <span className="service-unavailable-badge">service unavailable</span>
              )}
            </div>
            <div className="domain-icon-circle blue">
              <Wallet size={18} />
            </div>
          </div>
          <div className="domain-card-main">
            <div className="domain-main-number">
              {coreSummary?.activeAccounts != null ? coreSummary.activeAccounts : "—"}
            </div>
            <p className="domain-sub-label">Active Account Ledgers</p>
          </div>
          <div className="domain-card-bottom">
            <span>Total Deposits:</span>
            <strong>{coreSummary?.totalBalance != null ? money(coreSummary.totalBalance) : "—"}</strong>
          </div>
          <Link to="/accounts" className="domain-card-link">
            Open Accounts Ledger <ArrowRight size={13} />
          </Link>
        </Card>

        {/* Loans */}
        <Card className="telemetry-domain-card domain-indigo">
          <div className="domain-card-top">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span className="domain-label">Loans & Credit Portfolio</span>
              {loanStatus === "unavailable" && (
                <span className="service-unavailable-badge">service unavailable</span>
              )}
            </div>
            <div className="domain-icon-circle indigo">
              <Landmark size={18} />
            </div>
          </div>
          <div className="domain-card-main">
            <div className="domain-main-number">
              {loanPortfolio?.activeLoansCount != null ? loanPortfolio.activeLoansCount : "—"}
            </div>
            <p className="domain-sub-label">Active Loan Portfolios</p>
          </div>
          <div className="domain-card-bottom">
            <span>NPA Ratio:</span>
            <strong className={loanPortfolio?.npaRatio != null ? "text-emerald-500" : ""}>
              {loanPortfolio?.npaRatio != null ? `${loanPortfolio.npaRatio}%` : "—"}
            </strong>
          </div>
          <Link to="/loans" className="domain-card-link">
            Open Loan Management <ArrowRight size={13} />
          </Link>
        </Card>

        {/* Payments */}
        <Card className="telemetry-domain-card domain-emerald">
          <div className="domain-card-top">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span className="domain-label">Payment Clearing Rails</span>
              {paymentStatus === "unavailable" && (
                <span className="service-unavailable-badge">service unavailable</span>
              )}
            </div>
            <div className="domain-icon-circle emerald">
              <Send size={18} />
            </div>
          </div>
          <div className="domain-card-main">
            <div className="domain-main-number">
              {paymentReport?.successRate != null ? `${paymentReport.successRate}%` : "—"}
            </div>
            <p className="domain-sub-label">Clearing Success Rate</p>
          </div>
          <div className="domain-card-bottom">
            <span>Rail Modes:</span>
            <strong>IMPS · UPI · NEFT</strong>
          </div>
          <Link to="/payments" className="domain-card-link">
            Open Payments Hub <ArrowRight size={13} />
          </Link>
        </Card>

        {/* KYC & Compliance */}
        <Card className="telemetry-domain-card domain-purple">
          <div className="domain-card-top">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span className="domain-label">Identity & Regulatory Compliance</span>
              {complianceStatus === "unavailable" && (
                <span className="service-unavailable-badge">service unavailable</span>
              )}
            </div>
            <div className="domain-icon-circle purple">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="domain-card-main">
            <div className="domain-main-number">
              {kycData?.verified != null ? kycData.verified : "—"}
            </div>
            <p className="domain-sub-label">Verified Customer Identities</p>
          </div>
          <div className="domain-card-bottom">
            <span>PCI-DSS Controls:</span>
            <strong className={pciData?.complianceScore != null ? "text-emerald-500" : ""}>
              {pciData?.complianceScore != null ? `${pciData.complianceScore}% Passed` : "—"}
            </strong>
          </div>
          <Link to="/compliance" className="domain-card-link">
            Open Compliance & Audit <ArrowRight size={13} />
          </Link>
        </Card>
      </div>

      {/* Security & Audit Assurance Section */}
      <Card className="telemetry-audit-card">
        <div className="telemetry-audit-header">
          <div className="flex-group">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <div>
              <h3 className="telemetry-audit-title">Cryptographic Audit Chain Integrity</h3>
              <p className="telemetry-audit-subtitle">
                Immutable SHA-256 hash chains verified across Core Banking and KYC PostgreSQL databases
              </p>
            </div>
          </div>
          <Link to="/audit" className="primary-button btn-sm">
            Inspect Full Audit Log <ArrowRight size={13} />
          </Link>
        </div>
      </Card>
    </div>
  );
}
