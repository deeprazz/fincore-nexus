import React, { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { PinSettings } from "./PinSettings";
import { portalTransfer } from "../../api/portal";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useMoney } from "../../hooks/useMoney";

export function PortalTransfer() {
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const { auth, customerPortal, refreshPortalData } = useAuth();
  const { setError, setSuccess } = useToast();
  const money = useMoney();

  const customerAccounts = customerPortal?.accounts || [];
  const canBank = customerPortal?.kycStatus === "VERIFIED";
  const primaryAccount = customerAccounts[0];
  const hasPin = Boolean(customerPortal?.hasTransactionPin);

  async function handleTransfer(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!primaryAccount) {
      setError("No active bank account available for transfer.");
      return;
    }
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Please enter a valid positive transfer amount.");
      return;
    }
    if (Math.round(parsed * 100) !== parsed * 100) {
      setError("Amount can have at most two decimal places.");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError("A 4-digit transaction PIN is required.");
      return;
    }

    setLoading(true);
    try {
      await portalTransfer(primaryAccount.id, destination.trim(), parsed, pin, auth);
      setSuccess(`Transfer of ${money(parsed)} completed successfully.`);
      setDestination("");
      setAmount("");
      setPin("");
      await refreshPortalData();
    } catch (err) {
      setError(err.message || "Transfer failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="customer-page-header">
        <div>
          <div className="customer-eyebrow">PERSONAL BANKING</div>
          <h1>Transfer money</h1>
          <p>Send money to another FinCore account.</p>
        </div>
      </div>

      {!canBank ? (
        <section className="customer-section customer-kyc-pending">
          <h3>Transfers aren’t available yet</h3>
          <p>Once your KYC is approved, you’ll be able to send money from here.</p>
        </section>
      ) : (
        <>
          <section className="customer-section">
            <div className="customer-section-heading">
              <div>
                <span className="customer-section-kicker">PAYMENTS</span>
                <h3>Send money</h3>
              </div>
              <span className="customer-muted">Review details before sending</span>
            </div>
            <p className="customer-muted">
              Double-check the recipient account number and amount before you confirm.
            </p>
            <form className="customer-transfer-form" onSubmit={handleTransfer}>
              <label>
                From account
                <select value={primaryAccount?.id || ""} disabled>
                  {customerAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountNumber} · {money(account.balance)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Recipient account number
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. 1000-0000-0002"
                  required
                  maxLength={30}
                  disabled={loading}
                />
              </label>
              <label>
                Amount (INR)
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  disabled={loading}
                />
              </label>
              <label>
                4-digit transaction PIN
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder={hasPin ? "Enter transaction PIN" : "Set your PIN below first"}
                  required
                  disabled={!hasPin || loading}
                />
              </label>
              <button
                className="primary-button customer-transfer-submit"
                type="submit"
                disabled={loading || !hasPin}
              >
                {loading ? "Sending…" : "Send money"}
                <ArrowLeftRight size={15} />
              </button>
            </form>
          </section>

          <PinSettings />
        </>
      )}
    </>
  );
}

export default PortalTransfer;
