import React, { useState, useEffect, useCallback } from "react";
import { DepositForm } from "./DepositForm";
import { WithdrawForm } from "./WithdrawForm";
import { TransferForm } from "./TransferForm";
import { getAccounts } from "../../api/accounts";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export function OperationsPage() {
  const [operation, setOperation] = useState("DEPOSIT");
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  const { auth } = useAuth();
  const { setError, clearMessages } = useToast();

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAccounts(auth);
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load accounts for operations");
    } finally {
      setLoading(false);
    }
  }, [auth, setError]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  function handleTabChange(tab) {
    setOperation(tab);
    clearMessages();
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Banking Operations</h2>
          <p>Deposit, withdraw, or transfer funds between accounts.</p>
        </div>
      </div>

      <div className="operation-tabs">
        {[
          ["DEPOSIT", "Deposit"],
          ["WITHDRAWAL", "Withdraw"],
          ["TRANSFER", "Transfer"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`operation-tab ${
              operation === value ? "selected" : ""
            }`}
            onClick={() => handleTabChange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && !accounts.length ? (
        <p className="field-hint">Loading accounts…</p>
      ) : (
        <>
          {operation === "DEPOSIT" && (
            <DepositForm accounts={accounts} onOperationSuccess={loadAccounts} />
          )}
          {operation === "WITHDRAWAL" && (
            <WithdrawForm accounts={accounts} onOperationSuccess={loadAccounts} />
          )}
          {operation === "TRANSFER" && (
            <TransferForm accounts={accounts} onOperationSuccess={loadAccounts} />
          )}
        </>
      )}
    </section>
  );
}

export default OperationsPage;
