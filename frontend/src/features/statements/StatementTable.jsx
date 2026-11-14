import React from "react";
import { FileText } from "lucide-react";
import { Metric } from "../../components/ui/Metric";
import { TransactionTable } from "../transactions/TransactionTable";
import { downloadStatementPdf } from "../../utils/pdf/statementPdf";
import { useMoney } from "../../hooks/useMoney";

export function StatementTable({ statement, accountId, accountNumber, from, to }) {
  const money = useMoney();

  if (!statement) return null;

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

      <div className="statement-download-actions">
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
      </div>
    </>
  );
}

export default StatementTable;
