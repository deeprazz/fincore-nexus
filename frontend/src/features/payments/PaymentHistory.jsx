import React, { useState } from "react";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";

export default function PaymentHistory({
  payments = [],
  onViewReceipt,
  onApprove,
  onReject,
  onRetryCompensation,
  currentUser = null,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRail, setFilterRail] = useState("ALL");
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const filtered = payments.filter((p) => {
    const matchSearch =
      !searchTerm ||
      p.utr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.targetAccountNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.targetVpa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.status?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchRail = filterRail === "ALL" || p.paymentRail === filterRail;
    return matchSearch && matchRail;
  });

  const handleApprove = async (id) => {
    if (!onApprove) return;
    setActionLoadingId(id);
    try {
      await onApprove(id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReject = async (id) => {
    if (!onReject) return;
    setActionLoadingId(id);
    try {
      await onReject(id, rejectReason || "Rejected by Manager during maker-checker review");
      setRejectingId(null);
      setRejectReason("");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRetryComp = async (id) => {
    if (!onRetryCompensation) return;
    setActionLoadingId(id);
    try {
      await onRetryCompensation(id);
    } finally {
      setActionLoadingId(null);
    }
  };

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
          placeholder="Search by UTR, Account, or Status..."
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
              <th className="p-3">Reference No.</th>
              <th className="p-3">Rail</th>
              <th className="p-3">Destination</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Maker / Checker</th>
              <th className="p-3">Date</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const isPendingReview = p.status === "PENDING_REVIEW";
              const isCompPending = p.status === "COMPENSATION_PENDING";
              const isLoading = actionLoadingId === p.id;
              const isCreator = currentUser && p.createdBy && currentUser.username === p.createdBy;

              return (
                <tr key={p.id} className="border-b hover:bg-surface-alt transition-colors">
                  <td className="p-3 font-mono font-medium text-xs">
                    {p.utr
                      ? p.utr.length > 20
                        ? `UTR-${p.utr.replace(/-/g, '').slice(0, 12).toUpperCase()}`
                        : p.utr
                      : `REF-${String(p.id || '').replace(/-/g, '').slice(0, 8).toUpperCase()}`}
                  </td>
                  <td className="p-3">
                    <span className="text-2xs bg-surface px-1.5 py-0.5 rounded border font-semibold">
                      {p.paymentRail}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs">
                    <div>{p.targetAccountNumber || p.targetVpa || '—'}</div>
                    <div className="text-[10px] text-muted">{p.targetIfsc || (p.paymentRail === 'UPI' ? 'UPI' : '—')}</div>
                  </td>
                  <td className="p-3 font-bold font-mono text-sm">
                    ₹{Number(p.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3">
                    {isPendingReview ? (
                      <span className="inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        PENDING REVIEW
                      </span>
                    ) : isCompPending ? (
                      <span className="inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        COMPENSATION PENDING
                      </span>
                    ) : (
                      <span className={`inline-flex items-center text-2xs font-bold px-2 py-0.5 rounded-full border ${
                        p.status === "SETTLED" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                        p.status === "CREDITED" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                        p.status === "REVERSED" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                        p.status === "FAILED" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                        "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                      }`}>
                        {p.status}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-xs">
                    <div className="text-muted">Maker: <span className="text-foreground font-medium">{p.createdBy || "System"}</span></div>
                    {p.reviewedBy && (
                      <div className="text-muted text-[10px]">Checker: <span className="text-foreground font-medium">{p.reviewedBy}</span></div>
                    )}
                  </td>
                  <td className="p-3 text-xs text-muted">
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isPendingReview && onApprove && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={isLoading || isCreator}
                            title={isCreator ? "Dual-control: Maker cannot approve own payment" : "Approve payment release"}
                            onClick={() => handleApprove(p.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-xs py-0.5 px-2"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isLoading || isCreator}
                            title={isCreator ? "Dual-control: Maker cannot review own payment" : "Reject payment"}
                            onClick={() => setRejectingId(rejectingId === p.id ? null : p.id)}
                            className="border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs py-0.5 px-2"
                          >
                            Reject
                          </Button>
                        </>
                      )}

                      {isCompPending && onRetryCompensation && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isLoading}
                          onClick={() => handleRetryComp(p.id)}
                          className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs py-0.5 px-2"
                        >
                          Retry Refund
                        </Button>
                      )}

                      <Button size="sm" variant="outline" onClick={() => onViewReceipt(p)} className="text-xs py-0.5 px-2">
                        Receipt
                      </Button>
                    </div>

                    {rejectingId === p.id && (
                      <div className="mt-2 p-2 bg-surface border rounded text-left space-y-2">
                        <input
                          type="text"
                          className="form-input text-xs w-full"
                          placeholder="Rejection reason..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setRejectingId(null)}
                            className="text-xs px-2 py-1 rounded bg-surface hover:bg-surface-alt"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmReject(p.id)}
                            className="text-xs px-2 py-1 rounded bg-red-600 text-white font-semibold"
                          >
                            Confirm Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
