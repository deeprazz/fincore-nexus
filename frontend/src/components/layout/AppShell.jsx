import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { auth, apiLatency } = useAuth();
  const { error, success } = useToast();
  const location = useLocation();

  const isCustomer = auth?.role === "CUSTOMER";

  if (isCustomer) {
    return (
      <div className="customer-app-shell">
        <Topbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          role="CUSTOMER"
        />
        <div className="customer-workspace">
          <Sidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            role="CUSTOMER"
          />
          <main className="customer-main customer-main-content">
            {error && <div className="alert-error customer-alert">{error}</div>}
            {success && (
              <div className="alert-success customer-alert">{success}</div>
            )}
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  // Get current page name from path
  const path = location.pathname;
  let pageName = "DASHBOARD";
  if (path.startsWith("/accounts")) pageName = "ACCOUNTS";
  else if (path.startsWith("/customers")) pageName = "CUSTOMERS";
  else if (path.startsWith("/loans")) pageName = "LOANS";
  else if (path.startsWith("/payments")) pageName = "PAYMENTS";
  else if (path.startsWith("/kyc")) pageName = "KYC";
  else if (path.startsWith("/compliance")) pageName = "COMPLIANCE";
  else if (path.startsWith("/master")) pageName = "MASTER TELEMETRY";
  else if (path.startsWith("/transactions")) pageName = "TRANSACTIONS";
  else if (path.startsWith("/operations")) pageName = "OPERATIONS";
  else if (path.startsWith("/statements")) pageName = "STATEMENTS";
  else if (path.startsWith("/audit")) pageName = "AUDIT";
  else if (path.startsWith("/settings")) pageName = "SETTINGS";

  const hasCustomHeader =
    path.startsWith("/loans") ||
    path.startsWith("/payments") ||
    path.startsWith("/kyc") ||
    path.startsWith("/compliance") ||
    path.startsWith("/master");

  return (
    <div className="app-shell">
      <Topbar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        role="TELLER"
      />
      <div className="workspace">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          role="TELLER"
        />
        <main className="main-content">
          {!hasCustomHeader && (
            <div className="page-heading">
              <div>
                <div className="eyebrow">CORE BANKING / {pageName}</div>
                <h1>{pageName.charAt(0) + pageName.slice(1).toLowerCase()}</h1>
              </div>
              {apiLatency != null && (
                <div className="latency-badge">
                  API latency: {apiLatency} ms
                </div>
              )}
            </div>
          )}

          {error && <div className="alert-error">{error}</div>}
          {success && <div className="alert-success">{success}</div>}

          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
