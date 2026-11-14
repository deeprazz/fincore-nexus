import React from "react";
import { FileText, Download } from "lucide-react";
import { Metric } from "../../components/ui/Metric";
import { TransactionTable } from "../transactions/TransactionTable";
import { downloadStatementPdf } from "../../utils/pdf/statementPdf";
import { exportStatementCsv } from "../../api/accounts";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useMoney } from "../../hooks/useMoney";

export function StatementTable({ statement, accountId, accountNumber, from, to }) {
  const { auth } = useAuth();
  const { setError, setSuccess } = useToast();
  const money = useMoney();

  if (!statement) return null;

  async function handleDownloadCsv() {
    try {
      const csvData = await exportStatementCsv(accountId, from, to, auth);
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `statement-${accountNumber || accountId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSuccess("CSV statement downloaded successfully.");
    } catch (err) {
      setError(err.message || "Failed to download CSV statement");
    }
  }

  return (
    <>
      <div className="statement-metrics">
        <Metric
          label="Opening Balance"
          value={money(statement.openingBalance)}
        />
        <Metric
          label="Deposits"
          value={money(statement.totalDeposits)}
        />
        <Metric
          label="Withdrawals"
          value={money(statement.totalWithdrawals)}
        />
        <Metric
          label="Closing Balance"
          value={money(statement.closingBalance)}
        />
      </div>

      <p className="table-caption">
        {statement.totalTransactions} transactions in this period
      </p>

      <TransactionTable transactions={statement.transactions ?? []} />

      <div className="statement-download-actions" style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
        <button
          className="primary-button"
          type="button"
          onClick={() =>
            downloadStatementPdf(
              statement,
              `teller-statement-${accountNumber || accountId}`,
              { accountId, accountNumber, from, to }
            )
          }
        >
          <FileText size={16} />
          Download PDF statement
        </button>

        <button
          className="secondary-button"
          type="button"
          onClick={handleDownloadCsv}
        >
          <Download size={16} />
          Download CSV statement
        </button>
      </div>
    </>
  );
}

export default StatementTable;
