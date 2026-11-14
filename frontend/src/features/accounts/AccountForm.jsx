import React, { useState } from "react";
import { Wallet } from "lucide-react";
import { createAccount } from "../../api/accounts";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export function AccountForm({ customers = [], onAccountCreated }) {
  const [customerId, setCustomerId] = useState("");
  const [initialBalance, setInitialBalance] = useState("0");
  const [loading, setLoading] = useState(false);

  const { auth } = useAuth();
  const { setError, setSuccess } = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const bal = Number(initialBalance);
    if (!Number.isFinite(bal) || bal < 0) {
      setError("Initial balance must be zero or greater.");
      return;
    }
    if (Math.round(bal * 100) !== bal * 100) {
      setError("Initial balance can have at most two decimal places.");
      return;
    }

    setLoading(true);
    try {
      await createAccount(customerId, bal, auth);
      setSuccess("Account opened successfully.");
      setCustomerId("");
      setInitialBalance("0");
      if (onAccountCreated) onAccountCreated();
    } catch (err) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Create Bank Account</h2>
          <p>Choose a registered customer and set the opening balance</p>
        </div>
      </div>
      <form className="operation-form customer-form" onSubmit={handleSubmit}>
        <label>
          Account owner
          <select
            required
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            disabled={loading || !customers.length}
          >
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.email} ({c.kycStatus})
              </option>
            ))}
          </select>
        </label>
        <label>
          Initial balance (₹)
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            placeholder="Enter opening balance"
            disabled={loading}
          />
        </label>
        <button
          className="primary-button"
          type="submit"
          disabled={loading || !customers.length}
        >
          <Wallet size={16} />
          {loading ? "Creating account…" : "Create Account"}
        </button>
        {!customers.length && (
          <span className="field-hint">
            Register a customer first to create an account.
          </span>
        )}
      </form>
    </section>
  );
}

export default AccountForm;
