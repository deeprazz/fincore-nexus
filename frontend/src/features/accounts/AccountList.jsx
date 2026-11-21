import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Snowflake } from "lucide-react";
import { AccountForm } from "./AccountForm";
import { AccountActions } from "./AccountActions";
import { getAccounts } from "../../api/accounts";
import { getCustomers } from "../../api/customers";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useMoney } from "../../hooks/useMoney";
import { subscribeToAccountChanges } from "../../utils/syncChannel";

export function AccountList() {
  const [accounts, setAccounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | ACTIVE | FROZEN | CLOSED

  const { auth } = useAuth();
  const { setError } = useToast();
  const money = useMoney();
  const navigate = useNavigate();

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [accs, custs] = await Promise.all([
        getAccounts(auth),
        getCustomers("ALL", auth),
      ]);
      setAccounts(Array.isArray(accs) ? accs : []);
      setCustomers(Array.isArray(custs) ? custs : []);
    } catch (err) {
      if (!silent) setError(err.message || "Failed to load accounts");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [auth, setError]);

  useEffect(() => {
    loadData();
    // Gentle 8s background poll + instant cross-tab broadcast subscription (0ms push)
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        loadData(true);
      }
    }, 8000);
    const unsubscribe = subscribeToAccountChanges(() => {
      loadData(true);
    });
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [loadData]);

  const customerMap = useMemo(() => {
    const map = new Map();
    customers.forEach((c) => {
      map.set(c.id, c.name || c.email);
    });
    return map;
  }, [customers]);

  const frozenCount = useMemo(
    () => accounts.filter((a) => String(a.status).toUpperCase() === "FROZEN").length,
    [accounts]
  );

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const status = (account.status || "ACTIVE").toUpperCase();
      if (statusFilter !== "ALL" && status !== statusFilter) {
        return false;
      }
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const accNum = String(account.accountNumber || "").toLowerCase();
      const custName = String(customerMap.get(account.customerId) || "").toLowerCase();
      const accRef = String(account.id || "").toLowerCase();
      return accNum.includes(term) || custName.includes(term) || accRef.includes(term);
    });
  }, [accounts, statusFilter, searchTerm, customerMap]);

  return (
    <>
      <AccountForm customers={customers} onAccountCreated={loadData} />

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Accounts</h2>
            <p>Live accounts retrieved from Spring Boot with instant freeze/unfreeze status</p>
          </div>
          <button
            className="secondary-button"
            onClick={() => loadData(false)}
            disabled={loading}
            type="button"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            margin: "12px 0 16px 0",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "inline-flex", gap: "6px" }}>
            <button
              type="button"
              className={`filter-pill-btn ${statusFilter === "ALL" ? "active" : ""}`}
              onClick={() => setStatusFilter("ALL")}
            >
              All ({accounts.length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${statusFilter === "ACTIVE" ? "active" : ""}`}
              onClick={() => setStatusFilter("ACTIVE")}
            >
              Active
            </button>
            <button
              type="button"
              className={`filter-pill-btn filter-pill-frozen ${statusFilter === "FROZEN" ? "active" : ""}`}
              onClick={() => setStatusFilter("FROZEN")}
            >
              <Snowflake size={12} />
              Frozen {frozenCount > 0 && `(${frozenCount})`}
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${statusFilter === "CLOSED" ? "active" : ""}`}
              onClick={() => setStatusFilter("CLOSED")}
            >
              Closed
            </button>
          </div>

          <div style={{ position: "relative", minWidth: "240px" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted, #94a3b8)",
              }}
            />
            <input
              type="text"
              placeholder="Search by customer or account #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                paddingLeft: "32px",
                paddingRight: "10px",
                height: "36px",
                fontSize: "12px",
                borderRadius: "8px",
              }}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Account Number</th>
                <th>Customer</th>
                <th>Account Ref</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((account) => {
                const status = (account.status || "ACTIVE").toUpperCase();
                const isFrozen = status === "FROZEN";
                const customerName = customerMap.get(account.customerId) || "—";

                return (
                  <tr key={account.id} className={isFrozen ? "account-row-frozen" : ""}>
                    <td className="account-number">{account.accountNumber}</td>
                    <td>
                      <strong>{customerName}</strong>
                    </td>
                    <td className="muted-cell" title={`UUID: ${account.id}`}>
                      #{String(account.id).replace(/-/g, "").slice(0, 8).toUpperCase()}
                    </td>
                    <td>{money(account.balance)}</td>
                    <td>
                      <span className={`status-badge status-${status.toLowerCase()}`}>
                        {isFrozen && <Snowflake size={11} />}
                        {status}
                      </span>
                    </td>
                    <td className="action-cell">
                      <button
                        type="button"
                        onClick={() => navigate(`/transactions?accountId=${account.id}`)}
                      >
                        History
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/statements?accountId=${account.id}`)}
                      >
                        Statement
                      </button>
                      <AccountActions account={account} onActionComplete={loadData} />
                    </td>
                  </tr>
                );
              })}

              {!filteredAccounts.length && !loading && (
                <tr>
                  <td colSpan="6" className="empty-state">
                    No accounts found matching filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default AccountList;
