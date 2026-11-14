import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity } from "lucide-react";
import { registerCustomer } from "../../api/portal";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await registerCustomer(name.trim(), email.trim(), password);
      navigate("/login", {
        state: { message: "Account registered successfully. Please sign in." },
      });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="brand-mark login-mark">
          <Activity size={24} />
        </div>
        <div className="brand-name">FinCore Nexus</div>
        <p className="login-subtitle">Create your customer profile</p>

        {error && <div className="alert-error">{error}</div>}

        <label>
          Full name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            disabled={loading}
          />
        </label>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </label>
        <label>
          Password (at least 8 characters)
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            disabled={loading}
          />
        </label>

        <button className="primary-button login-submit" type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register as customer"}
        </button>

        <p className="login-help">
          Already registered?{" "}
          <Link to="/login" className="text-button">
            Sign in
          </Link>
        </p>
        <p className="login-warning">
          New customers start with KYC Pending. Teller approval is required before banking access.
        </p>
      </form>
    </div>
  );
}

export default RegisterPage;
