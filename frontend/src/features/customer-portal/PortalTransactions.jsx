import React, { useState, useEffect, useCallback } from "react";
import { Activity } from "lucide-react";
import { getAccountTransactions } from "../../api/transactions";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useMoney } from "../../hooks/useMoney";

export function PortalTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const { auth, customerPortal } = useAuth();
  const { setError } = useToast();
  const money = useMoney();

  const customerAccounts = customerPortal?.accounts || [];
  const primaryAccount = customerAccounts[0];
  const canBank = customerPortal?.kycStatus === "VERIFIED";

  const loadTransactions = useCallback(async () => {
    if (!primaryAccount?.id) return;
    setLoading(true);
    try {
      const data = await getAccountTransactions(primaryAccount.id, auth);
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [primaryAccount, auth, setError]);

  useEffect(() => {
    if (canBank && primaryAccount?.id) {
      loadTransactions();
    }
  }, [canBank, primaryAccount?.id, loadTransactions]);

  return (
    <>
      <div className="customer-page-header">
        <div>
          <div className="customer-eyebrow">PERSONAL BANKING</div>
          <h1>Transactions</h1>
          <p>A record of money moving in and out.</p>
        </div>
      </div>

      <section className="customer-section">
        <div className="customer-section-heading">
          <div>
            <span className="customer-section-kicker">ACCOUNT ACTIVITY</span>
            <h3>Transactions</h3>
          </div>
          <span className="customer-muted">Latest activity</span>
        </div>
        {!canBank ? (
          <p className="customer-muted">
            Transaction history will be available after your account is verified.
          </p>
        ) : loading ? (
          <p className="customer-muted">Loading transactions…</p>
        ) : transactions.length ? (
          <div className="customer-transactions-wrap">
            <table className="customer-transactions-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Amount</th>
                  <th>Balance after</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{String(tx.transactionType || "").replaceAll("_", " ")}</td>
                    <td>{money(tx.amount)}</td>
                    <td>{money(tx.balanceAfter)}</td>
                    <td>
                      {tx.createdAt
                        ? new Date(tx.createdAt).toLocaleString("en-IN")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="customer-empty-state">
            <span>
              <Activity size={20} />
            </span>
            <strong>No transactions yet</strong>
            <p>
              Your banking activity will appear here when you make your first transaction.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

export default PortalTransactions;
