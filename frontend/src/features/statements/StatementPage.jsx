import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { StatementFilters } from "./StatementFilters";
import { StatementTable } from "./StatementTable";
import { getAccounts, getAccountStatement } from "../../api/accounts";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export function StatementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialAccountId = searchParams.get("accountId") || "";

  const [accountId, setAccountId] = useState(initialAccountId);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);

  const { auth } = useAuth();
  const { setError, setSuccess } = useToast();

  const loadAccounts = useCallback(async () => {
    try {
      const data = await getAccounts(auth);
      setAccounts(Array.isArray(data) ? data : []);
      if (!accountId && Array.isArray(data) && data.length > 0) {
        setAccountId(data[0].id);
      }
    } catch (err) {
      setError(err.message || "Failed to load accounts");
    }
  }, [auth, accountId, setError]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleGenerate = useCallback(async () => {
    if (!accountId) {
      setError("Please select an account.");
      return;
    }
    if (from && to && from > to) {
      setError("The start date must be on or before the end date.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const data = await getAccountStatement(accountId, from, to, auth);
      setStatement(data);
      setSuccess("Account statement generated successfully.");
      setSearchParams({ accountId });
    } catch (err) {
      setStatement(null);
      setError(err.message || "Failed to generate statement");
    } finally {
      setLoading(false);
    }
  }, [accountId, from, to, auth, setError, setSuccess, setSearchParams]);

  const selectedAccount = accounts.find((a) => a.id === accountId);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Account Statement</h2>
          <p>Choose an account and optional date range</p>
        </div>
      </div>

      <StatementFilters
        accounts={accounts}
        accountId={accountId}
        setAccountId={setAccountId}
        from={from}
        setFrom={setFrom}
        to={to}
        setTo={setTo}
        onGenerate={handleGenerate}
        loading={loading}
      />

      <StatementTable
        statement={statement}
        accountId={accountId}
        accountNumber={selectedAccount?.accountNumber}
        from={from}
        to={to}
      />
    </section>
  );
}

export default StatementPage;
