import React, { useState, useEffect, useCallback } from "react";
import { getLoans, disburseLoan } from "../../api/loans";
import { getCustomers } from "../../api/customers";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { money } from "../../utils/money";
import { formatDate } from "../../utils/date";
import { Search, Eye, Calendar, RefreshCw, Layers, CheckCircle } from "lucide-react";

export function LoanList({
  onSelectLoan,
  onViewSchedule,
  onNewApplication,
  onViewApplications,
  appsCount = 0,
  className = "",
}) {
  const { auth } = useAuth();
  const { setError, setSuccess } = useToast();

  const [loans, setLoans] = useState([]);
  const [customers, setCustomers] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadLoans = useCallback(async () => {
    setLoading(true);
    try {
      const [data, custList] = await Promise.all([
        getLoans(auth),
        getCustomers("ALL", auth).catch(() => []),
      ]);
      setLoans(Array.isArray(data) ? data : []);
      const map = {};
      if (Array.isArray(custList)) {
        custList.forEach((c) => {
          if (c.id) map[c.id] = c;
        });
      }
      setCustomers(map);
    } catch (err) {
      setError(err.message || "Failed to load loans");
    } finally {
      setLoading(false);
    }
  }, [auth, setError]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const handleDisburse = async (loanId) => {
    try {
      await disburseLoan(loanId, auth);
      if (setSuccess) setSuccess("Loan successfully disbursed and activated.");
      loadLoans();
    } catch (err) {
      setError(err.message || "Failed to disburse loan");
    }
  };

  const filteredLoans = loans.filter((loan) => {
    const q = searchQuery.toLowerCase().trim();
    const cust = customers[loan.customerId];
    const matchesSearch =
      !q ||
      String(loan.id || "").toLowerCase().includes(q) ||
      String(loan.customerId || "").toLowerCase().includes(q) ||
      String(cust?.name || "").toLowerCase().includes(q) ||
      String(cust?.email || "").toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "ALL" ||
      String(loan.status || "").toUpperCase() === statusFilter ||
      String(loan.npaCategory || "").toUpperCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className={`loan-list-panel ${className}`}>
      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Loan Accounts</h2>
            <p>Active, pending disbursement, and closed loan contracts</p>
          </div>
          <div className="panel-actions">
            {appsCount > 0 && onViewApplications && (
              <button
                type="button"
                className="secondary-button"
                onClick={onViewApplications}
                title="View Underwriting Applications"
              >
                Applications Queue ({appsCount})
              </button>
            )}
            {onNewApplication && (
              <button
                type="button"
                className="primary-button"
                onClick={onNewApplication}
              >
                + Apply for Loan
              </button>
            )}
            <button
              type="button"
              className="secondary-button"
              onClick={loadLoans}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by Loan ID or Customer ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="statusFilter">Status:</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Loans</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_DISBURSEMENT">Pending Disbursement</option>
              <option value="CLOSED">Closed / Paid Off</option>
              <option value="STANDARD">Standard Assets</option>
              <option value="NPA">NPA Only</option>
            </select>
          </div>
        </div>

        {/* Loan Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Loan ID</th>
                <th>Customer</th>
                <th>Principal</th>
                <th>Outstanding</th>
                <th>Tenure</th>
                <th>EMI</th>
                <th>Status</th>
                <th>NPA Category</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-state">
                    {loading ? (
                      "Loading loan accounts..."
                    ) : searchQuery || statusFilter !== "ALL" ? (
                      "No loans match the current filters."
                    ) : appsCount > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "16px" }}>
                        <div>No active loan contracts yet. You have <strong>{appsCount}</strong> credit application(s) awaiting review in the Underwriting Queue.</div>
                        {onViewApplications && (
                          <button
                            type="button"
                            className="primary-button"
                            style={{ fontSize: "12px", padding: "6px 14px", marginTop: "4px" }}
                            onClick={onViewApplications}
                          >
                            View Underwriting Queue ({appsCount})
                          </button>
                        )}
                      </div>
                    ) : (
                      "No loans originated yet. Submit an application to get started."
                    )}
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => {
                  const status = String(loan.status || "ACTIVE").toUpperCase();
                  const npa = String(loan.npaCategory || "STANDARD").toUpperCase();
                  const cust = customers[loan.customerId];

                  return (
                    <tr key={loan.id}>
                      <td className="account-number font-mono">
                        {String(loan.id).substring(0, 8)}...
                      </td>
                      <td className="customer-cell">
                        <div>
                          <strong style={{ color: "var(--text-primary, #edf3fb)", fontSize: "13px", display: "block" }}>
                            {cust?.name || (loan.customerId ? `Cust #${String(loan.customerId).slice(0, 8)}` : "N/A")}
                          </strong>
                          <small style={{ color: "var(--text-secondary, #8fa3bd)", fontSize: "11px", display: "block" }}>
                            {cust?.email || (loan.customerId ? `CUST-${String(loan.customerId).replace(/-/g, "").slice(0, 8).toUpperCase()}` : "")}
                          </small>
                          {cust?.kycStatus && (
                            <span className={`status-badge status-${String(cust.kycStatus).toLowerCase()}`} style={{ fontSize: "9px", padding: "1px 5px", marginTop: "2px" }}>
                              KYC: {cust.kycStatus}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{money(loan.principalAmount || loan.principal || 0)}</td>
                      <td className="amount-cell">
                        <strong>{money(loan.outstandingAmount || loan.outstandingBalance || 0)}</strong>
                      </td>
                      <td>
                        <div>{loan.tenureMonths}m</div>
                        {loan.startDate && (
                          <small style={{ color: "var(--text-muted, #8fa3bd)", fontSize: "10px", display: "block" }}>
                            Due: {formatDate(loan.startDate)}
                          </small>
                        )}
                      </td>
                      <td className="text-primary font-medium">
                        {money(loan.emiAmount || 0)}
                      </td>
                      <td>
                        <span className={`status-badge status-${status.toLowerCase()}`}>
                          {status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${npa.toLowerCase()}`}>
                          {npa.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td>
                        <div className="action-button-group">
                          {status === "PENDING_DISBURSEMENT" && (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleDisburse(loan.id)}
                              title="Disburse Loan to Customer Account"
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <CheckCircle size={13} /> Disburse
                            </button>
                          )}
                          {onSelectLoan && (
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={() => onSelectLoan(loan)}
                              title="View Details"
                            >
                              <Eye size={13} /> Details
                            </button>
                          )}
                          {onViewSchedule && (
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={() => onViewSchedule(loan)}
                              title="View Schedule"
                            >
                              <Calendar size={13} /> Schedule
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default LoanList;
