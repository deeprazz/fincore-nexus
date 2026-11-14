import React from "react";

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
            <th>Customer</th>
            <th>Email</th>
            <th>Customer ID</th>
            <th>KYC Status</th>
            <th>Created At</th>
            {showKycActions && <th>Decision</th>}
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => {
            const status = String(
              customer.kycStatus ?? "UNKNOWN"
            ).toUpperCase();
            const pending = status === "PENDING";
            return (
              <tr key={customer.id}>
                <td>{customer.name}</td>
                <td>{customer.email}</td>
                <td className="muted-cell">{customer.id}</td>
                <td>
                  <span className={`kyc-status kyc-${status.toLowerCase()}`}>
                    {status.replaceAll("_", " ")}
                  </span>
                </td>
                <td>
                  {customer.createdAt
                    ? new Date(customer.createdAt).toLocaleString()
                    : "—"}
                </td>
                {showKycActions && (
                  <td className="action-cell">
                    {pending ? (
                      <>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => onKycAction(customer.id, "VERIFIED")}
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => onKycAction(customer.id, "REJECTED")}
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="muted-cell">Decision recorded</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          {!customers.length && (
            <tr>
              <td colSpan={showKycActions ? "6" : "5"} className="empty-state">
                No customers to display. Register a customer or refresh the list.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default CustomerTable;
