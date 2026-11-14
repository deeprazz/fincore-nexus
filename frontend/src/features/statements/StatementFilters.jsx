import React from "react";

export function StatementFilters({
  accounts = [],
  accountId,
  setAccountId,
  from,
  setFrom,
  to,
  setTo,
  onGenerate,
  loading = false,
}) {
  return (
    <div className="statement-filters">
      <label>
        Account
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        >
          <option value="">Select account</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.accountNumber}
            </option>
          ))}
        </select>
      </label>

      <label>
        From date
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>

      <label>
        To date
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>

      <button
        className="primary-button"
        onClick={onGenerate}
        disabled={loading}
        type="button"
      >
        Generate Statement
      </button>
    </div>
  );
}

export default StatementFilters;
