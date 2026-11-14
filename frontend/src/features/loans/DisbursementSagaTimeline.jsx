import React from "react";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { formatDateTime } from "../../utils/date";

export function DisbursementSagaTimeline({
  status = "ACTIVE",
  currentStep,
  failedReason,
  timestamps = {},
  className = "",
}) {
  const steps = [
    { key: "APPLICATION_SUBMITTED", label: "Application Submitted" },
    { key: "CREDIT_ASSESSED", label: "Credit Assessed" },
    { key: "APPROVED", label: "Approved" },
    { key: "DISBURSED", label: "Disbursed" },
    { key: "ACTIVE", label: "Loan Active" },
  ];

  // Determine current step index based on status or prop
  const getStepIndex = (st) => {
    switch (String(st).toUpperCase()) {
      case "SUBMITTED":
      case "PENDING":
        return 0;
      case "ASSESSED":
      case "IN_REVIEW":
      case "MANUAL_REVIEW":
        return 1;
      case "APPROVED":
      case "PENDING_DISBURSEMENT":
        return 2;
      case "DISBURSED":
        return 3;
      case "ACTIVE":
      case "CLOSED":
      case "PAID_OFF":
        return 4;
      case "REJECTED":
      case "FAILED":
        return 1; // halted at review or assessment
      default:
        return 4;
    }
  };

  const activeIndex =
    currentStep !== undefined ? currentStep : getStepIndex(status);
  const isFailed =
    String(status).toUpperCase() === "REJECTED" ||
    String(status).toUpperCase() === "FAILED";

  return (
    <div className={`saga-timeline-wrap ${className}`}>
      <div className="saga-timeline-header">
        <h4>Disbursement Saga Timeline</h4>
        <span className="saga-status-tag">
          {isFailed ? "Halted / Failed" : "Orchestrated via Kafka"}
        </span>
      </div>

      <div className="saga-timeline-track">
        {steps.map((step, idx) => {
          let state = "pending"; // 'done' | 'current' | 'failed' | 'pending'
          if (isFailed && idx === activeIndex) {
            state = "failed";
          } else if (idx < activeIndex || (!isFailed && idx === activeIndex && activeIndex === steps.length - 1)) {
            state = "done";
          } else if (idx === activeIndex) {
            state = "current";
          }

          const stepTime =
            timestamps[step.key.toLowerCase()] ||
            timestamps[step.key] ||
            (state === "done" && timestamps.updatedAt);

          return (
            <div key={step.key} className={`saga-step-node saga-step-${state}`}>
              <div className="saga-step-indicator">
                {state === "done" && <CheckCircle2 size={16} className="saga-icon done" />}
                {state === "current" && <Clock size={16} className="saga-icon current spin" />}
                {state === "failed" && <XCircle size={16} className="saga-icon failed" />}
                {state === "pending" && <div className="saga-dot" />}
              </div>
              <div className="saga-step-content">
                <span className="saga-step-title">{step.label}</span>
                {stepTime && (
                  <span className="saga-step-time">{formatDateTime(stepTime)}</span>
                )}
                {state === "failed" && failedReason && (
                  <div className="saga-step-error">
                    <AlertCircle size={12} />
                    <span>{failedReason}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DisbursementSagaTimeline;
