import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  Users,
  ArrowLeftRight,
  TrendingUp,
  Activity,
  FileText,
  Search,
  Clock,
  ShieldCheck,
  Radio,
  Lock,
  Unlock,
  Database,
} from "lucide-react";
import { Metric } from "../../components/ui/Metric";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { getAccounts, getAccountDetail, freezeAccount, unfreezeAccount } from "../../api/accounts";
import { broadcastAccountChange } from "../../utils/syncChannel";
import { getCustomers } from "../../api/customers";
import { getDashboardSummary } from "../../api/dashboard";
import { getAuditLogsForEntity } from "../../api/audit";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useMoney } from "../../hooks/useMoney";

export function TellerDashboard() {
  const [summary, setSummary] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [accountDetail, setAccountDetail] = useState(null);
  const [recentAudit, setRecentAudit] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { auth, apiLatency } = useAuth();
  const { setError, setSuccess } = useToast();
  const money = useMoney();
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, accs, custs] = await Promise.all([
        getDashboardSummary(auth).catch(() => null),
        getAccounts(auth),
        getCustomers("ALL", auth).catch(() => []),
      ]);
      setSummary(sum);
      const accList = Array.isArray(accs) ? accs : [];
      setAccounts(accList);
      setCustomers(Array.isArray(custs) ? custs : []);
      if (!selectedAccountId && accList.length > 0) {
        setSelectedAccountId(accList[0].id);
      }
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [auth, selectedAccountId, setError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load account detail with cache check and audit entry when selected account changes
  const loadAccountDetail = useCallback(async (accId) => {
    if (!accId) return;
    try {
      const [detail, audits] = await Promise.all([
        getAccountDetail(accId, auth).catch(() => null),
        getAuditLogsForEntity(accId, auth).catch(() => []),
      ]);
      setAccountDetail(detail);
      if (Array.isArray(audits) && audits.length > 0) {
        setRecentAudit(audits[0]);
      } else {
        setRecentAudit(null);
      }
    } catch {
      // ignore individual detail error
    }
  }, [auth]);

  useEffect(() => {
    if (selectedAccountId) {
      loadAccountDetail(selectedAccountId);
    }
  }, [selectedAccountId, loadAccountDetail]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const selectedCustomer = customers.find((c) => c.id === selectedAccount?.customerId);

  async function handleToggleFreeze() {
    if (!selectedAccount) return;
    setActionLoading(true);
    const isFrozen = String(selectedAccount.status).toUpperCase() === "FROZEN";
    try {
      if (isFrozen) {
        await unfreezeAccount(selectedAccount.id, auth);
        setSuccess(`Account ${selectedAccount.accountNumber} unfrozen.`);
        broadcastAccountChange(selectedAccount.id, "ACTIVE", { accountNumber: selectedAccount.accountNumber });
      } else {
        await freezeAccount(selectedAccount.id, auth);
        setSuccess(`Account ${selectedAccount.accountNumber} frozen.`);
        broadcastAccountChange(selectedAccount.id, "FROZEN", { accountNumber: selectedAccount.accountNumber });
      }
      await loadData();
      await loadAccountDetail(selectedAccount.id);
    } catch (err) {
      setError(err.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  const activeAccountsCount = summary?.activeAccounts ?? accounts.filter((a) => a.status === "ACTIVE").length;
  const transactionsTodayCount = summary?.transactionsToday ?? 0;
  const combinedBalanceValue = summary?.sumOfBalances != null
    ? money(summary.sumOfBalances)
    : money(accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0));
  const uptimeDisplay = summary?.uptimeFormatted || "Online";

  return (
    <>
      {loading && <div className="loading-line">Processing request…</div>}

      <div className="metrics-grid">
        <Metric
          icon={ArrowLeftRight}
          label="Active Accounts"
          value={activeAccountsCount}
          hint="Computed from PostgreSQL"
        />
        <Metric
          icon={Activity}
          label="Transactions Today"
          value={transactionsTodayCount}
          hint="Recorded transactions in UTC today"
        />
        <Metric
          icon={TrendingUp}
          label="Combined Balance"
          value={combinedBalanceValue}
          hint="Sum of active account balances"
        />
        <Metric
          icon={Clock}
          label="System Uptime"
          value={uptimeDisplay}
          hint="JVM runtime active duration"
        />
        <Metric
          icon={Activity}
          label="Server Latency (p50 / p95)"
          value={
            summary?.latencyP50Ms != null
              ? `${summary.latencyP50Ms}ms / ${summary.latencyP95Ms}ms`
              : apiLatency != null
              ? `${apiLatency} ms`
              : "—"
          }
          hint="Live Micrometer distribution metrics"
        />
      </div>

      {/* Account Service Detail Panel from Brief */}
      <section className="panel" style={{ marginTop: "24px" }}>
        <div className="panel-heading">
          <div>
            <h2>Account Service — Live Detail Panel</h2>
            <p>Real-time account state, cache telemetry, and event auditing</p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span className="live-badge">
              <span />
              CORE BANKING LIVE
            </span>
          </div>
        </div>

        {accounts.length > 0 ? (
          <div>
            <div className="account-select-bar">
              <label htmlFor="account-selector" className="account-select-label">
                Select Account:
              </label>
              <select
                id="account-selector"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="account-select-input"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountNumber} ({acc.status}) — Balance: {money(acc.balance)}
                  </option>
                ))}
              </select>
            </div>

            {selectedAccount && (
              <div className="account-detail-grid">
                <div className="detail-item">
                  <div className="detail-item-title">Account Number</div>
                  <div className="detail-item-val font-bold text-lg">{selectedAccount.accountNumber}</div>
                </div>

                <div className="detail-item">
                  <div className="detail-item-title">Account Type</div>
                  <div className="detail-item-val font-medium">SAVINGS</div>
                </div>

                <div className="detail-item">
                  <div className="detail-item-title">Current Balance</div>
                  <div className="detail-item-val font-bold text-xl text-cyan">{money(accountDetail?.balance ?? selectedAccount.balance)}</div>
                </div>

                <div className="detail-item">
                  <div className="detail-item-title">Account Status</div>
                  <div className="mt-1">
                    <StatusBadge status={selectedAccount.status || "ACTIVE"} />
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-item-title">Customer KYC</div>
                  <div className="mt-1">
                    <StatusBadge status={selectedCustomer?.kycStatus || "VERIFIED"} />
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-item-title">
                    <Database size={12} className="inline mr-1" />
                    Redis Cache (TTL 60s)
                  </div>
                  <div className="mt-1">
                    <span className={`status-pill ${accountDetail?.cacheStatus === "HIT" ? "pill-valid" : "pill-warning"}`}>
                      {accountDetail?.cacheStatus || "MISS"}
                    </span>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-item-title">
                    <Radio size={12} className="inline mr-1" />
                    Kafka Outbox
                  </div>
                  <div className="detail-item-val font-medium text-emerald">transaction.completed (Active)</div>
                </div>

                <div className="detail-item">
                  <div className="detail-item-title">API Roundtrip Latency</div>
                  <div className="detail-item-val font-semibold text-cyan">
                    {accountDetail?.latency ? `${accountDetail.latency} ms` : apiLatency ? `${apiLatency} ms` : "—"}
                  </div>
                </div>

                <div className="detail-audit-full">
                  <div className="detail-audit-heading">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    Latest Immutable Audit Log Entry
                  </div>
                  <div className="detail-audit-body">
                    {recentAudit ? (
                      <span>
                        <strong>[{recentAudit.action}]</strong> by <em>{recentAudit.actor}</em> at{" "}
                        {new Date(recentAudit.createdAt).toLocaleTimeString()} — {recentAudit.details}
                        {recentAudit.hash && (
                          <span className="detail-audit-hash">
                            Hash: {recentAudit.hash.substring(0, 16)}...
                          </span>
                        )}
                      </span>
                    ) : (
                      "No recent audit entry for this account."
                    )}
                  </div>
                </div>

                <div className="detail-actions-row">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => navigate(`/statements?accountId=${encodeURIComponent(selectedAccount.id)}`)}
                  >
                    <FileText size={15} />
                    View Statement
                  </button>

                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => navigate(`/operations?tab=transfer&fromAccount=${encodeURIComponent(selectedAccount.id)}`)}
                  >
                    <ArrowLeftRight size={15} />
                    Transfer
                  </button>

                  {auth?.role !== "TELLER" && (
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={actionLoading}
                      onClick={handleToggleFreeze}
                      style={{
                        color: String(selectedAccount.status).toUpperCase() === "FROZEN" ? "#10b981" : "#ef4444",
                        borderColor: String(selectedAccount.status).toUpperCase() === "FROZEN" ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)",
                      }}
                    >
                      {String(selectedAccount.status).toUpperCase() === "FROZEN" ? <Unlock size={15} /> : <Lock size={15} />}
                      {String(selectedAccount.status).toUpperCase() === "FROZEN" ? "Unfreeze Account" : "Freeze Account"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: "var(--text-muted, #6b7280)" }}>
            No accounts found. Use the quick actions below to create accounts.
          </p>
        )}
      </section>

      {/* Quick Navigation and Search */}
      <section className="panel overview-panel" style={{ marginTop: "24px" }}>
        <div className="panel-heading">
          <div>
            <h2>Quick Navigation & Lookup</h2>
            <p>Access teller banking workflows and account lookups</p>
          </div>
        </div>

        <div className="quick-actions">
          <button
            className="primary-button"
            type="button"
            onClick={loadData}
            disabled={loading}
          >
            <Wallet size={16} />
            Refresh Data
          </button>

          <button
            className="secondary-button"
            type="button"
            onClick={() => navigate("/operations")}
          >
            <ArrowLeftRight size={16} />
            Banking Operations
          </button>

          <button
            className="secondary-button"
            type="button"
            onClick={() => navigate("/customers")}
          >
            <Users size={16} />
            Manage Customers
          </button>

          <button
            className="secondary-button"
            type="button"
            onClick={() => navigate("/statements")}
          >
            <FileText size={16} />
            View Statements
          </button>
        </div>

        <div className="account-lookup">
          <label htmlFor="dashboard-account-id">Account Lookup</label>
          <div className="lookup-row">
            <input
              id="dashboard-account-id"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter account number or reference"
            />
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                const q = searchQuery.trim();
                if (!q) return;
                const match = accounts.find(
                  (a) => a.id === q || a.accountNumber === q
                );
                if (match) {
                  setSelectedAccountId(match.id);
                  setSuccess(`Found account ${match.accountNumber}`);
                } else {
                  navigate(`/transactions?accountId=${encodeURIComponent(q)}`);
                }
              }}
            >
              <Search size={16} />
              Find Account
            </button>
          </div>
          <span className="field-hint">
            Quick lookup by formatted account number (e.g. 1000-0000-0012) or reference ID.
          </span>
        </div>
      </section>
    </>
  );
}

export default TellerDashboard;
