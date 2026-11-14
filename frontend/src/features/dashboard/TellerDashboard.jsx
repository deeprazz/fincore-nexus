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
} from "lucide-react";
import { Metric } from "../../components/ui/Metric";
import { getAccounts } from "../../api/accounts";
import { getCustomers } from "../../api/customers";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useMoney } from "../../hooks/useMoney";

export function TellerDashboard() {
  const [accounts, setAccounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(false);

  const { auth, apiLatency } = useAuth();
  const { setError } = useToast();
  const money = useMoney();
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accs, custs] = await Promise.all([
        getAccounts(auth),
        getCustomers("ALL", auth),
      ]);
      setAccounts(Array.isArray(accs) ? accs : []);
      setCustomers(Array.isArray(custs) ? custs : []);
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [auth, setError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalBalance = accounts.reduce(
    (sum, acc) => sum + Number(acc.balance || 0),
    0
  );

  return (
    <>
      {loading && <div className="loading-line">Processing request…</div>}

      <div className="metrics-grid">
        <Metric
          icon={Wallet}
          label="Accounts"
          value={accounts.length}
          hint="Loaded account records"
        />
        <Metric
          icon={Users}
          label="Customers"
          value={customers.length}
          hint="Registered customer records"
        />
        <Metric
          icon={ArrowLeftRight}
          label="Active Accounts"
          value={accounts.filter((a) => a.status === "ACTIVE").length}
          hint="Accounts eligible for banking"
        />
        <Metric
          icon={TrendingUp}
          label="Combined Balance"
          value={money(totalBalance)}
          hint="Sum of loaded accounts"
        />
        <Metric
          icon={Activity}
          label="Last API Latency"
          value={apiLatency == null ? "—" : `${apiLatency} ms`}
          hint="Measured browser-to-API round trip"
        />
      </div>

      <section className="panel overview-panel">
        <div className="panel-heading">
          <div>
            <h2>Account Service — Core Banking</h2>
            <p>Live account and transaction data from your backend</p>
          </div>
          <span className="live-badge">
            <span />
            API CONNECTED
          </span>
        </div>

        <div className="quick-actions">
          <button
            className="primary-button"
            type="button"
            onClick={loadData}
            disabled={loading}
          >
            <Wallet size={16} />
            Load Accounts
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
            View Statement
          </button>
        </div>

        <div className="account-lookup">
          <label htmlFor="dashboard-account-id">Account ID</label>
          <div className="lookup-row">
            <input
              id="dashboard-account-id"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="Enter account UUID"
            />
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                if (accountId.trim()) {
                  navigate(`/transactions?accountId=${encodeURIComponent(accountId.trim())}`);
                }
              }}
            >
              <Search size={16} />
              Find Transactions
            </button>
          </div>
          <span className="field-hint">
            Use the account UUID, not the formatted account number.
          </span>
        </div>
      </section>
    </>
  );
}

export default TellerDashboard;
