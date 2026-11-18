import React, { useState } from "react";
import { UserPlus, ShieldCheck } from "lucide-react";
import { createCustomer } from "../../api/customers";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export function CustomerForm({ onCustomerCreated }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [pan, setPan] = useState("");
  const [password, setPassword] = useState("Customer@123");
  const [loading, setLoading] = useState(false);

  const { auth } = useAuth();
  const { setError, setSuccess } = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate phone
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    // Validate Aadhaar (12 digits)
    const cleanAadhaar = aadhaar.replace(/\D/g, "");
    if (cleanAadhaar.length !== 12) {
      setError("Please enter a valid 12-digit Aadhaar number (e.g. 1234 5678 9012).");
      return;
    }

    // Validate PAN (10 chars)
    const cleanPan = pan.trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      setError("Please enter a valid 10-character PAN card number (e.g. ABCDE1234F).");
      return;
    }

    setLoading(true);
    try {
      await createCustomer(
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phoneNumber: cleanPhone,
          aadhaarNumber: cleanAadhaar,
          panNumber: cleanPan,
          password: password || "Customer@123",
        },
        auth
      );

      setName("");
      setEmail("");
      setPhone("");
      setAadhaar("");
      setPan("");
      setPassword("Customer@123");

      setSuccess("Customer profile created successfully with PENDING KYC. You can now confirm their KYC below.");
      if (onCustomerCreated) onCustomerCreated();
    } catch (err) {
      setError(err.message || "Failed to create customer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Register Customer with KYC Details</h2>
          <p>Create a customer profile with Aadhaar, Phone, and PAN records</p>
        </div>
        <span className="live-badge">
          <span /> KYC ONBOARDING
        </span>
      </div>

      <form className="operation-form customer-form" onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
        <label>
          Full Name
          <input
            type="text"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ramesh Kumar"
            required
            disabled={loading}
          />
        </label>

        <label>
          Email Address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ramesh@example.com"
            required
            disabled={loading}
          />
        </label>

        <label>
          Phone Number
          <input
            type="tel"
            maxLength={15}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 9876543210"
            required
            disabled={loading}
          />
        </label>

        <label>
          Aadhaar ID (12 digits)
          <input
            type="text"
            maxLength={14}
            value={aadhaar}
            onChange={(e) => setAadhaar(e.target.value)}
            placeholder="e.g. 1234 5678 9012"
            required
            disabled={loading}
          />
        </label>

        <label>
          PAN Card Number
          <input
            type="text"
            maxLength={10}
            value={pan}
            onChange={(e) => setPan(e.target.value.toUpperCase())}
            placeholder="e.g. ABCDE1234F"
            required
            disabled={loading}
          />
        </label>

        <label>
          Initial Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Customer@123"
            minLength={8}
            disabled={loading}
          />
        </label>

        <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-start", marginTop: "4px" }}>
          <button className="primary-button" type="submit" disabled={loading}>
            <UserPlus size={16} />
            {loading ? "Registering…" : "Register Customer Profile"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default CustomerForm;
