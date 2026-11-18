import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, ShieldCheck } from "lucide-react";
import { registerCustomer } from "../../api/portal";
import ThemeToggle from "../../components/ui/ThemeToggle";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [pan, setPan] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

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

    // Validate PAN (10 chars: 5 letters, 4 digits, 1 letter)
    const cleanPan = pan.trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      setError("Please enter a valid 10-character PAN card number (e.g. ABCDE1234F).");
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      await registerCustomer({
        name: name.trim(),
        email: cleanEmail,
        password,
        phoneNumber: cleanPhone,
        aadhaarNumber: cleanAadhaar,
        panNumber: cleanPan,
      });
      navigate("/login", {
        state: {
          registeredEmail: cleanEmail,
          message: "Registration submitted successfully! Please sign in with your credentials. Your KYC status is Pending Teller verification.",
        },
      });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-theme-bar">
        <ThemeToggle />
      </div>

      <form className="login-card" style={{ maxWidth: "480px" }} onSubmit={handleSubmit}>
        <div className="login-brand-header">
          <div className="brand-mark login-mark">
            <Activity size={24} />
          </div>
          <div>
            <div className="brand-name">FinCore Nexus</div>
            <div className="brand-subtitle">Digital Banking Platform</div>
          </div>
        </div>

        <h2 style={{ fontSize: "17px", fontWeight: 700, margin: "4px 0 0 0" }}>New Customer Registration</h2>
        <p className="login-subtitle" style={{ margin: "0 0 8px 0" }}>
          Provide your identity details for KYC onboarding. A Teller will verify your record to unlock full banking services.
        </p>

        {error && <div className="alert-error">{error}</div>}

        <label>
          Full Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aman Sharma"
            required
            maxLength={100}
            disabled={loading}
          />
        </label>

        <label>
          Email Address
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. aman@example.com"
            required
            disabled={loading}
          />
        </label>

        <label>
          Phone Number (10 digits)
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
        </div>

        <label>
          Password (at least 8 characters)
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={8}
            required
            disabled={loading}
          />
        </label>

        <button className="primary-button login-submit" type="submit" disabled={loading}>
          {loading ? "Registering Record..." : "Register & Submit KYC"}
        </button>

        <p className="login-help">
          Already registered?{" "}
          <Link to="/login" className="text-button">
            Sign in
          </Link>
        </p>

        <p className="login-note-secure">
          <ShieldCheck size={14} className="text-emerald-500" style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
          Your Aadhaar and PAN numbers are encrypted and stored in compliance with RBI KYC guidelines.
        </p>
      </form>
    </div>
  );
}

export default RegisterPage;
