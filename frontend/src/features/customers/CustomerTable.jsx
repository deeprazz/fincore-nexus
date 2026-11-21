import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export function CustomerTable({
  customers = [],
  showKycActions = false,
  onKycAction,
  disabled = false,
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Aadhaar ID</th>
            <th>PAN Number</th>
            <th>KYC Status</th>
            <th>Created At</th>
            {showKycActions && <th>Teller Action</th>}
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => {
            const status = String(
              customer.kycStatus ?? "UNKNOWN"
            ).toUpperCase();
            const pending = status === "PENDING";
            const verified = status === "VERIFIED";

            const formattedAadhaar = customer.aadhaarNumber
              ? `${customer.aadhaarNumber.slice(0, 4)} ${customer.aadhaarNumber.slice(4, 8)} ${customer.aadhaarNumber.slice(8, 12)}`
              : "—";

            return (
              <tr key={customer.id}>
                <td>
                  <strong>{customer.name}</strong>
                  <div style={{ fontSize: "11px", color: "var(--muted, #64748b)", fontFamily: "monospace" }}>
                    CUST-{String(customer.id).replace(/-/g, "").slice(0, 8).toUpperCase()}
                  </div>
                </td>
                <td>{customer.email}</td>
                <td>{customer.phoneNumber || "—"}</td>
                <td>
                  <span style={{ fontFamily: "monospace", letterSpacing: "0.5px" }}>
                    {formattedAadhaar}
                  </span>
                </td>
                <td>
                  <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                    {customer.panNumber || "—"}
                  </span>
                </td>
                <td>
                  <span className={`kyc-status kyc-${status.toLowerCase()}`}>
                    {status.replaceAll("_", " ")}
                  </span>
                </td>
                <td>
                  {customer.createdAt
                    ? new Date(customer.createdAt).toLocaleDateString()
                    : "—"}
                </td>
                {showKycActions && (
                  <td className="action-cell">
                    {pending ? (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => onKycAction(customer.id, "VERIFIED")}
                          title="Confirm KYC for this customer"
                          className="btn-kyc-confirm"
                        >
                          <CheckCircle2 size={14} /> Confirm KYC
                        </button>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => onKycAction(customer.id, "REJECTED")}
                          title="Reject KYC"
                          className="btn-kyc-reject"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    ) : verified ? (
                      <span style={{ color: "#10b981", fontSize: "12px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <CheckCircle2 size={14} /> Verified &amp; Active
                      </span>
                    ) : (
                      <span className="muted-cell">Rejected</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          {!customers.length && (
            <tr>
              <td colSpan={showKycActions ? "8" : "7"} className="empty-state">
                No customers to display. Register a customer above to start.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default CustomerTable;
