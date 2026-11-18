import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Activity, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../../components/ui/ThemeToggle";

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, isKeycloakMode, loginWithKeycloak } = useAuth();

  const [activeTab, setActiveTab] = useState(
    location.state?.registeredEmail ? "customer" : "staff"
  );
  const [username, setUsername] = useState(
    location.state?.registeredEmail || "teller"
  );
  const [password, setPassword] = useState(
    location.state?.registeredEmail ? "" : "Teller@123"
  );
  const [successMsg, setSuccessMsg] = useState(location.state?.message || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.state?.registeredEmail) {
      setActiveTab("customer");
      setUsername(location.state.registeredEmail);
      setPassword("");
    }
  }, [location.state]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError("");
    setSuccessMsg("");
    if (tab === "staff") {
      setUsername("teller");
      setPassword("Teller@123");
    } else {
      setUsername(location.state?.registeredEmail || "");
      setPassword("");
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

        {successMsg && (
          <div
            className="alert-success"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              color: "#10b981",
              borderRadius: "8px",
              fontSize: "12px",
              marginBottom: "12px",
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

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

        {isKeycloakMode && (
          <div style={{ marginBottom: "16px" }}>
            <button
              type="button"
              className="primary-button"
              style={{ width: "100%", background: "linear-gradient(135deg, #4f46e5, #4338ca)" }}
              onClick={loginWithKeycloak}
            >
              Sign in with Keycloak (SSO / PKCE)
            </button>
            <div style={{ textAlign: "center", margin: "10px 0", color: "var(--muted)", fontSize: "11px" }}>
              ── OR LOCAL BASIC AUTH ──
            </div>
          </div>
        )}

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
            onClick={() => {
              setActiveTab("customer");
              setUsername("ankit@gmail.com");
              setPassword("Customer@123");
            }}
          >
            Customer (ankit)
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
