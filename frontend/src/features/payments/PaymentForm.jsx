import React, { useState } from "react";
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
  const [sourceAccountId] = useState(accounts[0]?.id || "");
  const [paymentRail, setPaymentRail] = useState("IMPS");
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState(defaultBeneficiary?.id || "");
  const [targetAccount, setTargetAccount] = useState(defaultBeneficiary?.accountNumber || "");
  const [targetIfsc, setTargetIfsc] = useState(defaultBeneficiary?.ifscCode || "");
  const [targetVpa, setTargetVpa] = useState(defaultBeneficiary?.vpa || "");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleBeneficiaryChange = (e) => {
    const val = e.target.value;
    setSelectedBeneficiaryId(val);
    const ben = beneficiaries.find((b) => b.id === val);
    if (ben) {
      setTargetAccount(ben.accountNumber);
      setTargetIfsc(ben.ifscCode);
      setTargetVpa(ben.vpa || "");
    } else {
      setTargetAccount("");
      setTargetIfsc("");
      setTargetVpa("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        customerId: "00000000-0000-0000-0000-000000000001",
        sourceAccountId: sourceAccountId || "00000000-0000-0000-0000-000000000002",
        beneficiaryId: selectedBeneficiaryId || null,
        targetAccountNumber: targetAccount,
        targetIfsc: targetIfsc,
        targetVpa: targetVpa,
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {RAILS.map((rail) => (
            <div
              key={rail.id}
              onClick={() => setPaymentRail(rail.id)}
              className={`cursor-pointer p-3 rounded-lg border text-left transition-all ${
                paymentRail === rail.id
                  ? "border-primary bg-primary-light shadow-sm"
                  : "border-border hover:border-muted"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm">{rail.id}</span>
                <span className="text-2xs bg-surface px-1.5 py-0.5 rounded border text-muted">
                  {rail.badge}
                </span>
              </div>
              <div className="text-xs text-muted">Max: {rail.limit}</div>
            </div>
          ))}
        </div>
      </div>

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
              {b.name} ({b.accountNumber} - {b.status})
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
            placeholder="e.g. merchant@icici or receiver@upi"
            value={targetVpa}
            onChange={(e) => setTargetVpa(e.target.value)}
            required
          />
        </FormField>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Destination Account Number" required>
            <input
              type="text"
              className="form-input"
              placeholder="100000000002"
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
