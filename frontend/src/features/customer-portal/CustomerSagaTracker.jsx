import React from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Clock,
  ShieldCheck,
  CreditCard,
  Building,
  FileText,
  RotateCcw,
  Download,
} from "lucide-react";
import jsPDF from "jspdf";
import "../../styles/sagaTracker.css";

export default function CustomerSagaTracker({
  sagaData,
  stageIndex = 1,
  isFinished = false,
  errorMessage,
  onReset,
  onViewStatements,
}) {
  const {
    utr = "FINC-PENDING",
    fromAccount = "—",
    toAccount = "—",
    amount = 0,
    timestamp = new Date().toISOString(),
  } = sagaData || {};

  const numAmount = Number(amount) || 0;
  const isFailed = Boolean(errorMessage);

  const STAGES = [
    {
      id: 1,
      title: "Payment Request Initiated",
      desc: `Transfer intent registered with reference ${utr}.`,
      icon: Clock,
    },
    {
      id: 2,
      title: "Transaction PIN & Security Authorization",
      desc: "4-digit security PIN verified against cryptographic hash.",
      icon: ShieldCheck,
    },
    {
      id: 3,
      title: "Account Balance & Limit Validation",
      desc: "Source account funds confirmed; amount within daily limits.",
      icon: CreditCard,
    },
    {
      id: 4,
      title: "Real-Time Risk & Fraud Assessment",
      desc: "Zero velocity anomaly detected; fast-path approved.",
      icon: ShieldCheck,
    },
    {
      id: 5,
      title: "Source Account Debited",
      desc: `₹${numAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} deducted from ${fromAccount}.`,
      icon: Building,
    },
    {
      id: 6,
      title: "Destination Account Credited",
      desc: `₹${numAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} posted to recipient ${toAccount}.`,
      icon: Building,
    },
    {
      id: 7,
      title: "Saga Orchestration Complete & Settled",
      desc: "Double-entry ledger balanced and transaction finalized.",
      icon: CheckCircle2,
    },
    {
      id: 8,
      title: "Confirmation Advice Dispatched",
      desc: "Electronic debit/credit advice issued to customer account.",
      icon: FileText,
    },
  ];

  // Calculate connector line progress fill percentage
  const totalSteps = STAGES.length;
  let progressPercent = 0;
  if (isFinished) {
    progressPercent = 100;
  } else if (stageIndex > 1) {
    progressPercent = Math.min(100, Math.round(((stageIndex - 1) / (totalSteps - 1)) * 100));
  }

  const downloadReceipt = () => {
    const doc = new jsPDF();
    doc.setFillColor(18, 37, 63);
    doc.rect(0, 0, 210, 32, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("FinCore Nexus", 14, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("CUSTOMER TRANSFER ADVICE · SAGA ORCHESTRATED", 14, 22);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 196, 22, { align: "right" });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TRANSACTION DETAILS", 14, 45);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Reference / UTR: ${utr}`, 14, 55);
    doc.text(`Status: ${isFailed ? "FAILED" : "SETTLED / COMPLETED"}`, 14, 63);
    doc.text(`Transfer Amount: INR ${numAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 14, 71);
    doc.text(`Source Account: ${fromAccount}`, 14, 79);
    doc.text(`Recipient Account: ${toAccount}`, 14, 87);
    doc.text(`Transfer Rail: Instant Internal Transfer (T+0)`, 14, 95);
    doc.text(`Timestamp: ${new Date(timestamp).toLocaleString("en-IN")}`, 14, 103);

    doc.setDrawColor(220, 226, 234);
    doc.line(14, 115, 196, 115);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("This is an electronically generated bank transaction advice. No physical signature required.", 14, 125);

    doc.save(`transfer-receipt-${utr}.pdf`);
  };

  return (
    <div className="saga-tracker-container">
      {/* Header with live status */}
      <div className="saga-header-bar">
        <div>
          <div className="saga-eyebrow">Transfer Orchestration</div>
          <div className="saga-utr-code">{utr}</div>
          <div className="saga-timestamp">
            {new Date(timestamp).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>
        </div>

        <div>
          {isFailed ? (
            <span className="saga-pill-badge failed">
              <XCircle size={14} />
              FAILED
            </span>
          ) : isFinished ? (
            <span className="saga-pill-badge success">
              <CheckCircle2 size={14} />
              SETTLED
            </span>
          ) : (
            <span className="saga-pill-badge active">
              <Loader2 size={14} className="animate-spin" />
              EXECUTING SAGA
            </span>
          )}
        </div>
      </div>

      {/* Amount and Account Hero Card */}
      <div className="saga-hero-card">
        <div>
          <span className="saga-hero-label">Transfer Amount</span>
          <span className="saga-hero-amount">
            ₹{numAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="saga-hero-accounts">
          <div className="saga-account-row">
            <span>From:</span>
            <span className="saga-account-pill">{fromAccount}</span>
          </div>
          <div className="saga-account-row">
            <span>To:</span>
            <span className="saga-account-pill">{toAccount}</span>
          </div>
        </div>
      </div>

      {/* Error banner if failed */}
      {isFailed && (
        <div className="saga-error-banner">
          <AlertTriangle size={20} className="shrink-0" />
          <div>
            <strong style={{ display: "block", marginBottom: "2px" }}>
              Transfer Execution Failed
            </strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Vertical Ordered Saga Timeline */}
      <div className="saga-timeline-wrapper">
        <div className="saga-timeline-heading">
          Distributed Transaction Stages
        </div>

        <div className="saga-stages-list">
          {/* Animated Green/Blue progress fill line */}
          <div
            className="saga-connector-fill"
            style={{ height: `${progressPercent}%` }}
          />

          {STAGES.map((s, idx) => {
            const isStepDone = isFinished ? true : stageIndex > s.id;
            const isStepActive = !isFinished && !isFailed && stageIndex === s.id;
            const isStepFailed = isFailed && stageIndex === s.id;

            return (
              <div
                key={s.id}
                className="saga-stage-item"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Node Status Dot on timeline */}
                <div
                  className={`saga-node-dot ${
                    isStepFailed
                      ? "failed"
                      : isStepDone
                      ? "completed"
                      : isStepActive
                      ? "active"
                      : "pending"
                  }`}
                >
                  {isStepFailed ? (
                    <XCircle size={13} strokeWidth={2.5} />
                  ) : isStepDone ? (
                    <CheckCircle2 size={13} strokeWidth={2.5} />
                  ) : isStepActive ? (
                    <Loader2 size={13} className="animate-spin" strokeWidth={2.5} />
                  ) : (
                    <span>{s.id}</span>
                  )}
                </div>

                {/* Stage Content Card */}
                <div
                  className={`saga-stage-content ${
                    isStepActive ? "active" : ""
                  }`}
                >
                  <div className="saga-stage-header">
                    <div className="saga-stage-title-wrap">
                      <span
                        className={`saga-stage-title ${
                          isStepFailed
                            ? "failed"
                            : isStepDone
                            ? "completed"
                            : isStepActive
                            ? "active"
                            : ""
                        }`}
                      >
                        {s.title}
                      </span>
                    </div>

                    {isStepDone && (
                      <span className="saga-stage-badge verified">
                        VERIFIED
                      </span>
                    )}
                    {isStepActive && (
                      <span className="saga-stage-badge processing">
                        PROCESSING
                      </span>
                    )}
                    {isStepFailed && (
                      <span className="saga-stage-badge failed">
                        FAILED
                      </span>
                    )}
                  </div>
                  <p className="saga-stage-desc">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="saga-actions-bar">
        <div className="saga-btn-group">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="saga-btn-secondary"
            >
              <RotateCcw size={14} />
              {isFailed ? "Try Again" : "Make Another Transfer"}
            </button>
          )}

          {isFinished && !isFailed && (
            <button
              type="button"
              onClick={downloadReceipt}
              className="saga-btn-primary"
            >
              <Download size={14} />
              Download PDF Receipt
            </button>
          )}
        </div>

        {onViewStatements && (
          <button
            type="button"
            onClick={onViewStatements}
            className="saga-link-action"
          >
            View in Statements →
          </button>
        )}
      </div>
    </div>
  );
}
