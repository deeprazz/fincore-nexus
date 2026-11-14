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
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...formData,
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
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

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
        <FormField label="Account Number" required>
          <input
            type="text"
            className="form-input"
            placeholder="100000000002"
            value={formData.accountNumber}
            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
            required
          />
        </FormField>

        <FormField label="IFSC Code" required>
          <input
            type="text"
            className="form-input"
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
