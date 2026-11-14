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
} from "lucide-react";

export function Sidebar({ sidebarOpen, setSidebarOpen, role = "TELLER" }) {
  if (role === "CUSTOMER") {
    const customerNav = [
      { label: "Overview", to: "/portal", icon: LayoutDashboard },
      { label: "My accounts", to: "/portal/accounts", icon: Wallet },
      { label: "Transfer money", to: "/portal/transfer", icon: ArrowLeftRight },
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
    { label: "Accounts", to: "/accounts", icon: Wallet },
    { label: "Customers", to: "/customers", icon: Users },
    { label: "Transactions", to: "/transactions", icon: ArrowLeftRight },
    { label: "Operations", to: "/operations", icon: Activity },
    { label: "Statements", to: "/statements", icon: FileText },
    { label: "KYC", to: "/kyc", icon: ShieldCheck },
    ...(role === "MANAGER" || role === "ADMIN" ? [{ label: "Audit Trail", to: "/audit", icon: ShieldCheck }] : []),
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
          {staffNav.map(({ label, to, icon: Icon }) => (
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
          <div className="version">FINCORE NEXUS · MILESTONE 1</div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
