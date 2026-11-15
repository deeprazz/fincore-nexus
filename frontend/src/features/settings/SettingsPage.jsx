import React, { useState, useEffect } from "react";
import {
  Settings,
  Moon,
  Sun,
  Shield,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  User,
  Key,
  Database,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

export function SettingsPage() {
  const { auth, logout } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const { setSuccess, setError } = useToast();

  const [serviceStatus, setServiceStatus] = useState({
    core: { name: "Core Banking Service", port: 8081, url: "http://localhost:8081/actuator/health", status: "checking" },
    loans: { name: "Loan Management", port: 8082, url: "http://localhost:8082/actuator/health", status: "checking" },
    payments: { name: "Payment Service", port: 8083, url: "http://localhost:8083/actuator/health", status: "checking" },
    kyc: { name: "KYC & Identity", port: 8084, url: "http://localhost:8084/actuator/health", status: "checking" },
    notifications: { name: "Notification Service", port: 8085, url: "http://localhost:8085/actuator/health", status: "checking" },
    gateway: { name: "API Gateway", port: 8080, url: "http://localhost:8080/actuator/health", status: "checking" },
  });
  const [checking, setChecking] = useState(false);

  const checkAllServices = async () => {
    setChecking(true);
    const updated = { ...serviceStatus };

    for (const key of Object.keys(updated)) {
      try {
        const start = performance.now();
        const res = await fetch(updated[key].url, { method: "GET", mode: "cors" });
        const latency = Math.round(performance.now() - start);
        if (res.ok) {
          updated[key] = { ...updated[key], status: "online", latency };
        } else {
          updated[key] = { ...updated[key], status: "error", code: res.status };
        }
      } catch {
        updated[key] = { ...updated[key], status: "offline" };
      }
    }

    setServiceStatus(updated);
    setChecking(false);
  };

  useEffect(() => {
    checkAllServices();
  }, []);

  const handleClearCache = () => {
    try {
      sessionStorage.clear();
      setSuccess("Session cache cleared successfully. Re-hydrating...");
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch {
      setError("Failed to clear session cache.");
    }
  };

  return (
    <div className="settings-page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-title-group">
          <div className="page-header-icon-box">
            <Settings size={22} />
          </div>
          <div>
            <h1 className="page-title">Platform Settings & Workstation</h1>
            <p className="page-subtitle">
              Appearance, operator identity, security controls, and live microservices connectivity health
            </p>
          </div>
        </div>
      </div>

      <div className="settings-grid">
        {/* Card 1: Appearance & Theme */}
        <Card className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              {isDark ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <div>
              <h3>Appearance & Theme</h3>
              <p>Customize the visual workstation interface mode</p>
            </div>
          </div>

          <div className="theme-selection-grid">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`theme-option-box ${theme === "dark" ? "active" : ""}`}
            >
              <div className="theme-preview dark-preview">
                <div className="preview-topbar" />
                <div className="preview-content">
                  <div className="preview-card" />
                  <div className="preview-card" />
                </div>
              </div>
              <div className="theme-option-info">
                <div className="theme-option-title">
                  <Moon size={15} /> Dark Mode (Recommended)
                </div>
                <span>Deep executive slate for low eye fatigue in continuous operations</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`theme-option-box ${theme === "light" ? "active" : ""}`}
            >
              <div className="theme-preview light-preview">
                <div className="preview-topbar" />
                <div className="preview-content">
                  <div className="preview-card" />
                  <div className="preview-card" />
                </div>
              </div>
              <div className="theme-option-info">
                <div className="theme-option-title">
                  <Sun size={15} /> Light Mode
                </div>
                <span>High-contrast clean daylight interface with crisp borders</span>
              </div>
            </button>
          </div>
        </Card>

        {/* Card 2: Staff Operator Profile */}
        <Card className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <User size={18} />
            </div>
            <div>
              <h3>Operator Identity & Session</h3>
              <p>Active authenticated banking staff credentials</p>
            </div>
          </div>

          <div className="operator-profile-details">
            <div className="profile-row">
              <span className="profile-label">Operator Account</span>
              <span className="profile-val font-semibold">{auth?.username || "teller"}</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Assigned Roles</span>
              <span className="profile-badge-pill">TELLER · MANAGER · ADMIN</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Authorization Protocol</span>
              <span className="profile-val">HTTP Basic / Token Bearer with Maker-Checker</span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Tab Session Storage</span>
              <span className="profile-val text-emerald-500 font-medium">Isolated sessionStorage (Active)</span>
            </div>
          </div>
        </Card>

        {/* Card 3: Microservices Infrastructure Live Health */}
        <Card className="settings-card settings-card-wide">
          <div className="settings-card-header flex-between">
            <div className="flex-group">
              <div className="settings-card-icon">
                <Server size={18} />
              </div>
              <div>
                <h3>Microservices Connectivity Matrix</h3>
                <p>Live health and port accessibility across the 6 distributed banking services</p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={checkAllServices}
              disabled={checking}
              className="ping-btn"
            >
              <RefreshCw size={14} className={checking ? "animate-spin" : ""} />
              Ping Services
            </Button>
          </div>

          <div className="services-health-grid">
            {Object.entries(serviceStatus).map(([key, svc]) => (
              <div key={key} className={`service-status-card status-${svc.status}`}>
                <div className="service-status-header">
                  <span className="service-name">{svc.name}</span>
                  <span className="service-port">:{svc.port}</span>
                </div>
                <div className="service-status-body">
                  {svc.status === "online" ? (
                    <div className="status-badge online">
                      <CheckCircle2 size={13} />
                      <span>Online ({svc.latency ?? 5}ms)</span>
                    </div>
                  ) : svc.status === "checking" ? (
                    <div className="status-badge checking">
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Checking...</span>
                    </div>
                  ) : (
                    <div className="status-badge offline">
                      <AlertTriangle size={13} />
                      <span>Offline</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Card 4: Workstation Maintenance */}
        <Card className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon text-amber-500">
              <Shield size={18} />
            </div>
            <div>
              <h3>Workstation Maintenance</h3>
              <p>Session cache management and operator sign-out</p>
            </div>
          </div>

          <div className="settings-actions-group">
            <div className="action-row">
              <div>
                <strong>Clear Workstation Session Cache</strong>
                <p>Purges temporary balances and resets local query caches without affecting the ledger</p>
              </div>
              <Button variant="secondary" onClick={handleClearCache}>
                <Trash2 size={14} /> Clear Cache
              </Button>
            </div>

            <div className="action-row border-top">
              <div>
                <strong>Sign Out Operator</strong>
                <p>Ends the current secure staff session and returns to login</p>
              </div>
              <Button variant="danger" onClick={logout}>
                Sign Out
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default SettingsPage;
