import React, { useState, useEffect } from "react";
import { Wallet, RotateCw, AlertTriangle, Snowflake } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMoney } from "../../hooks/useMoney";
import { subscribeToAccountChanges } from "../../utils/syncChannel";

export function PortalAccounts() {
  const { customerPortal, refreshPortalData } = useAuth();
  const money = useMoney();
  const [refreshing, setRefreshing] = useState(false);

  const customerAccounts = customerPortal?.accounts || [];
  const canBank = customerPortal?.kycStatus === "VERIFIED";
  const hasFrozen = customerAccounts.some(
    (a) => String(a.status).toUpperCase() === "FROZEN"
  );

  // Real-time updates: initial mount fetch + instant cross-tab event subscription (0ms push)
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

  async function handleRefresh() {
    if (!refreshPortalData) return;
    setRefreshing(true);
    try {
      await refreshPortalData();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      <div className="customer-page-header">
        <div>
          <div className="customer-eyebrow">PERSONAL BANKING</div>
          <h1>My accounts</h1>
          <p>Your accounts and available balances with live status updates.</p>
        </div>
      </div>

      {!canBank ? (
        <section className="customer-section customer-kyc-pending">
          <h3>Account access is pending</h3>
          <p>Your account details will be available after Teller verification.</p>
        </section>
      ) : (
        <section className="customer-section">
          <div className="customer-section-heading">
            <div>
              <span className="customer-section-kicker">YOUR MONEY</span>
              <h3>My accounts</h3>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="customer-muted">{customerAccounts.length} linked</span>
              <button
                type="button"
                className="secondary-button"
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh live account status"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <RotateCw size={13} className={refreshing ? "spin-icon" : ""} />
                <span>{refreshing ? "Updating..." : "Refresh"}</span>
              </button>
            </div>
          </div>

          {hasFrozen && (
            <div className="portal-account-frozen-alert" role="alert">
              <div className="alert-icon-box">
                <AlertTriangle size={20} />
              </div>
              <div>
                <strong>Account Notice: Account Temporarily Frozen</strong>
                <p>
                  One or more accounts have been frozen by Bank Management.
                  Outgoing transfers, payments, and debit transactions are currently restricted.
                  Please contact branch management or customer support to request unfreezing.
                </p>
              </div>
            </div>
          )}

          {customerAccounts.length ? (
            <div className="customer-account-grid">
              {customerAccounts.map((account) => {
                const status = (account.status || "ACTIVE").toUpperCase();
                const isFrozen = status === "FROZEN";
                const isClosed = status === "CLOSED";
                const pillClass = isFrozen
                  ? "frozen"
                  : isClosed
                  ? "closed"
                  : "verified";

                return (
                  <article
                    className={`customer-account-card ${isFrozen ? "is-frozen" : ""}`}
                    key={account.id}
                  >
                    <div className="customer-account-card-top">
                      <span className="customer-account-icon">
                        {isFrozen ? <Snowflake size={18} /> : <Wallet size={18} />}
                      </span>
                      <span className={`customer-status-pill ${pillClass}`}>
                        {status}
                      </span>
                    </div>
                    <span className="customer-muted">ACCOUNT NUMBER</span>
                    <strong>{account.accountNumber}</strong>
                    <span className="customer-muted">Available balance</span>
                    <strong className="customer-balance">
                      {money(account.balance)}
                    </strong>
                    {isFrozen && (
                      <div className="frozen-tag-notice">
                        <Snowflake size={12} />
                        <span>Transfers suspended by Manager</span>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="customer-muted">
              No bank account has been opened yet. Please contact your Teller.
            </p>
          )}
        </section>
      )}
    </>
  );
}

export default PortalAccounts;
