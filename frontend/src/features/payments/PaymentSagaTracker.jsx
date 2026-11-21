import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  FileText,
  Clock,
  Send,
  Zap,
} from "lucide-react";
import Button from "../../components/ui/Button";
import StatusBadge from "../../components/ui/StatusBadge";
import FraudCheckBadge from "./FraudCheckBadge";
import { getPayment, getPaymentSaga } from "../../api/payments";
import { useAuth } from "../../context/AuthContext";
import { money } from "../../utils/money";
import "../../styles/sagaTracker.css";

export default function PaymentSagaTracker({
  payment: propPayment,
  initialPayment,
  onViewReceipt,
  onNewPayment,
  onViewHistory,
  onClose,
}) {
  const { auth } = useAuth();
  const [payment, setPayment] = useState(propPayment || initialPayment);
  const [saga, setSaga] = useState(null);
  const [polling, setPolling] = useState(true);
  const [pollCount, setPollCount] = useState(0);
  const pollTimerRef = useRef(null);

  const paymentId = payment?.id || propPayment?.id || initialPayment?.id;

  const fetchStatus = useCallback(async () => {
    if (!paymentId) return;
    try {
      const [updatedPayment, sagaRes] = await Promise.all([
        getPayment(paymentId, auth).catch(() => null),
        getPaymentSaga(paymentId, auth).catch(() => null),
      ]);
      if (updatedPayment) {
        setPayment(updatedPayment);
      }
      if (sagaRes) {
        setSaga(sagaRes);
      }
      setPollCount((c) => c + 1);

      // Check terminal states
      const s = updatedPayment?.status || payment?.status;
      const isTerminal =
        s === "SETTLED" ||
        s === "REVERSED" ||
        s === "FAILED" ||
        (s === "CREDITED" && updatedPayment?.paymentRail === "NEFT") ||
        s === "PENDING_REVIEW" ||
        s === "COMPENSATION_PENDING";

      if (isTerminal && pollCount > 1) {
        setPolling(false);
      }
    } catch {
      // keep polling despite network blips
    }
  }, [paymentId, auth, payment?.status, pollCount]);

  useEffect(() => {
    fetchStatus();
    if (polling) {
      pollTimerRef.current = setInterval(fetchStatus, 2000);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchStatus, polling]);

  const p = payment || initialPayment;
  if (!p) return null;

  const status = p.status;
  const isNeftPending = status === "CREDITED" && p.paymentRail === "NEFT";
  const isSettled = status === "SETTLED" || status === "COMPLETED";
  const isPendingReview = status === "PENDING_REVIEW";
  const isFailed = status === "FAILED";
  const isReversed = status === "REVERSED";
  const isCompPending = status === "COMPENSATION_PENDING";

  // Build the 9 ordered stages based on actual backend Saga progression
  const buildTimelineStages = () => {
    const isStep1Done = true; // Request always received to be tracked
    const isStep2Done = status !== "FAILED" || p.failureReason?.includes("Source account") || p.failureReason?.includes("debit");
    const isStep3Done = !isFailed || p.failureReason?.includes("debit") || p.failureReason?.includes("credit");
    const isStep4Done = !isFailed || p.fraudDecision === "BLOCK" || p.failureReason?.includes("debit");
    const isFraudReview = isPendingReview;
    const isFraudBlocked = p.fraudDecision === "BLOCK" || (isFailed && p.failureReason?.includes("fraud"));

    const isStep5Done =
      status === "DEBITED" ||
      status === "CREDITED" ||
      status === "SETTLED" ||
      status === "COMPLETED" ||
      isReversed ||
      isCompPending;
    const isStep5Failed = isFailed && (p.failureReason?.includes("funds") || p.failureReason?.includes("debit"));

    const isStep6Done =
      status === "CREDITED" || status === "SETTLED" || status === "COMPLETED";
    const isStep6Failed = isReversed || isCompPending;

    const isStep7Done = isSettled;
    const isStep7Pending = isNeftPending;

    const isStep8Done = isSettled;
    const isStep9Done = isSettled;

    return [
      {
        id: 1,
        title: "Payment Request Received",
        desc: "API request ingested, idempotency verified, and cryptographic payload hash recorded.",
        state: isStep1Done ? "COMPLETED" : "PENDING",
        detail: p.idempotencyKey ? `Idempotency: ${p.idempotencyKey.slice(0, 8)}...` : null,
        timestamp: p.createdAt ? new Date(p.createdAt).toLocaleTimeString() : null,
      },
      {
        id: 2,
        title: "Transaction Authorization",
        desc: "Caller session authenticated, permissions verified, and transaction authorization confirmed.",
        state: isStep2Done ? "COMPLETED" : "FAILED",
        detail: `Operator / Maker: ${p.createdBy || "Authorized"}`,
        timestamp: p.createdAt ? new Date(p.createdAt).toLocaleTimeString() : null,
      },
      {
        id: 3,
        title: "Beneficiary & Rail Validation",
        desc: `Verified destination account format, rail limit compliance, and cooling-off constraints.`,
        state: isStep3Done ? "COMPLETED" : "FAILED",
        detail: `Rail: ${p.paymentRail} (Limit check passed)`,
        timestamp: p.createdAt ? new Date(p.createdAt).toLocaleTimeString() : null,
      },
      {
        id: 4,
        title: "Fraud Risk Assessment",
        desc: isFraudReview
          ? "High risk threshold reached. Maker-Checker dual control review required before debit."
          : isFraudBlocked
          ? `Transaction blocked by Fraud Engine: Score ${p.fraudScore || "High"}`
          : "Heuristic rule evaluation passed (ALLOW). Zero high-risk fraud triggers.",
        state: isFraudReview
          ? "REVIEW"
          : isFraudBlocked
          ? "FAILED"
          : isStep4Done
          ? "COMPLETED"
          : "IN_PROGRESS",
        detail: p.fraudDecision ? `Decision: ${p.fraudDecision} (Score: ${Number(p.fraudScore || 0).toFixed(2)})` : null,
        timestamp: p.createdAt ? new Date(p.createdAt).toLocaleTimeString() : null,
      },
      {
        id: 5,
        title: "Source Account Debit",
        desc: isStep5Failed
          ? `Source account debit failed: ${p.failureReason || "Insufficient balance."}`
          : isFraudReview
          ? "Debit held until Manager Maker-Checker authorization is approved."
          : isStep5Done
          ? `Debited ₹${Number(p.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })} from ledger balance.`
          : isFailed
          ? "Debit aborted."
          : "Executing Core Banking double-entry balance debit...",
        state: isStep5Failed
          ? "FAILED"
          : isFraudReview
          ? "PENDING"
          : isStep5Done
          ? "COMPLETED"
          : isFailed
          ? "SKIPPED"
          : "IN_PROGRESS",
        detail: isStep5Done ? `Source Ledger: ${p.sourceAccountId ? p.sourceAccountId.slice(0, 8) : "Active"}` : null,
        timestamp: isStep5Done && p.createdAt ? new Date(p.createdAt).toLocaleTimeString() : null,
      },
      {
        id: 6,
        title: "Payment Clearing / Destination Credit",
        desc: isStep6Failed
          ? `Destination clearing rejected: ${p.failureReason || "Beneficiary account unreachable."}`
          : isStep6Done
          ? `Beneficiary ledger credited: ${p.targetAccountNumber || p.targetVpa}`
          : isFailed || isFraudReview
          ? "Awaiting prerequisites."
          : "Clearing transfer with NPCI / destination bank network...",
        state: isStep6Failed
          ? "COMPENSATING"
          : isStep6Done
          ? "COMPLETED"
          : isStep5Done && !isFailed
          ? "IN_PROGRESS"
          : "PENDING",
        detail: isStep6Done ? `IFSC: ${p.targetIfsc || "UPI Rail"}` : null,
        timestamp: isStep6Done && p.createdAt ? new Date(p.createdAt).toLocaleTimeString() : null,
      },
      {
        id: 7,
        title: "Settlement Processing",
        desc: isNeftPending
          ? "NEFT half-hourly settlement queued. Settlement will finalize during next clearing batch."
          : isSettled
          ? `${p.paymentRail} instant settlement finalized with zero float.`
          : isReversed
          ? "Settlement cancelled due to destination credit failure."
          : isFailed || isFraudReview
          ? "Pending upstream completion."
          : "Finalizing clearing settlement...",
        state: isNeftPending
          ? "QUEUED"
          : isSettled
          ? "COMPLETED"
          : isReversed
          ? "REVERSED"
          : isStep6Done
          ? "IN_PROGRESS"
          : "PENDING",
        detail: isNeftPending ? "Batch: Scheduled Next Window" : isSettled ? "Settled: T+0 Finality" : null,
        timestamp: p.settledAt ? new Date(p.settledAt).toLocaleTimeString() : null,
      },
      {
        id: 8,
        title: "Transaction Completion",
        desc: isSettled
          ? `Transaction verified complete. UTR: ${p.utr}`
          : isNeftPending
          ? "Credited; completion advice pending batch execution."
          : isReversed
          ? "Transaction closed as REVERSED (Funds returned to source)."
          : isCompPending
          ? "Transaction stalled in COMPENSATION_PENDING. Operator action required."
          : isFailed
          ? "Transaction concluded as FAILED."
          : "Finalizing ledger balance state...",
        state: isSettled
          ? "COMPLETED"
          : isReversed
          ? "REVERSED"
          : isCompPending
          ? "FAILED"
          : isNeftPending
          ? "QUEUED"
          : "PENDING",
        detail: p.utr ? `UTR: ${p.utr}` : null,
      },
      {
        id: 9,
        title: "Notification Dispatch",
        desc: isSettled
          ? "Kafka event emitted to 'payment.completed' topic. SMS/Email notification dispatched."
          : isFailed || isReversed
          ? "Kafka event emitted to 'payment.failed' topic. Reversal notification issued."
          : isNeftPending
          ? "Awaiting batch settlement before dispatching final completion notification."
          : "Transactional outbox event relay waiting...",
        state: isSettled || isReversed || isFailed ? "COMPLETED" : "PENDING",
        detail: "Kafka: payment.completed",
      },
    ];
  };

  const timelineStages = buildTimelineStages();

  const getStepIcon = (state) => {
    switch (state) {
      case "COMPLETED":
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case "IN_PROGRESS":
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case "REVIEW":
        return <ShieldAlert className="w-5 h-5 text-amber-400" />;
      case "QUEUED":
        return <Clock className="w-5 h-5 text-blue-400" />;
      case "COMPENSATING":
        return <RotateCcw className="w-5 h-5 text-purple-400" />;
      case "REVERSED":
        return <RotateCcw className="w-5 h-5 text-purple-400" />;
      case "FAILED":
        return <XCircle className="w-5 h-5 text-red-400" />;
      case "SKIPPED":
        return <span className="w-3 h-3 rounded-full bg-slate-600" />;
      default:
        return <span className="w-3 h-3 rounded-full bg-slate-600" />;
    }
  };

  const completedStagesCount = timelineStages.filter((s) => s.state === "COMPLETED").length;
  const progressPercent = isSettled
    ? 100
    : Math.min(100, Math.round((completedStagesCount / Math.max(1, timelineStages.length - 1)) * 100));

  const getHeaderBannerClass = () => {
    if (isSettled) return "settled";
    if (isNeftPending) return "executing";
    if (isPendingReview) return "pending-review";
    if (isReversed || isCompPending) return "reversed";
    if (isFailed) return "failed";
    return "executing";
  };

  const getHeaderTitle = () => {
    if (isSettled) return "Payment Successful & Settled";
    if (isNeftPending) return "Payment Credited — Awaiting Batch Settlement";
    if (isPendingReview) return "Manual Review Required — Maker-Checker Dual Control";
    if (isReversed) return "Payment Reversed — Funds Returned to Source";
    if (isCompPending) return "Action Required: Compensation Refund Pending";
    if (isFailed) return "Payment Execution Failed";
    return "Processing Payment Saga Stages...";
  };

  return (
    <div className="saga-tracker-container space-y-6" style={{ maxWidth: "780px" }}>
      {/* Dynamic Status Header */}
      <div className={`saga-status-banner ${getHeaderBannerClass()}`}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div className="saga-status-icon-box">
            {isSettled ? (
              <CheckCircle2 size={24} style={{ color: "#10b981" }} />
            ) : isNeftPending ? (
              <Clock size={24} style={{ color: "#3b82f6" }} />
            ) : isPendingReview ? (
              <ShieldAlert size={24} style={{ color: "#f59e0b" }} />
            ) : isReversed ? (
              <RotateCcw size={24} style={{ color: "#a855f7" }} />
            ) : isFailed ? (
              <XCircle size={24} style={{ color: "#ef4444" }} />
            ) : (
              <Loader2 size={24} className="animate-spin" style={{ color: "#3b82f6" }} />
            )}
          </div>
          <div>
            <h2 style={{ fontSize: "17px", fontWeight: "800", margin: 0, letterSpacing: "-0.01em" }}>
              {getHeaderTitle()}
            </h2>
            <p style={{ fontSize: "12px", opacity: 0.9, margin: "3px 0 0 0" }}>
              {p.failureReason ||
                (isNeftPending
                  ? "NEFT transfer credited. Half-hourly batch clearing will settle finality."
                  : "Distributed Saga choreography executing across Core Banking, Fraud Engine, and Settlement.")}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", alignSelf: "flex-end" }}>
          {polling && (
            <span className="saga-live-badge">
              <span className="saga-live-dot" />
              Live Sync
            </span>
          )}
          <StatusBadge status={p.status} />
        </div>
      </div>

      {/* Transaction Summary Snapshot Grid */}
      <div className="saga-grid-summary">
        <div className="saga-summary-card">
          <span className="saga-summary-label">Amount</span>
          <span className="saga-summary-value amount">
            ₹{Number(p.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="saga-summary-card">
          <span className="saga-summary-label">Rail & Mode</span>
          <span className="saga-summary-value">{p.paymentRail}</span>
        </div>
        <div className="saga-summary-card">
          <span className="saga-summary-label">UTR Reference</span>
          <span className="saga-summary-value mono" title={p.utr}>
            {p.utr || "Allocating..."}
          </span>
        </div>
        <div className="saga-summary-card">
          <span className="saga-summary-label">Destination</span>
          <span className="saga-summary-value mono" title={p.targetAccountNumber || p.targetVpa}>
            {p.targetAccountNumber || p.targetVpa || "N/A"}
          </span>
        </div>
      </div>

      {/* Vertical Ordered Saga Timeline Tracker */}
      <div className="saga-timeline-wrapper">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 className="saga-timeline-heading" style={{ margin: 0 }}>
              Distributed Payment Saga Execution Timeline
            </h3>
            <p style={{ fontSize: "12px", color: "var(--saga-text-muted)", margin: "2px 0 0 0" }}>
              Real-time trace of all 9 transactional stages across microservice boundaries
            </p>
          </div>
          <button
            type="button"
            onClick={fetchStatus}
            className="saga-btn-secondary"
            style={{ padding: "6px 12px", fontSize: "11.5px" }}
            title="Refresh Saga state"
          >
            <RefreshCw size={12} className={polling ? "animate-spin" : ""} />
            Poll
          </button>
        </div>

        <div className="saga-stages-list">
          {/* Animated Green/Blue progress fill line */}
          <div
            className="saga-connector-fill"
            style={{ height: `${progressPercent}%` }}
          />

          {timelineStages.map((step, idx) => {
            const isCompleted = step.state === "COMPLETED";
            const isCurrent = step.state === "IN_PROGRESS";
            const isReview = step.state === "REVIEW";
            const isFailedStep = step.state === "FAILED";
            const isReversedStep = step.state === "COMPENSATING" || step.state === "REVERSED";

            return (
              <div
                key={step.id}
                className="saga-stage-item"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                {/* Node indicator */}
                <div
                  className={`saga-node-dot ${
                    isCompleted
                      ? "completed"
                      : isCurrent
                      ? "active"
                      : isReview
                      ? "review"
                      : isFailedStep
                      ? "failed"
                      : isReversedStep
                      ? "failed"
                      : "pending"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={13} strokeWidth={2.5} />
                  ) : isCurrent ? (
                    <Loader2 size={13} className="animate-spin" strokeWidth={2.5} />
                  ) : isReview ? (
                    <ShieldAlert size={13} strokeWidth={2.5} />
                  ) : isReversedStep ? (
                    <RotateCcw size={13} strokeWidth={2.5} />
                  ) : isFailedStep ? (
                    <XCircle size={13} strokeWidth={2.5} />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>

                {/* Node content */}
                <div className={`saga-stage-content ${isCurrent ? "active" : ""}`}>
                  <div className="saga-stage-header">
                    <div className="saga-stage-title-wrap">
                      <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--saga-text-muted)" }}>
                        Stage {step.id}:
                      </span>
                      <strong
                        className={`saga-stage-title ${
                          isCompleted
                            ? "completed"
                            : isCurrent
                            ? "active"
                            : isFailedStep
                            ? "failed"
                            : ""
                        }`}
                      >
                        {step.title}
                      </strong>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {step.detail && (
                        <span
                          className="saga-stage-badge"
                          style={{
                            background: "var(--saga-account-pill-bg)",
                            color: "var(--saga-text-muted)",
                            border: "1px solid var(--saga-border)",
                          }}
                        >
                          {step.detail}
                        </span>
                      )}
                      {step.timestamp && (
                        <span style={{ fontSize: "11px", color: "var(--saga-text-muted)" }}>
                          {step.timestamp}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="saga-stage-desc">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reversal / Compensation Box when applicable */}
        {(isReversed || isCompPending) && (
          <div className="saga-comp-alert">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", marginBottom: "4px" }}>
              <RotateCcw size={16} />
              Saga Compensation Action Executed
            </div>
            <p style={{ margin: 0 }}>
              When destination bank clearing failed, the Saga Orchestrator triggered a compensating credit command to Core Banking.
              {isReversed && " The source account balance has been restored."}
              {isCompPending && " Notice: Core Banking refund failed and is staged in COMPENSATION_PENDING for operator retry."}
            </p>
          </div>
        )}
      </div>

      {/* Fraud Check Inspection Pill */}
      {p.fraudScore != null && (
        <FraudCheckBadge
          score={p.fraudScore}
          decision={p.fraudDecision}
          rules={p.triggeredRules}
        />
      )}

      {/* Action Footer */}
      <div className="saga-actions-bar">
        <div className="saga-btn-group">
          {onViewReceipt && (
            <button
              type="button"
              onClick={() => onViewReceipt(p)}
              className="saga-btn-primary"
            >
              <FileText size={15} />
              View Printable Receipt / Advice
            </button>
          )}

          {onNewPayment && (
            <button
              type="button"
              onClick={onNewPayment}
              className="saga-btn-secondary"
            >
              Make Another Transfer
            </button>
          )}
        </div>

        {onViewHistory && (
          <button
            type="button"
            onClick={onViewHistory}
            className="saga-link-action"
          >
            Open Transaction History →
          </button>
        )}
      </div>
    </div>
  );
}
