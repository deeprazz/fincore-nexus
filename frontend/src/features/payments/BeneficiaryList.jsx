import React, { useState } from "react";
import Button from "../../components/ui/Button";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";

export default function BeneficiaryList({
  beneficiaries = [],
  onVerifyPennyDrop,
  onDelete,
  onSelectForPayment,
}) {
  const [verifyingId, setVerifyingId] = useState(null);

  const handleVerify = async (id) => {
    setVerifyingId(id);
    try {
      await onVerifyPennyDrop(id);
    } finally {
      setVerifyingId(null);
    }
  };

  if (!beneficiaries || beneficiaries.length === 0) {
    return (
      <EmptyState
        message="No beneficiaries registered"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {beneficiaries.map((b) => {
        const isVerified = b.status === "VERIFIED";
        const createdDate = b.createdAt ? new Date(b.createdAt) : new Date();
        const minutesOld = Math.floor((new Date() - createdDate) / (1000 * 60));
        const inCoolingOff = minutesOld < 30;

        return (
          <div
            key={b.id}
            className="card p-4 flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="font-semibold text-base">{b.name}</h4>
                  <p className="text-xs text-muted">{b.bankName || "Commercial Bank"}</p>
                </div>
                <StatusBadge status={b.status} />
              </div>

              <div className="space-y-1 my-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Account:</span>
                  <span className="font-mono font-medium">{b.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">IFSC:</span>
                  <span className="font-mono font-medium">{b.ifscCode}</span>
                </div>
                {b.vpa && (
                  <div className="flex justify-between">
                    <span className="text-muted">UPI VPA:</span>
                    <span className="font-mono text-primary font-medium">{b.vpa}</span>
                  </div>
                )}
              </div>

              {inCoolingOff && (
                <div className="p-2 mb-3 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  <span className="font-semibold">Cooling-off active:</span> Transfers &gt; ₹50,000 locked for {30 - minutesOld}m.
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-3 border-t">
              {!isVerified ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleVerify(b.id)}
                  loading={verifyingId === b.id}
                >
                  Verify Penny-Drop
                </Button>
              ) : (
                onSelectForPayment && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => onSelectForPayment(b)}
                  >
                    Pay
                  </Button>
                )
              )}

              {onDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(b.id)}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
