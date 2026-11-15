import React, { useState, useEffect } from "react";
import Button from "../../components/ui/Button";
import FormField from "../../components/ui/FormField";

const RAILS = [
  { id: "IMPS", name: "IMPS (Immediate Payment)", limit: "₹5,00,000", badge: "Instant 24x7" },
  { id: "UPI", name: "UPI (Unified Payments)", limit: "₹1,00,000", badge: "VPA Instant" },
  { id: "NEFT", name: "NEFT (National Electronic)", limit: "₹10,00,000", badge: "Half-hourly Batch" },
];

export default function PaymentForm({
  accounts = [],
  beneficiaries = [],
  onSubmitPayment,
  defaultBeneficiary = null,
}) {
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id || "");
  const [paymentRail, setPaymentRail] = useState("IMPS");
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState(defaultBeneficiary?.id || "");
  const [targetAccount, setTargetAccount] = useState(defaultBeneficiary?.accountNumber || "");
  const [targetIfsc, setTargetIfsc] = useState(defaultBeneficiary?.ifscCode || "FINC0001234");
  const [targetVpa, setTargetVpa] = useState(defaultBeneficiary?.vpa || "");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sourceAccountId && accounts.length > 0) {
      setSourceAccountId(accounts[0].id);
    }
  }, [accounts, sourceAccountId]);

  const handleBeneficiaryChange = (e) => {
    const val = e.target.value;
    setSelectedBeneficiaryId(val);
    const ben = beneficiaries.find((b) => b.id === val);
    if (ben) {
      setTargetAccount(ben.accountNumber);
      setTargetIfsc(ben.ifscCode || "FINC0001234");
      setTargetVpa(ben.vpa || "");
    } else {
      setTargetAccount("");
      setTargetIfsc("FINC0001234");
      setTargetVpa("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const selectedAcc = accounts.find((a) => a.id === sourceAccountId) || accounts[0];
      const payload = {
        customerId: selectedAcc?.customerId || "00000000-0000-0000-0000-000000000001",
        sourceAccountId: selectedAcc?.id || sourceAccountId || "00000000-0000-0000-0000-000000000002",
        beneficiaryId: selectedBeneficiaryId || null,
        targetAccountNumber: paymentRail === "UPI" ? "" : targetAccount,
        targetIfsc: paymentRail === "UPI" ? "UPI0000000" : (targetIfsc || "FINC0001234"),
        targetVpa: paymentRail === "UPI" ? targetVpa : "",
        amount: parseFloat(amount),
        paymentRail,
        purpose: purpose || "Fund Transfer",
      };
      await onSubmitPayment(payload);
    } catch (err) {
      setError(err.message || "Failed to initiate payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {/* Rail Selection */}
      <div>
        <label className="block text-sm font-semibold mb-2">Select Transfer Rail</label>
        <div className="rails-grid">
          {RAILS.map((rail) => (
            <div
              key={rail.id}
              onClick={() => setPaymentRail(rail.id)}
              className={`rail-card ${paymentRail === rail.id ? "active" : ""}`}
            >
              <div className="rail-card-header">
                <span className="rail-card-title">{rail.id}</span>
                <span className="rail-card-badge">{rail.badge}</span>
              </div>
              <div className="rail-card-limit">Max: {rail.limit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Source Account Selection */}
      <FormField label="From Source Account" required>
        <select
          className="form-input"
          value={sourceAccountId}
          onChange={(e) => setSourceAccountId(e.target.value)}
          required
        >
          {accounts.length > 0 ? (
            accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.accountNumber} — Balance: ₹{Number(acc.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </option>
            ))
          ) : (
            <option value="">No active accounts found</option>
          )}
        </select>
      </FormField>

      {/* Beneficiary selection */}
      <FormField label="Select Beneficiary (or enter manually)">
        <select
          className="form-input"
          value={selectedBeneficiaryId}
          onChange={handleBeneficiaryChange}
        >
          <option value="">-- Manual / Direct Transfer --</option>
          {beneficiaries.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.accountNumber || b.vpa} - {b.status})
            </option>
          ))}
        </select>
      </FormField>

      {/* Account / IFSC or VPA based on Rail */}
      {paymentRail === "UPI" ? (
        <FormField label="Recipient UPI VPA" required>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. mobile@upi or name@icici"
            value={targetVpa}
            onChange={(e) => setTargetVpa(e.target.value)}
            required
          />
          <span className="text-2xs text-muted block mt-1">
            Virtual Payment Address (No IFSC required for UPI rails)
          </span>
        </FormField>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Destination Account Number" required>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 1000-0000-0012"
              value={targetAccount}
              onChange={(e) => setTargetAccount(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Destination IFSC Code" required>
            <input
              type="text"
              className="form-input"
              placeholder="FINC0001234"
              value={targetIfsc}
              onChange={(e) => setTargetIfsc(e.target.value.toUpperCase())}
              required
            />
            <span className="text-2xs text-muted block mt-1">
              FinCore branch IFSC: FINC0001234 (Pre-filled for internal transfers)
            </span>
          </FormField>
        </div>
      )}

      {/* Amount and Purpose */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Amount (INR)" required>
          <input
            type="number"
            step="0.01"
            min="1"
            className="form-input"
            placeholder="5000.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </FormField>

        <FormField label="Payment Remarks / Purpose">
          <input
            type="text"
            className="form-input"
            placeholder="Invoice / Vendor Settlement / Rent"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </FormField>
      </div>

      <div className="pt-2">
        <Button type="submit" variant="primary" loading={submitting} className="w-full md:w-auto">
          Execute Payment via {paymentRail}
        </Button>
      </div>
    </form>
  );
}
