import React from "react";

export function StatusBadge({ status, type = "kyc" }) {
  const normalized = String(status ?? "UNKNOWN").toUpperCase();
  const className =
    type === "kyc"
      ? `kyc-status kyc-${normalized.toLowerCase()}`
      : `status-badge status-${normalized.toLowerCase()}`;

  return (
    <span className={className}>
      {normalized.replaceAll("_", " ")}
    </span>
  );
}

export default StatusBadge;
