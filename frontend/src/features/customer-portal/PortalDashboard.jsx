import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Wallet, LayoutDashboard, ShieldCheck, AlertTriangle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMoney } from "../../hooks/useMoney";
import { subscribeToAccountChanges } from "../../utils/syncChannel";

export function PortalDashboard() {
  const { auth, customerPortal, refreshPortalData } = useAuth();
  const money = useMoney();

  const customerAccounts = customerPortal?.accounts || [];
  const canBank = customerPortal?.kycStatus === "VERIFIED";
  const primaryAccount = customerAccounts[0];
  const isFrozen = String(primaryAccount?.status).toUpperCase() === "FROZEN";
  const totalBalance = customerAccounts.reduce(
    (sum, account) => sum + Number(account.balance || 0),
    0
  );

  useEffect(() => {
    if (!canBank || !refreshPortalData) return;
    refreshPortalData();
    const unsubscribe = subscribeToAccountChanges(() => {
      refreshPortalData();
    });
    return () => {
      unsubscribe();
    };
  }, [canBank, refreshPortalData]);

  return (
    <>
      <div className="customer-page-header">
        <div>
          <div className="customer-eyebrow">PERSONAL BANKING</div>
          <h1>Hi, {(customerPortal?.name || auth?.username || "there").split(" ")[0]}</h1>
          <p>Here’s a quick look at your money.</p>
        </div>
      </div>

      <section className="customer-welcome-strip">
        <div>
          <span className="customer-welcome-label">YOUR ACCOUNT AT A GLANCE</span>
          <h2>Your money, in one place.</h2>
          <p>Check your balance, make a transfer, or catch up on recent activity.</p>
        </div>
        <div className="customer-kyc-summary">
          <span className={`customer-status-pill ${canBank ? "verified" : "pending"}`}>
            {customerPortal?.kycStatus || "PENDING"}
          </span>
          <span>Verification status</span>
        </div>
      </section>

      <section className="customer-metric-grid" aria-label="Account summary">
        <article className="customer-metric-card customer-metric-primary">
          <div className="customer-metric-top">
            <span>Available balance</span>
            <Wallet size={18} />
          </div>
          <strong>{money(totalBalance)}</strong>
          <small>
            Across {customerAccounts.length} account
            {customerAccounts.length === 1 ? "" : "s"}
          </small>
        </article>
        <article className="customer-metric-card">
          <div className="customer-metric-top">
            <span>My accounts</span>
            <LayoutDashboard size={18} />
          </div>
          <strong>{customerAccounts.length}</strong>
          <small>Linked to your profile</small>
        </article>
        <article className={`customer-metric-card ${isFrozen ? "metric-frozen" : ""}`}>
          <div className="customer-metric-top">
            <span>Account status</span>
            <ShieldCheck size={18} />
          </div>
          <strong className={`customer-metric-status ${isFrozen ? "status-frozen" : ""}`}>
            {isFrozen ? "FROZEN" : (primaryAccount?.status || (canBank ? "Active" : "Pending"))}
          </strong>
          <small>
            {isFrozen
              ? "Account frozen by Management"
              : canBank
              ? "Banking access is ready"
              : "Waiting for Teller approval"}
          </small>
        </article>
      </section>

      {isFrozen && (
        <div className="portal-account-frozen-alert" style={{ marginBottom: "20px" }} role="alert">
          <div className="alert-icon-box">
            <AlertTriangle size={20} />
          </div>
          <div>
            <strong>Account Notice: Primary Account Frozen</strong>
            <p>
              Your account has been temporarily frozen by Bank Management. Outgoing payments and fund transfers are paused.
              Contact customer care or your branch manager to unfreeze your account.
            </p>
          </div>
        </div>
      )}

      {!canBank && (
        <section className="customer-section customer-kyc-pending">
          <div className="customer-panel-heading">
            <h3>Your account is being checked</h3>
            <span className="customer-status-pill pending">PENDING</span>
          </div>
          <p>
            Your registration is in place. A Teller needs to verify your details
            before transfers and other banking services become available. You
            can refresh this page later to check for updates.
          </p>
        </section>
      )}

      {canBank && (
        <section className="customer-section customer-overview-activity">
          <div className="customer-section-heading">
            <div>
              <span className="customer-section-kicker">RECENT ACTIVITY</span>
              <h3>Latest accounts &amp; transfers</h3>
            </div>
            <Link to="/portal/transactions" className="text-button">
              See all
            </Link>
          </div>
          <div className="quick-actions">
            <Link to="/portal/transfer" className="primary-button">
              Transfer Money
            </Link>
            <Link to="/portal/loans" className="primary-button" style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}>
              Apply for Loan
            </Link>
            <Link to="/portal/statements" className="secondary-button">
              Account Statement
            </Link>
          </div>
        </section>
      )}

      <footer className="customer-footer">
        <span>FinCore · Personal banking</span>
        <span>
          <ShieldCheck size={13} /> Your account, kept private
        </span>
      </footer>
    </>
  );
}

export default PortalDashboard;
