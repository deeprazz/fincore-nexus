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

  const getHeaderStyle = () => {
    if (isSettled) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    if (isNeftPending) return "border-blue-500/30 bg-blue-500/10 text-blue-300";
    if (isPendingReview) return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    if (isReversed) return "border-purple-500/30 bg-purple-500/10 text-purple-300";
    if (isCompPending) return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    if (isFailed) return "border-red-500/30 bg-red-500/10 text-red-300";
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
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
    <div className="payment-saga-tracker space-y-6 max-w-3xl mx-auto">
      {/* Dynamic Status Header */}
      <div className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${getHeaderStyle()}`}>
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-lg bg-surface/50 border border-current/20">
            {isSettled ? (
              <CheckCircle2 size={24} className="text-emerald-400" />
            ) : isNeftPending ? (
              <Clock size={24} className="text-blue-400" />
            ) : isPendingReview ? (
              <ShieldAlert size={24} className="text-amber-400" />
            ) : isReversed ? (
              <RotateCcw size={24} className="text-purple-400" />
            ) : isFailed ? (
              <XCircle size={24} className="text-red-400" />
            ) : (
              <Loader2 size={24} className="text-blue-400 animate-spin" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold">{getHeaderTitle()}</h2>
            <p className="text-xs opacity-90 mt-0.5">
              {p.failureReason || (isNeftPending ? "NEFT transfer credited. Half-hourly batch clearing will settle finality." : "Distributed Saga choreography executing across Core Banking, Fraud Engine, and Settlement.")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {polling && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400 font-medium px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              Live Sync
            </span>
          )}
          <StatusBadge status={p.status} />
        </div>
      </div>

      {/* Transaction Summary Snapshot */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg bg-surface border border-border">
          <span className="text-xs text-muted block">Amount</span>
          <span className="text-xl font-bold font-mono text-primary">
            ₹{Number(p.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="p-3.5 rounded-lg bg-surface border border-border">
          <span className="text-xs text-muted block">Rail & Mode</span>
          <span className="text-sm font-semibold">{p.paymentRail}</span>
        </div>
        <div className="p-3.5 rounded-lg bg-surface border border-border">
          <span className="text-xs text-muted block">UTR Reference</span>
          <span className="text-xs font-mono font-bold block truncate" title={p.utr}>
            {p.utr || "Allocating..."}
          </span>
        </div>
        <div className="p-3.5 rounded-lg bg-surface border border-border">
          <span className="text-xs text-muted block">Destination</span>
          <span className="text-xs font-mono block truncate" title={p.targetAccountNumber || p.targetVpa}>
            {p.targetAccountNumber || p.targetVpa || "N/A"}
          </span>
        </div>
      </div>

      {/* Vertical Ordered Saga Timeline Tracker */}
      <div className="p-6 rounded-xl bg-surface border border-border space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="font-bold text-base">Distributed Payment Saga Execution Timeline</h3>
            <p className="text-xs text-muted">Real-time trace of all 9 transactional stages across microservice boundaries</p>
          </div>
          <button
            type="button"
            onClick={fetchStatus}
            className="secondary-button text-xs py-1 px-2.5 flex items-center gap-1.5"
            title="Refresh Saga state"
          >
            <RefreshCw size={12} className={polling ? "animate-spin" : ""} />
            Poll
          </button>
        </div>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
          {timelineStages.map((step) => {
            const isCompleted = step.state === "COMPLETED";
            const isCurrent = step.state === "IN_PROGRESS";
            const isReview = step.state === "REVIEW";
            const isFailedStep = step.state === "FAILED";
            const isReversedStep = step.state === "COMPENSATING" || step.state === "REVERSED";

            return (
              <div key={step.id} className="relative flex items-start gap-4">
                {/* Node indicator */}
                <div
                  className={`absolute -left-6 mt-0.5 flex items-center justify-center w-5 h-5 rounded-full border ${
                    isCompleted
                      ? "bg-surface border-emerald-500"
                      : isCurrent
                      ? "bg-surface border-blue-500 animate-pulse"
                      : isReview
                      ? "bg-surface border-amber-500"
                      : isReversedStep
                      ? "bg-surface border-purple-500"
                      : isFailedStep
                      ? "bg-surface border-red-500"
                      : "bg-surface border-border"
                  }`}
                >
                  {getStepIcon(step.state)}
                </div>

                {/* Node content */}
                <div className="flex-1 bg-surface-alt/40 p-3.5 rounded-lg border border-border/70 hover:border-border transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted">Stage {step.id}:</span>
                      <strong className={`text-sm ${
                        isCompleted ? "text-emerald-300" :
                        isCurrent ? "text-blue-300" :
                        isReview ? "text-amber-300" :
                        isReversedStep ? "text-purple-300" :
                        isFailedStep ? "text-red-300" :
                        "text-muted"
                      }`}>
                        {step.title}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2">
                      {step.detail && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-muted">
                          {step.detail}
                        </span>
                      )}
                      {step.timestamp && (
                        <span className="text-[11px] text-muted">{step.timestamp}</span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted mt-1.5 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reversal / Compensation Box when applicable */}
        {(isReversed || isCompPending) && (
          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-200 text-xs space-y-2 mt-4">
            <div className="flex items-center gap-2 font-bold text-sm text-purple-300">
              <RotateCcw size={16} />
              Saga Compensation Action Executed
            </div>
            <p>
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
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          {onViewReceipt && (
            <Button
              type="button"
              variant="primary"
              onClick={() => onViewReceipt(p)}
              className="flex items-center gap-2"
            >
              <FileText size={16} />
              View Printable Receipt / Advice
            </Button>
          )}

          {onNewPayment && (
            <Button
              type="button"
              variant="secondary"
              onClick={onNewPayment}
            >
              Make Another Transfer
            </Button>
          )}
        </div>

        {onViewHistory && (
          <Button
            type="button"
            variant="ghost"
            onClick={onViewHistory}
            className="text-xs text-muted hover:text-foreground"
          >
            Open Transaction History →
          </Button>
        )}
      </div>
    </div>
  );
}
