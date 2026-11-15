import React from "react";
import Button from "../../components/ui/Button";
import StatusBadge from "../../components/ui/StatusBadge";
import FraudCheckBadge from "./FraudCheckBadge";
import SagaStatusTimeline from "./SagaStatusTimeline";
import jsPDF from "jspdf";

export default function PaymentReceipt({ payment, onReset }) {
  if (!payment) return null;

  const sourceRef = payment.sourceAccountId
    ? (String(payment.sourceAccountId).includes("-") ? `Ref #${String(payment.sourceAccountId).slice(0, 8).toUpperCase()}` : payment.sourceAccountId)
    : "Primary Ledger";

  const downloadPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("FinCore Nexus - Payment Receipt", 20, 20);

    doc.setFontSize(10);
    doc.text("Enterprise Digital Banking Platform", 20, 28);
    doc.line(20, 32, 190, 32);

    const sourceRef = payment.sourceAccountId
      ? (String(payment.sourceAccountId).includes("-") ? `Ref #${String(payment.sourceAccountId).slice(0, 8).toUpperCase()}` : payment.sourceAccountId)
      : "Primary Ledger";

    doc.setFontSize(12);
    doc.text(`UTR / Reference: ${payment.utr || "N/A"}`, 20, 42);
    doc.text(`Rail: ${payment.paymentRail}`, 20, 50);
    doc.text(`Amount: INR ${Number(payment.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 20, 58);
    doc.text(`Status: ${payment.status}`, 20, 66);
    doc.text(`Date & Time: ${payment.createdAt ? new Date(payment.createdAt).toLocaleString() : "N/A"}`, 20, 74);
    doc.text(`Source Account: ${sourceRef}`, 20, 82);
    doc.text(`Destination: ${payment.targetAccountNumber || payment.targetVpa || "N/A"}`, 20, 90);
    doc.text(`IFSC: ${payment.targetIfsc || "N/A"}`, 20, 98);
    doc.text(`Purpose: ${payment.purpose || "Transfer"}`, 20, 106);

    doc.line(20, 114, 190, 114);
    doc.setFontSize(9);
    doc.text("This is an electronically generated bank transaction advice. No physical signature required.", 20, 122);

    doc.save(`receipt-${payment.utr || "payment"}.pdf`);
  };

  return (
    <div className="card p-6 max-w-2xl mx-auto space-y-5 border">
      <div className="flex items-start justify-between border-b pb-4">
        <div>
          <div className="text-xs uppercase font-semibold text-muted tracking-wider">Transaction Advice</div>
          <h3 className="text-xl font-bold font-mono mt-1">{payment.utr}</h3>
          <p className="text-xs text-muted mt-0.5">
            {payment.createdAt ? new Date(payment.createdAt).toLocaleString() : ""}
          </p>
        </div>
        <StatusBadge status={payment.status} />
      </div>

      <div className="p-4 rounded-lg bg-surface-alt flex items-baseline justify-between border">
        <span className="text-sm text-muted font-medium">Transferred Amount</span>
        <span className="text-2xl font-bold font-mono text-primary">
          ₹{Number(payment.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      </div>

      <SagaStatusTimeline
        status={payment.status}
        failureReason={payment.failureReason}
      />

      <FraudCheckBadge
        score={payment.fraudScore}
        decision={payment.fraudDecision}
        rules={payment.triggeredRules}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs py-2 border-t border-b">
        <div>
          <span className="text-muted block">Payment Rail</span>
          <span className="font-semibold text-sm">{payment.paymentRail}</span>
        </div>
        <div>
          <span className="text-muted block">Source</span>
          <span className="font-semibold font-mono text-sm">{sourceRef}</span>
        </div>
        <div>
          <span className="text-muted block">Destination</span>
          <span className="font-semibold font-mono text-sm">
            {payment.targetAccountNumber || payment.targetVpa}
          </span>
        </div>
        <div>
          <span className="text-muted block">IFSC Code</span>
          <span className="font-semibold font-mono">{payment.targetIfsc || "UPI Rail"}</span>
        </div>
        <div className="sm:col-span-2">
          <span className="text-muted block">Remarks</span>
          <span className="font-medium">{payment.purpose || "Fund Transfer"}</span>
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        {onReset && (
          <Button variant="outline" onClick={onReset}>
            ← New Payment
          </Button>
        )}
        <Button variant="primary" onClick={downloadPdf}>
          Download PDF Receipt
        </Button>
      </div>
    </div>
  );
}
