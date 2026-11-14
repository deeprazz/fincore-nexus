import React from "react";
import { Activity, Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export function Topbar({ sidebarOpen, setSidebarOpen, role = "TELLER" }) {
  const { auth, customerPortal, logout } = useAuth();

  if (role === "CUSTOMER") {
    return (
      <header className="customer-topbar">
        <div className="customer-brand">
          <div className="customer-brand-mark">
            <Activity size={20} />
          </div>
          <div>
            <strong>FinCore</strong>
            <span>YOUR EVERYDAY BANKING</span>
          </div>
        </div>
        <div className="customer-topbar-right">
          <span className="customer-secure-indicator">
            <span /> Secure connection
          </span>
          <div className="customer-user-chip">
            <span className="customer-avatar">
              {(customerPortal?.name || auth?.username || "C")
                .slice(0, 1)
                .toUpperCase()}
            </span>
            <span>{customerPortal?.name || auth?.username}</span>
          </div>
          <button
            className="secondary-button customer-logout-top"
            onClick={logout}
            type="button"
          >
            Sign out
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="topbar">
      <button
        className="icon-button mobile-menu"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle navigation"
      >
        {sidebarOpen ? <X /> : <Menu />}
      </button>

      <div className="brand">
        <div className="brand-mark">
          <Activity size={22} />
        </div>
        <div>
          <div className="brand-name">FinCore Nexus</div>
          <div className="brand-subtitle">DIGITAL BANKING PLATFORM</div>
        </div>
      </div>

      <div className="milestone">
        Milestone 1: Account &amp; Customer Services
      </div>

      <div className="topbar-right">
        <span className="status-dot" />
        <span>{auth?.username || "teller"} · Teller</span>
        <button className="secondary-button" onClick={logout} type="button">
          Sign out
        </button>
        <div className="avatar">
          {(auth?.username || "TE").slice(0, 2).toUpperCase()}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
