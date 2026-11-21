import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  Users,
  ArrowLeftRight,
  Activity,
  FileText,
  ShieldCheck,
  Settings,
  Landmark,
  Send,
  UserCheck,
  ShieldAlert,
} from "lucide-react";

export function Sidebar({ sidebarOpen, setSidebarOpen, role = "TELLER" }) {
  if (role === "CUSTOMER") {
    const customerNav = [
      { label: "Overview", to: "/portal", icon: LayoutDashboard },
      { label: "My accounts", to: "/portal/accounts", icon: Wallet },
      { label: "Transfer money", to: "/portal/transfer", icon: ArrowLeftRight },
      { label: "Loans & Credit", to: "/portal/loans", icon: Landmark },
      { label: "Transactions", to: "/portal/transactions", icon: Activity },
      { label: "Statements", to: "/portal/statements", icon: FileText },
    ];

    return (
      <aside className="customer-sidebar">
        <div className="customer-sidebar-label">YOUR ACCOUNT</div>
        <nav aria-label="Customer navigation">
          {customerNav.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={label}
              to={to}
              end={to === "/portal"}
              className={({ isActive }) =>
                `customer-nav-item ${isActive ? "active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} />
                  <span>{label}</span>
                  {isActive && <span className="customer-nav-dot" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="customer-sidebar-bottom">
          <ShieldCheck size={18} />
          <div>
            <strong>Your money matters</strong>
            <span>Keep your details private. Sign out when you’re done.</span>
          </div>
        </div>
      </aside>
    );
  }

  const staffNav = [
    { label: "Dashboard", to: "/", icon: LayoutDashboard },
    { label: "Master Telemetry", to: "/master", icon: Activity },
    { label: "Accounts", to: "/accounts", icon: Wallet },
    { label: "Payments", to: "/payments", icon: Send },
    { label: "Loans", to: "/loans", icon: Landmark },
    { label: "Customers", to: "/customers", icon: Users },
    { label: "Transactions", to: "/transactions", icon: ArrowLeftRight },
    { label: "Operations", to: "/operations", icon: Activity },
    { label: "Approvals", to: "/approvals", icon: ShieldAlert, badge: "Manager" },
    { label: "Statements", to: "/statements", icon: FileText },
    { label: "KYC", to: "/kyc", icon: UserCheck },
    { label: "Compliance", to: "/compliance", icon: ShieldCheck },
    { label: "Audit Trail", to: "/audit", icon: ShieldCheck, badge: "Manager" },
    { label: "Settings", to: "/settings", icon: Settings },
  ];

  return (
    <>
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-label">WORKSPACE</div>

        <nav>
          {staffNav.map(({ label, to, icon: Icon, badge }) => (
            <NavLink
              key={label}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} />
                  <span>{label}</span>
                  {badge && role === "TELLER" && (
                    <span className="sidebar-role-badge">
                      {badge}
                    </span>
                  )}
                  {isActive && <span className="active-indicator" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="secure-badge">
            <ShieldCheck size={18} />
            Secure workspace
          </div>
          <div className="version">FINCORE NEXUS · CORE BANKING</div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
