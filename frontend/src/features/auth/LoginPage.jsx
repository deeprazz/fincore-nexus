import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export function LoginPage() {
  const [username, setUsername] = useState("teller");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(username, password);
      if (res.role === "CUSTOMER") {
        navigate("/portal");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.message || "Login failed");
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
        <p className="login-subtitle">Customer or Teller sign in</p>

        {error && <div className="alert-error">{error}</div>}

        <label>
          Email / teller username
          <input
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </label>

        <button className="primary-button login-submit" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in securely"}
        </button>

        <p className="login-help">
          New customer?{" "}
          <Link to="/register" className="text-button">
            Register here
          </Link>
        </p>
        <p className="login-help" style={{ fontSize: "0.8125rem", lineHeight: "1.4" }}>
          Demo Staff Credentials:
          <br />
          • Staff Access: <strong>teller</strong> / <strong>Teller@123</strong>
          <br />
          <span style={{ color: "#94a3b8" }}>Full banking permissions (Operations, KYC, Accounts &amp; Audit)</span>
        </p>
        <p className="login-warning">
          New customers register below. Staff approval is required before banking access.
        </p>
      </form>
    </div>
  );
}

export default LoginPage;
