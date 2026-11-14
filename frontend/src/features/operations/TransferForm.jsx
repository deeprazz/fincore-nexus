import React, { useState } from "react";
import { transfer } from "../../api/accounts";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useMoney } from "../../hooks/useMoney";

export function TransferForm({ accounts = [], onOperationSuccess }) {
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const { auth } = useAuth();
  const { setError, setSuccess } = useToast();
  const money = useMoney();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!fromAccountId) {
      setError("Source account is required.");
      return;
    }
    if (!toAccountId) {
      setError("Destination account is required.");
      return;
    }
    if (fromAccountId === toAccountId) {
      setError("Cannot transfer to the same account.");
      return;
    }

    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Transfer amount must be greater than zero.");
      return;
    }
    if (Math.round(parsed * 100) !== parsed * 100) {
      setError("Transfer amount can have at most two decimal places.");
      return;
    }

    setLoading(true);
    try {
      await transfer(fromAccountId, toAccountId, parsed, auth);
      setSuccess(`Transferred ${money(parsed)} successfully.`);
      setAmount("");
      if (onOperationSuccess) onOperationSuccess();
    } catch (err) {
      setError(err.message || "Transfer failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="operation-form" onSubmit={handleSubmit}>
      <label>
        From account
        <select
          required
          value={fromAccountId}
          onChange={(e) => setFromAccountId(e.target.value)}
          disabled={loading}
        >
          <option value="">Select account</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.accountNumber} — {money(account.balance)}
            </option>
          ))}
        </select>
      </label>

      <label>
        To account
        <select
          required
          value={toAccountId}
          onChange={(e) => setToAccountId(e.target.value)}
          disabled={loading}
        >
          <option value="">Select destination</option>
          {accounts
            .filter((account) => account.id !== fromAccountId)
            .map((account) => (
              <option key={account.id} value={account.id}>
                {account.accountNumber} — {money(account.balance)}
              </option>
            ))}
        </select>
      </label>

      <label>
        Amount (₹)
        <input
          type="number"
          min="0.01"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          disabled={loading}
        />
      </label>

      <button className="primary-button" type="submit" disabled={loading}>
        {loading ? "Processing…" : "Confirm transfer"}
      </button>
    </form>
  );
}

export default TransferForm;
