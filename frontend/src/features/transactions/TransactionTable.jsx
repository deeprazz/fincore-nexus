import React from "react";
import { useMoney } from "../../hooks/useMoney";

export function TransactionTable({ transactions = [] }) {
  const money = useMoney();

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Amount</th>
            <th>Balance After</th>
            <th>Reference ID</th>
            <th>Date &amp; Time</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td>
                <span
                  className={`transaction-type ${String(
                    transaction.transactionType
                  ).toLowerCase()}`}
                >
                  {transaction.transactionType}
                </span>
              </td>
              <td>{money(transaction.amount)}</td>
              <td>{money(transaction.balanceAfter)}</td>
              <td className="muted-cell">{transaction.referenceId ?? "—"}</td>
              <td>
                {transaction.createdAt
                  ? new Date(transaction.createdAt).toLocaleString("en-IN")
                  : "—"}
              </td>
            </tr>
          ))}

          {!transactions.length && (
            <tr>
              <td colSpan="5" className="empty-state">
                No transactions to display.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default TransactionTable;
