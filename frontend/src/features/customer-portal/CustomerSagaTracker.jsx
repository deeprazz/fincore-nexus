import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Clock,
  ShieldCheck,
  ArrowRight,
  Download,
  RotateCcw,
  FileText,
  CreditCard,
  Building,
} from "lucide-react";
import jsPDF from "jspdf";

export default function CustomerSagaTracker({
  sagaData,
  stageIndex,
  isFinished,
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
      desc: `Source account funds confirmed; amount within daily limits.`,
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
    <div className="card p-6 max-w-2xl mx-auto space-y-6 border bg-surface">
      {/* Header with live status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-5 border-b border-border">
        <div>
          <div className="text-2xs uppercase tracking-wider font-semibold text-muted">
            Transfer Orchestration
          </div>
          <h3 className="text-xl font-bold font-mono text-foreground mt-0.5">
            {utr}
          </h3>
          <p className="text-xs text-muted mt-0.5">
            {new Date(timestamp).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        </div>

        <div>
          {isFailed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30">
              <XCircle size={14} />
              FAILED
            </span>
          ) : isFinished ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 size={14} />
              SETTLED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <Loader2 size={14} className="animate-spin" />
              EXECUTING SAGA
            </span>
          )}
        </div>
      </div>

      {/* Amount and Account Card */}
      <div className="p-4 rounded-xl bg-surface-alt border border-border flex items-center justify-between">
        <div>
          <span className="text-xs text-muted block">Transfer Amount</span>
          <span className="text-2xl font-bold font-mono text-primary">
            ₹{numAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="text-right text-xs">
          <div className="text-muted">
            From: <span className="font-mono font-medium text-foreground">{fromAccount}</span>
          </div>
          <div className="text-muted mt-0.5">
            To: <span className="font-mono font-medium text-foreground">{toAccount}</span>
          </div>
        </div>
      </div>

      {/* Error banner if failed */}
      {isFailed && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm flex items-start gap-2.5">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-xs">Transfer Execution Failed</div>
            <div className="text-xs opacity-90 mt-0.5">{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Vertical Ordered Saga Timeline */}
      <div className="space-y-4 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
          Distributed Transaction Stages
        </h4>

        <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
          {STAGES.map((s) => {
            const isStepDone = isFinished ? true : stageIndex > s.id;
            const isStepActive = !isFinished && !isFailed && stageIndex === s.id;
            const isStepFailed = isFailed && stageIndex === s.id;

            return (
              <div key={s.id} className="relative flex items-start gap-3">
                {/* Status Dot */}
                <span
                  className={`absolute -left-6 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isStepFailed
                      ? "bg-red-500 text-white ring-4 ring-red-500/20"
                      : isStepDone
                      ? "bg-emerald-500 text-white ring-4 ring-emerald-500/20"
                      : isStepActive
                      ? "bg-blue-600 text-white ring-4 ring-blue-500/20"
                      : "bg-surface-alt border border-border text-muted"
                  }`}
                >
                  {isStepFailed ? (
                    <XCircle size={12} />
                  ) : isStepDone ? (
                    <CheckCircle2 size={12} />
                  ) : isStepActive ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <span className="text-[10px]">{s.id}</span>
                  )}
                </span>

                {/* Stage Info */}
                <div className="flex-1">
                  <div
                    className={`text-sm font-semibold flex items-center gap-2 ${
                      isStepFailed
                        ? "text-red-400"
                        : isStepDone
                        ? "text-emerald-400 font-bold"
                        : isStepActive
                        ? "text-blue-400 font-bold"
                        : "text-muted"
                    }`}
                  >
                    <span>{s.title}</span>
                    {isStepDone && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                        VERIFIED
                      </span>
                    )}
                    {isStepActive && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono animate-pulse">
                        PROCESSING
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-surface-alt hover:bg-surface border border-border transition-colors flex items-center gap-1.5"
            >
              <RotateCcw size={14} />
              {isFailed ? "Try Again" : "Make Another Transfer"}
            </button>
          )}

          {isFinished && !isFailed && (
            <button
              type="button"
              onClick={downloadReceipt}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-dark transition-colors flex items-center gap-1.5 shadow-sm"
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
            className="text-xs text-muted hover:text-foreground underline"
          >
            View in Statements →
          </button>
        )}
      </div>
    </div>
  );
}
