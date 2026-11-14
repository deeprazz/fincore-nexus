import React, { useState } from "react";
import StatusBadge from "../../components/ui/StatusBadge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";

export default function PaymentHistory({ payments = [], onViewReceipt }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRail, setFilterRail] = useState("ALL");

  const filtered = payments.filter((p) => {
    const matchSearch =
      !searchTerm ||
      p.utr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.targetAccountNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.targetVpa?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchRail = filterRail === "ALL" || p.paymentRail === filterRail;
    return matchSearch && matchRail;
  });

  if (!payments || payments.length === 0) {
    return (
      <EmptyState
        message="No payments executed yet"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        <input
          type="text"
          className="form-input max-w-sm"
          placeholder="Search by UTR or Account/VPA..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="flex gap-2">
          {["ALL", "IMPS", "UPI", "NEFT"].map((rail) => (
            <button
              key={rail}
              onClick={() => setFilterRail(rail)}
              className={`px-3 py-1 rounded text-xs font-semibold border ${
                filterRail === rail ? "bg-primary text-white border-primary" : "bg-surface hover:bg-surface-alt"
              }`}
            >
              {rail}
            </button>
          ))}
        </div>
      </div>

      <div className="table-container border rounded-lg overflow-x-auto">
        <table className="table w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-surface-alt text-xs font-semibold text-muted uppercase">
              <th className="p-3">UTR Reference</th>
              <th className="p-3">Rail</th>
              <th className="p-3">Destination</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b hover:bg-surface-alt transition-colors">
                <td className="p-3 font-mono font-medium text-xs">{p.utr}</td>
                <td className="p-3">
                  <span className="text-2xs bg-surface px-1.5 py-0.5 rounded border font-semibold">
                    {p.paymentRail}
                  </span>
                </td>
                <td className="p-3 font-mono text-xs">
                  {p.targetAccountNumber || p.targetVpa}
                </td>
                <td className="p-3 font-bold font-mono text-sm">
                  ₹{Number(p.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td className="p-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="p-3 text-xs text-muted">
                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""}
                </td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => onViewReceipt(p)}>
                    Receipt
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
