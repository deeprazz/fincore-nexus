import React from "react";

export default function SagaStatusTimeline({ status, failureReason }) {
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

  const currentIndex = status === "FAILED" || status === "REVERSED" ? -1 : (statusOrder[status] ?? 0);

  return (
    <div className="saga-timeline my-3">
      <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
        Saga Orchestration Workflow
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((step, idx) => {
          const isDone = currentIndex >= idx;
          const isFailed = (status === "FAILED" || status === "REVERSED") && idx === (currentIndex + 1);

          return (
            <React.Fragment key={step.key}>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                  isDone
                    ? "bg-green-50 border-green-400 text-green-700"
                    : isFailed
                    ? "bg-red-50 border-red-400 text-red-700 font-bold"
                    : "bg-surface border-border text-muted"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isDone ? "bg-green-500" : isFailed ? "bg-red-500" : "bg-muted"
                  }`}
                />
                {step.label}
              </div>
              {idx < steps.length - 1 && <span className="text-muted text-xs">→</span>}
            </React.Fragment>
          );
        })}
      </div>

      {(status === "FAILED" || status === "REVERSED") && (
        <div className="mt-2 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs">
          <strong>{status}:</strong> {failureReason || "Transaction could not be completed."}
        </div>
      )}
    </div>
  );
}
