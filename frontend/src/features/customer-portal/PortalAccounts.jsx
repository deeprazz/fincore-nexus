import React from "react";
import { Wallet } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMoney } from "../../hooks/useMoney";

export function PortalAccounts() {
  const { customerPortal } = useAuth();
  const money = useMoney();

  const customerAccounts = customerPortal?.accounts || [];
  const canBank = customerPortal?.kycStatus === "VERIFIED";

  return (
    <>
      <div className="customer-page-header">
        <div>
          <div className="customer-eyebrow">PERSONAL BANKING</div>
          <h1>My accounts</h1>
          <p>Your accounts and available balances.</p>
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
            <span className="customer-muted">{customerAccounts.length} linked</span>
          </div>

          {customerAccounts.length ? (
            <div className="customer-account-grid">
              {customerAccounts.map((account) => (
                <article className="customer-account-card" key={account.id}>
                  <div className="customer-account-card-top">
                    <span className="customer-account-icon">
                      <Wallet size={18} />
                    </span>
                    <span className="customer-status-pill verified">
                      {account.status || "ACTIVE"}
                    </span>
                  </div>
                  <span className="customer-muted">ACCOUNT NUMBER</span>
                  <strong>{account.accountNumber}</strong>
                  <span className="customer-muted">Available balance</span>
                  <strong className="customer-balance">
                    {money(account.balance)}
                  </strong>
                </article>
              ))}
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
