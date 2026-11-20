import React, { useState } from "react";
import Button from "../../components/ui/Button";
import FormField from "../../components/ui/FormField";

export default function BeneficiaryForm({ customerId, onCreated, onCancel }) {
  const [formData, setFormData] = useState({
    name: "",
    accountNumber: "",
    ifscCode: "FINC0001234",
    bankName: "FinCore Nexus Partner Bank",
    vpa: "",
    email: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmedAccount = formData.accountNumber.trim();
    const trimmedIfsc = formData.ifscCode.trim().toUpperCase();

    if (!/^[0-9]{9,18}$/.test(trimmedAccount)) {
      setError("Account number must be 9 to 18 digits.");
      return;
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(trimmedIfsc)) {
      setError("Invalid IFSC format. Must be 4 uppercase letters, a '0', and 6 alphanumeric characters (e.g., FINC0001234).");
      return;
    }

    if (formData.vpa && !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(formData.vpa.trim())) {
      setError("Invalid UPI VPA format. Must be like username@bank or mobile@upi.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        accountNumber: trimmedAccount,
        ifscCode: trimmedIfsc,
        vpa: formData.vpa ? formData.vpa.trim() : null,
        customerId: customerId || "00000000-0000-0000-0000-000000000001",
      };
      await onCreated(payload);
    } catch (err) {
      setError(err.message || "Failed to add beneficiary");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-sm">
          {error}
        </div>
      )}

      <div className="p-2.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center justify-between">
        <span>
          <strong>Note:</strong> Registered beneficiaries require a simulated ₹1.00 penny-drop verification before funds can be transferred.
        </span>
        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/40">
          Simulated
        </span>
      </div>

      <FormField label="Beneficiary Full Name" required>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Priya Sharma"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Account Number (9-18 digits)" required>
          <input
            type="text"
            className="form-input font-mono"
            placeholder="100000000002"
            value={formData.accountNumber}
            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
            required
          />
        </FormField>

        <FormField label="IFSC Code (e.g. FINC0001234)" required>
          <input
            type="text"
            className="form-input font-mono uppercase"
            placeholder="FINC0001234"
            value={formData.ifscCode}
            onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
            required
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Bank Name">
          <input
            type="text"
            className="form-input"
            placeholder="e.g. State Bank of India"
            value={formData.bankName}
            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
          />
        </FormField>

        <FormField label="UPI VPA (Optional)">
          <input
            type="text"
            className="form-input"
            placeholder="username@upi"
            value={formData.vpa}
            onChange={(e) => setFormData({ ...formData, vpa: e.target.value })}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Email">
          <input
            type="email"
            className="form-input"
            placeholder="beneficiary@domain.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </FormField>

        <FormField label="Phone Number">
          <input
            type="tel"
            className="form-input"
            placeholder="+91-9876543210"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </FormField>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" loading={submitting}>
          Save Beneficiary
        </Button>
      </div>
    </form>
  );
}
