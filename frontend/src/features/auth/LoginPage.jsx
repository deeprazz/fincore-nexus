import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../../components/ui/ThemeToggle";

export function LoginPage() {
  const [activeTab, setActiveTab] = useState("staff");
  const [username, setUsername] = useState("teller");
  const [password, setPassword] = useState("Teller@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError("");
    if (tab === "staff") {
      setUsername("teller");
      setPassword("Teller@123");
    } else {
      setUsername("aman@example.com");
      setPassword("Aman@123");
    }
  };

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
      setError(err.message || "Invalid credentials. Please verify username and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-theme-bar">
        <ThemeToggle />
      </div>

      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand-header">
          <div className="brand-mark login-mark">
            <Activity size={24} />
          </div>
          <div>
            <div className="brand-name">FinCore Nexus</div>
            <div className="brand-subtitle">Digital Banking Platform</div>
          </div>
        </div>

        {/* Role Selector Tabs */}
        <div className="login-role-tabs">
          <button
            type="button"
            className={`login-role-tab ${activeTab === "staff" ? "active" : ""}`}
            onClick={() => handleTabChange("staff")}
          >
            Staff Portal
          </button>
          <button
            type="button"
            className={`login-role-tab ${activeTab === "customer" ? "active" : ""}`}
            onClick={() => handleTabChange("customer")}
          >
            Customer Banking
          </button>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <label>
          {activeTab === "staff" ? "Staff Username / ID" : "Email Address"}
          <input
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={activeTab === "staff" ? "teller" : "name@example.com"}
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
            placeholder="••••••••"
            required
            disabled={loading}
          />
        </label>

        <button className="primary-button login-submit" type="submit" disabled={loading}>
          {loading ? "Authenticating..." : activeTab === "staff" ? "Sign in to Staff Workspace" : "Sign in to Customer Portal"}
        </button>

        <div className="login-quick-demo">
          <span className="quick-demo-label">Quick Sign-in:</span>
          <button
            type="button"
            className="quick-demo-pill"
            onClick={() => handleTabChange("staff")}
          >
            Staff (teller)
          </button>
          <button
            type="button"
            className="quick-demo-pill"
            onClick={() => handleTabChange("customer")}
          >
            Customer (aman)
          </button>
        </div>

        <div className="login-footer-row">
          <span className="login-secure-note">
            <ShieldCheck size={14} className="text-emerald-500" /> 256-bit Encrypted Session
          </span>
          <Link to="/register" className="text-button text-xs">
            New customer registration
          </Link>
        </div>
      </form>
    </div>
  );
}

export default LoginPage;
