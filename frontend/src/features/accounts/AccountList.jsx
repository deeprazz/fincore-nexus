import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AccountForm } from "./AccountForm";
import { AccountActions } from "./AccountActions";
import { getAccounts } from "../../api/accounts";
import { getCustomers } from "../../api/customers";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useMoney } from "../../hooks/useMoney";

export function AccountList() {
  const [accounts, setAccounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const { auth } = useAuth();
  const { setError } = useToast();
  const money = useMoney();
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accs, custs] = await Promise.all([
        getAccounts(auth),
        getCustomers("ALL", auth),
      ]);
      setAccounts(Array.isArray(accs) ? accs : []);
      setCustomers(Array.isArray(custs) ? custs : []);
    } catch (err) {
      setError(err.message || "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, [auth, setError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      <AccountForm customers={customers} onAccountCreated={loadData} />

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Accounts</h2>
            <p>Accounts retrieved from Spring Boot</p>
          </div>
          <button
            className="secondary-button"
            onClick={loadData}
            disabled={loading}
            type="button"
          >
            Refresh
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Account Number</th>
                <th>Account Ref</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const status = account.status || "ACTIVE";
                return (
                  <tr key={account.id}>
                    <td className="account-number">{account.accountNumber}</td>
                    <td className="muted-cell" title={`UUID: ${account.id}`}>
                      #{String(account.id).replace(/-/g, "").slice(0, 8).toUpperCase()}
                    </td>
                    <td>{money(account.balance)}</td>
                    <td>
                      <span className={`kyc-status kyc-${status.toLowerCase()}`}>
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

              {!accounts.length && !loading && (
                <tr>
                  <td colSpan="5" className="empty-state">
                    No accounts loaded. Click Refresh.
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
