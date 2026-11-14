import React, { useState } from "react";
import { withdraw } from "../../api/accounts";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useMoney } from "../../hooks/useMoney";

export function WithdrawForm({ accounts = [], onOperationSuccess }) {
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const { auth } = useAuth();
  const { setError, setSuccess } = useToast();
  const money = useMoney();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Withdrawal amount must be greater than zero.");
      return;
    }
    if (Math.round(parsed * 100) !== parsed * 100) {
      setError("Withdrawal amount can have at most two decimal places.");
      return;
    }

    setLoading(true);
    try {
      await withdraw(accountId, parsed, auth);
      setSuccess(`Withdrew ${money(parsed)} successfully.`);
      setAmount("");
      if (onOperationSuccess) onOperationSuccess();
    } catch (err) {
      setError(err.message || "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="operation-form" onSubmit={handleSubmit}>
      <label>
        Account
        <select
          required
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
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
        {loading ? "Processing…" : "Confirm withdrawal"}
      </button>
    </form>
  );
}

export default WithdrawForm;
