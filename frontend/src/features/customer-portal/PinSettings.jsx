import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { setOrChangePortalPin } from "../../api/portal";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export function PinSettings() {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);

  const { auth, customerPortal, refreshPortalData } = useAuth();
  const { setError, setSuccess } = useToast();

  const hasPin = Boolean(customerPortal?.hasTransactionPin);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!/^\d{4}$/.test(newPin)) {
      setError("New PIN must contain exactly 4 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setError("New PIN and confirmation PIN do not match.");
      return;
    }

    setLoading(true);
    try {
      await setOrChangePortalPin(hasPin ? currentPin : null, newPin, auth);
      setSuccess("Transaction PIN saved successfully.");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      await refreshPortalData();
    } catch (err) {
      setError(err.message || "Failed to update transaction PIN");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="customer-section">
      <div className="customer-section-heading">
        <div>
          <span className="customer-section-kicker">ACCOUNT SECURITY</span>
          <h3>{hasPin ? "Change your transaction PIN" : "Set up your transaction PIN"}</h3>
        </div>
        <span className={`customer-status-pill ${hasPin ? "verified" : "pending"}`}>
          {hasPin ? "PIN ACTIVE" : "SETUP REQUIRED"}
        </span>
      </div>
      <p className="customer-muted">
        Your 4-digit PIN is used to approve transfers. It is checked securely by the
        server and is never shown back to you.
      </p>
      <form className="customer-transfer-form" onSubmit={handleSubmit}>
        {hasPin && (
          <label>
            Current PIN
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              pattern="[0-9]{4}"
              maxLength={4}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              required
              disabled={loading}
            />
          </label>
        )}
        <label>
          New PIN
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            pattern="[0-9]{4}"
            maxLength={4}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="4 digits"
            required
            disabled={loading}
          />
        </label>
        <label>
          Confirm new PIN
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            pattern="[0-9]{4}"
            maxLength={4}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Repeat PIN"
            required
            disabled={loading}
          />
        </label>
        <button
          className="primary-button customer-transfer-submit"
          type="submit"
          disabled={loading}
        >
          {loading ? "Saving…" : hasPin ? "Update PIN" : "Save PIN"}
          <ShieldCheck size={15} />
        </button>
      </form>
    </section>
  );
}

export default PinSettings;
