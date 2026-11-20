import React from "react";

export default function SagaStatusTimeline({ status, failureReason, paymentRail }) {
  const steps = [
    { key: "INITIATED", label: "Initiated" },
    { key: "FRAUD_CHECKED", label: "Fraud Check" },
    { key: "DEBITED", label: "Source Debited" },
    { key: "CREDITED", label: "Destination Credited" },
    { key: "SETTLED", label: "Settled" },
  ];

  const statusOrder = {
    INITIATED: 0,
    FRAUD_CHECKED: 1,
    DEBITED: 2,
    CREDITED: 3,
    SETTLED: 4,
  };

  const isPendingReview = status === "PENDING_REVIEW";
  const isCompPending = status === "COMPENSATION_PENDING";
  const isFailed = status === "FAILED";
  const isReversed = status === "REVERSED";

  let currentIndex = 0;
  if (isPendingReview) {
    currentIndex = 0;
  } else if (isFailed) {
    currentIndex = -1;
  } else if (isCompPending || isReversed) {
    currentIndex = 2; // Debited, but credit failed and reversal pending or completed
  } else {
    currentIndex = statusOrder[status] ?? 0;
  }

  return (
    <div className="saga-timeline my-3 space-y-2">
      <div className="text-xs font-semibold text-muted uppercase tracking-wider">
        Saga Orchestration Workflow
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((step, idx) => {
          let badgeStyle = "bg-surface border-border text-muted";
          let dotStyle = "bg-muted";

          if (isPendingReview && idx === 1) {
            badgeStyle = "bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold";
            dotStyle = "bg-amber-400 animate-pulse";
          } else if (currentIndex >= idx) {
            badgeStyle = "bg-emerald-500/20 border-emerald-500/40 text-emerald-300";
            dotStyle = "bg-emerald-400";
          } else if ((isFailed || isCompPending || isReversed) && idx === (currentIndex + 1)) {
            badgeStyle = isCompPending
              ? "bg-rose-500/20 border-rose-500/40 text-rose-300 font-bold"
              : isReversed
              ? "bg-purple-500/20 border-purple-500/40 text-purple-300 font-bold"
              : "bg-red-500/20 border-red-500/40 text-red-300 font-bold";
            dotStyle = isCompPending ? "bg-rose-400" : isReversed ? "bg-purple-400" : "bg-red-400";
          }

          return (
            <React.Fragment key={step.key}>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badgeStyle}`}
              >
                <span className={`w-2 h-2 rounded-full ${dotStyle}`} />
                {step.label}
              </div>
              {idx < steps.length - 1 && <span className="text-muted text-xs">→</span>}
            </React.Fragment>
          );
        })}
      </div>

      {isPendingReview && (
        <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <span>
            <strong>Manual Review Required:</strong> Fraud Detection Engine flagged high-risk rule (Score &ge; 40). Dual-control manager approval required before source debit can be executed.
          </span>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40">
            Maker-Checker
          </span>
        </div>
      )}

      {isCompPending && (
        <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <strong>Compensation Pending:</strong> Destination credit failed, and compensating reversal to refund source account encountered an issue. Manual intervention or refund retry is required.
        </div>
      )}

      {isReversed && (
        <div className="p-2.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs">
          <strong>Compensating Reversal Executed:</strong> Destination credit failed; Saga automatically refunded debited funds back to the source account.
        </div>
      )}

      {status === "CREDITED" && paymentRail === "NEFT" && (
        <div className="p-2.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs">
          <strong>Awaiting Batch Settlement:</strong> NEFT transaction credited to beneficiary ledger. Final settlement and completion notification will be issued upon next scheduled half-hourly clearing batch.
        </div>
      )}

      {isFailed && (
        <div className="p-2.5 rounded bg-red-500/10 border border-red-200 text-red-400 text-xs">
          <strong>Payment Failed:</strong> {failureReason || "Transaction could not be completed."}
        </div>
      )}
    </div>
  );
}
