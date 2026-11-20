import React, { useState } from "react";
import { FileText, Download } from "lucide-react";
import { getPortalStatement, exportPortalStatementCsv } from "../../api/portal";
import { downloadStatementPdf } from "../../utils/pdf/statementPdf";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useMoney } from "../../hooks/useMoney";

export function PortalStatements() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);

  const { auth, customerPortal } = useAuth();
  const { setError, setSuccess } = useToast();
  const money = useMoney();

  const customerAccounts = customerPortal?.accounts || [];
  const primaryAccount = customerAccounts.find((a) => a.id === selectedAccountId) || customerAccounts[0];
  const canBank = customerPortal?.kycStatus === "VERIFIED";

  async function handleGenerate(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!primaryAccount) {
      setError("No eligible account is available for a statement.");
      return;
    }
    if (from && to && from > to) {
      setError("The start date must be on or before the end date.");
      return;
    }

    setLoading(true);
    try {
      const data = await getPortalStatement(primaryAccount.id, from, to, auth);
      setStatement(data);
      setSuccess("Statement generated successfully.");
    } catch (err) {
      setStatement(null);
      setError(err.message || "Failed to generate statement");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="customer-page-header">
        <div>
          <div className="customer-eyebrow">PERSONAL BANKING</div>
          <h1>Statements</h1>
          <p>Choose a date range to review your account.</p>
        </div>
      </div>

      <section className="customer-section">
        <div className="customer-section-heading">
          <div>
            <span className="customer-section-kicker">PAPERWORK, WITHOUT THE PAPER</span>
            <h3>Account statement</h3>
          </div>
        </div>

        {!canBank ? (
          <p className="customer-muted">
            Statements will be available after your account is verified.
          </p>
        ) : (
          <>
            <p className="customer-muted">
              Pick a date range if you want to narrow things down. Leave dates blank to use the available history.
            </p>
            <form
              className="customer-transfer-form customer-statement-form"
              onSubmit={handleGenerate}
            >
              {customerAccounts.length > 1 && (
                <label>
                  Account
                  <select
                    value={selectedAccountId || primaryAccount?.id || ""}
                    onChange={(e) => {
                      setSelectedAccountId(e.target.value);
                      setStatement(null);
                    }}
                    disabled={loading}
                  >
                    {customerAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountNumber} ({money(acc.balance)})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                From date
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  disabled={loading}
                />
              </label>
              <label>
                To date
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  min={from || undefined}
                  disabled={loading}
                />
              </label>
              <button
                className="primary-button customer-transfer-submit"
                type="submit"
                disabled={loading}
              >
                {loading ? "Generating…" : "Generate statement"}
                <FileText size={15} />
              </button>
            </form>

            {statement && (
              <div className="customer-statement-result">
                <div className="customer-statement-metrics">
                  <div>
                    <span>Opening balance</span>
                    <strong>{money(statement.openingBalance)}</strong>
                  </div>
                  <div>
                    <span>Total deposits</span>
                    <strong>{money(statement.totalDeposits)}</strong>
                  </div>
                  <div>
                    <span>Total withdrawals</span>
                    <strong>{money(statement.totalWithdrawals)}</strong>
                  </div>
                  <div>
                    <span>Closing balance</span>
                    <strong>{money(statement.closingBalance)}</strong>
                  </div>
                </div>

                <p className="customer-muted">
                  {statement.totalTransactions ?? statement.transactions?.length ?? 0}{" "}
                  transactions in this period
                </p>

                {statement.transactions?.length ? (
                  <div className="customer-transactions-wrap">
                    <table className="customer-transactions-table">
                      <thead>
                        <tr>
                          <th>Transaction</th>
                          <th>Amount</th>
                          <th>Balance after</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statement.transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td>{String(tx.transactionType || "").replaceAll("_", " ")}</td>
                            <td>{money(tx.amount)}</td>
                            <td>{money(tx.balanceAfter)}</td>
                            <td>
                              {tx.createdAt
                                ? new Date(tx.createdAt).toLocaleString("en-IN")
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="customer-empty-state">
                    <strong>No transactions in this date range</strong>
                  </div>
                )}

                <div className="statement-download-actions" style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() =>
                      downloadStatementPdf(
                        statement,
                        `customer-statement-${primaryAccount?.accountNumber || "account"}`,
                        {
                          accountNumber: primaryAccount?.accountNumber,
                          from,
                          to,
                        }
                      )
                    }
                  >
                    <FileText size={16} />
                    Download PDF statement
                  </button>

                  <button
                    className="secondary-button"
                    type="button"
                    onClick={async () => {
                      try {
                        const csv = await exportPortalStatementCsv(primaryAccount?.id, from, to, auth);
                        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.setAttribute("download", `statement-${primaryAccount?.accountNumber || "account"}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        setSuccess("CSV statement downloaded successfully.");
                      } catch (err) {
                        setError(err.message || "Failed to download CSV");
                      }
                    }}
                  >
                    <Download size={16} />
                    Download CSV statement
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

export default PortalStatements;
