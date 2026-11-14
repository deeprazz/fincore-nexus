import React, { useState, useEffect, useCallback } from "react";
import { getLoans } from "../../api/loans";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { money } from "../../utils/money";
import { Search, Eye, Calendar, RefreshCw, Layers } from "lucide-react";

export function LoanList({
  onSelectLoan,
  onViewSchedule,
  onNewApplication,
  className = "",
}) {
  const { auth } = useAuth();
  const { setError } = useToast();

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadLoans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLoans(auth);
      setLoans(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load loans");
    } finally {
      setLoading(false);
    }
  }, [auth, setError]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const filteredLoans = loans.filter((loan) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(loan.id || "").toLowerCase().includes(q) ||
      String(loan.customerId || "").toLowerCase().includes(q);

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
                <th>Customer ID</th>
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
                    {loading
                      ? "Loading loan accounts..."
                      : searchQuery || statusFilter !== "ALL"
                      ? "No loans match the current filters."
                      : "No loans originated yet. Submit an application to get started."}
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => {
                  const status = String(loan.status || "ACTIVE").toUpperCase();
                  const npa = String(loan.npaCategory || "STANDARD").toUpperCase();

                  return (
                    <tr key={loan.id}>
                      <td className="account-number font-mono">
                        {String(loan.id).substring(0, 8)}...
                      </td>
                      <td className="muted-cell font-mono">
                        {loan.customerId
                          ? `${String(loan.customerId).substring(0, 8)}...`
                          : "N/A"}
                      </td>
                      <td>{money(loan.principalAmount || loan.principal || 0)}</td>
                      <td className="amount-cell">
                        <strong>{money(loan.outstandingAmount || loan.outstandingBalance || 0)}</strong>
                      </td>
                      <td>{loan.tenureMonths}m</td>
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
