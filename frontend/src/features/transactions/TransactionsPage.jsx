import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { TransactionTable } from "./TransactionTable";
import { getAccounts } from "../../api/accounts";
import { getAccountTransactions } from "../../api/transactions";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialAccountId = searchParams.get("accountId") || "";

  const [accountId, setAccountId] = useState(initialAccountId);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const { auth } = useAuth();
  const { setError } = useToast();

  const loadAccounts = useCallback(async () => {
    try {
      const data = await getAccounts(auth);
      setAccounts(Array.isArray(data) ? data : []);
      if (!accountId && Array.isArray(data) && data.length > 0) {
        setAccountId(data[0].id);
      }
    } catch (err) {
      setError(err.message || "Failed to load accounts");
    }
  }, [auth, accountId, setError]);

  const loadTransactions = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getAccountTransactions(id, auth);
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [auth, setError]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (accountId) {
      loadTransactions(accountId);
      setSearchParams({ accountId });
    }
  }, [accountId, loadTransactions, setSearchParams]);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Account Transaction History</h2>
          <p>
            Choose an account to inspect all completed ledger transactions
          </p>
        </div>
      </div>

      <div className="statement-filters">
        <label>
          Account
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            disabled={loading}
          >
            <option value="">Select account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.accountNumber}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p className="field-hint">Loading transactions…</p>}
      <TransactionTable transactions={transactions} />
    </section>
  );
}

export default TransactionsPage;
