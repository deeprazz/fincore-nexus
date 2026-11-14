import React from "react";
import { money } from "../../utils/money";
import { formatDate } from "../../utils/date";

export function EmiScheduleTable({ schedule = [], className = "" }) {
  if (!schedule || schedule.length === 0) {
    return (
      <div className={`table-wrap ${className}`}>
        <div className="empty-state">No EMI schedule installments available.</div>
      </div>
    );
  }

  const getStatusBadge = (status, daysOverdue = 0) => {
    const st = String(status || "PENDING").toUpperCase();
    if (st === "PAID") {
      return <span className="status-badge status-paid">PAID</span>;
    }
    if (st === "OVERDUE" || daysOverdue > 0) {
      return (
        <span className="status-badge status-overdue">
          OVERDUE {daysOverdue > 0 ? `(${daysOverdue}d)` : ""}
        </span>
      );
    }
    return <span className="status-badge status-pending">PENDING</span>;
  };

  return (
    <div className={`table-wrap ${className}`}>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Due Date</th>
            <th>EMI Amount</th>
            <th>Principal</th>
            <th>Interest</th>
            <th>Outstanding</th>
            <th>Status</th>
            <th>Penalty</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((entry, idx) => {
            const num = entry.installmentNumber || idx + 1;
            const emi = entry.emiAmount || entry.amount || 0;
            const principal = entry.principalComponent || entry.principal || 0;
            const interest = entry.interestComponent || entry.interest || 0;
            const outstanding =
              entry.outstandingBalance ?? entry.outstandingAfter ?? 0;
            const penalty = entry.penalty ?? 0;
            const daysOverdue = entry.daysOverdue ?? entry.daysPastDue ?? 0;

            return (
              <tr key={entry.id || num}>
                <td className="account-number">{num}</td>
                <td>{formatDate(entry.dueDate)}</td>
                <td className="amount-cell"><strong>{money(emi)}</strong></td>
                <td>{money(principal)}</td>
                <td>{money(interest)}</td>
                <td className="muted-cell">{money(outstanding)}</td>
                <td>{getStatusBadge(entry.status, daysOverdue)}</td>
                <td>
                  {Number(penalty) > 0 ? (
                    <span className="text-danger font-medium">+{money(penalty)}</span>
                  ) : (
                    <span className="muted-cell">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default EmiScheduleTable;
