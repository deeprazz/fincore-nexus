import React, { useState } from "react";
import {
  X,
  FileText,
  Download,
  Printer,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Repeat,
  DollarSign,
  UserCheck,
  Zap,
} from "lucide-react";
import { money } from "../../utils/money";

/* ==========================================================================
   1. Milestone 1: Statement Preview Modal
   ========================================================================== */
export function StatementModal({ isOpen, onClose, accountData }) {
  if (!isOpen) return null;

  const txns = [
    { id: "TXN-8941", date: "21 Nov 2026, 10:15 am", desc: "Core Banking Deposit (Cash Counter #4)", amount: 2400.0, type: "CREDIT", balance: 12847.5 },
    { id: "TXN-8823", date: "20 Nov 2026, 03:40 pm", desc: "NEFT Salary Credit - FINC-CORP", amount: 8500.0, type: "CREDIT", balance: 10447.5 },
    { id: "TXN-8711", date: "19 Nov 2026, 01:20 pm", desc: "IMPS Outward Transfer to Jane Doe", amount: -450.0, type: "DEBIT", balance: 1947.5 },
    { id: "TXN-8604", date: "18 Nov 2026, 09:05 am", desc: "Utility Bill Auto-Debit - Electricity", amount: -125.0, type: "DEBIT", balance: 2397.5 },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="milestone-modal-overlay" onClick={onClose}>
      <div className="milestone-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="milestone-modal-header">
          <h3>
            <FileText size={18} className="text-blue-500" />
            Electronic Account Statement — {accountData?.accountNumber || "1234-5678-9012"}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface text-muted" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="milestone-modal-body">
          <div className="p-3 bg-surface border rounded-lg flex justify-between items-center text-xs">
            <div>
              <span className="text-muted block">Account Holder</span>
              <strong className="text-sm">{accountData?.customerName || "John Smith"}</strong>
            </div>
            <div>
              <span className="text-muted block">Account Type</span>
              <strong>{accountData?.type || "Savings"}</strong>
            </div>
            <div>
              <span className="text-muted block">Current Ledger Balance</span>
              <strong className="text-emerald-500 text-sm">{money(accountData?.balance || 12847.5)}</strong>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface border-b text-muted font-semibold">
                <tr>
                  <th className="p-2.5">Date & Time</th>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5 text-right">Amount</th>
                  <th className="p-2.5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {txns.map((t) => (
                  <tr key={t.id} className="hover:bg-surface/50">
                    <td className="p-2.5 text-muted">{t.date}</td>
                    <td className="p-2.5 font-medium">{t.desc}</td>
                    <td className={`p-2.5 text-right font-bold ${t.amount > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                      {t.amount > 0 ? `+${money(t.amount)}` : money(t.amount)}
                    </td>
                    <td className="p-2.5 text-right font-semibold">{money(t.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400 flex items-center gap-2">
            <ShieldCheck size={16} className="shrink-0" />
            <span>Cryptographic Statement Hash: SHA-256: 8f9b4d21... Verified against immutable audit database.</span>
          </div>
        </div>

        <div className="milestone-modal-footer">
          <button onClick={handlePrint} className="spec-action-btn">
            <Printer size={14} /> Print Statement
          </button>
          <button onClick={onClose} className="primary-button btn-sm">
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   2. Milestone 2: Amortization Schedule & Prepay Modal
   ========================================================================== */
export function LoanScheduleModal({ isOpen, onClose, loanData, mode = "schedule" }) {
  if (!isOpen) return null;

  const [prepayAmount, setPrepayAmount] = useState("10000");
  const [prepayDone, setPrepayDone] = useState(false);

  const installments = [
    { num: 1, date: "05 Jul 2026", emi: 1847, principal: 147, interest: 1700, balance: 239853 },
    { num: 2, date: "05 Aug 2026", emi: 1847, principal: 148, interest: 1699, balance: 239705 },
    { num: 3, date: "05 Sep 2026", emi: 1847, principal: 149, interest: 1698, balance: 239556 },
    { num: 4, date: "05 Oct 2026", emi: 1847, principal: 150, interest: 1697, balance: 239406 },
    { num: 5, date: "05 Nov 2026", emi: 1847, principal: 151, interest: 1696, balance: 239255 },
  ];

  return (
    <div className="milestone-modal-overlay" onClick={onClose}>
      <div className="milestone-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="milestone-modal-header">
          <h3>
            <Calendar size={18} className="text-indigo-400" />
            {mode === "schedule" && `Amortization Schedule — ${loanData?.loanId || "HL-2024-1247"}`}
            {mode === "prepay" && `Loan Prepayment Facility — ${loanData?.loanId || "HL-2024-1247"}`}
            {mode === "foreclose" && `Loan Foreclosure Settlement — ${loanData?.loanId || "HL-2024-1247"}`}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface text-muted" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="milestone-modal-body">
          {mode === "schedule" && (
            <>
              <div className="grid grid-cols-3 gap-3 p-3 bg-surface border rounded-lg text-xs">
                <div>
                  <span className="text-muted block">Principal</span>
                  <strong>{money(loanData?.principal || 240000)}</strong>
                </div>
                <div>
                  <span className="text-muted block">Monthly EMI</span>
                  <strong className="text-indigo-400">{money(loanData?.emi || 1847)}</strong>
                </div>
                <div>
                  <span className="text-muted block">Tenure / Rate</span>
                  <strong>240 mos @ 8.5%</strong>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface border-b text-muted font-semibold sticky top-0">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Due Date</th>
                      <th className="p-2 text-right">EMI</th>
                      <th className="p-2 text-right">Principal</th>
                      <th className="p-2 text-right">Interest</th>
                      <th className="p-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {installments.map((inst) => (
                      <tr key={inst.num}>
                        <td className="p-2 font-bold">{inst.num}</td>
                        <td className="p-2 text-muted">{inst.date}</td>
                        <td className="p-2 text-right font-semibold">{money(inst.emi)}</td>
                        <td className="p-2 text-right text-emerald-500">{money(inst.principal)}</td>
                        <td className="p-2 text-right text-muted">{money(inst.interest)}</td>
                        <td className="p-2 text-right font-medium">{money(inst.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted">Showing first 5 of 240 scheduled auto-debit amortization installments.</p>
            </>
          )}

          {mode === "prepay" && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                Prepaying principal reduces outstanding balance and saves future interest payments.
              </p>
              <div>
                <label className="text-xs text-muted block mb-1">Prepayment Amount (USD)</label>
                <input
                  type="number"
                  value={prepayAmount}
                  onChange={(e) => setPrepayAmount(e.target.value)}
                  className="form-input text-sm w-full"
                />
              </div>
              <div className="p-3 bg-surface border rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted">Prepayment Penalty (0%):</span>
                  <strong>$0.00</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Revised Outstanding Balance:</span>
                  <strong className="text-emerald-500">{money(240000 - Number(prepayAmount || 0))}</strong>
                </div>
              </div>
              {prepayDone && (
                <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>Prepayment of {money(prepayAmount)} executed successfully! Ledger updated.</span>
                </div>
              )}
            </div>
          )}

          {mode === "foreclose" && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-surface border rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted">Total Outstanding Principal:</span>
                  <strong>$240,000.00</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Interest accrued to date:</span>
                  <strong>$1,700.00</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Foreclosure processing fee:</span>
                  <strong>$0.00 (Waived)</strong>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-sm">
                  <span>Net Payoff Amount:</span>
                  <span className="text-indigo-400">$241,700.00</span>
                </div>
              </div>
              <p className="text-muted">
                Foreclosure terminates the loan contract, releases mortgage collaterals, and dispatches a No-Dues Certificate.
              </p>
            </div>
          )}
        </div>

        <div className="milestone-modal-footer">
          {mode === "prepay" && !prepayDone && (
            <button
              onClick={() => setPrepayDone(true)}
              className="primary-button btn-sm"
            >
              Confirm Prepayment
            </button>
          )}
          <button onClick={onClose} className="secondary-button btn-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   3. Milestone 3: Payment Advice Receipt Modal
   ========================================================================== */
export function PaymentReceiptModal({ isOpen, onClose, paymentData }) {
  if (!isOpen) return null;

  return (
    <div className="milestone-modal-overlay" onClick={onClose}>
      <div className="milestone-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="milestone-modal-header">
          <h3>
            <CheckCircle2 size={18} className="text-emerald-500" />
            Electronic Payment Advice — {paymentData?.utr || "IMPS123456789"}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface text-muted" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="milestone-modal-body">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">Transaction Status: SETTLED</span>
            <div className="text-3xl font-extrabold text-white">{money(paymentData?.amount || 2400)}</div>
            <p className="text-xs text-muted">Transferred via {paymentData?.rail || "IMPS"} Rail</p>
          </div>

          <div className="divide-y divide-border text-xs">
            <div className="py-2 flex justify-between">
              <span className="text-muted">Unique Transaction Reference (UTR):</span>
              <strong className="font-mono text-cyan">{paymentData?.utr || "IMPS123456789"}</strong>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-muted">Sender Account:</span>
              <strong>{paymentData?.fromAccount || "1234-5678"}</strong>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-muted">Beneficiary Account:</span>
              <strong>{paymentData?.toAccount || "9876-5432"} ({paymentData?.beneficiary || "Jane Doe"})</strong>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-muted">Settlement Engine Mode:</span>
              <span className="font-semibold text-emerald-400">T+0 Instant Clearing</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-muted">Fraud Risk Score:</span>
              <span className="text-emerald-400 font-semibold">0.12 (Low — Fast Path Approved)</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-muted">Saga Execution Cycle:</span>
              <span>Debit → Credit → Notify (2.4s)</span>
            </div>
          </div>
        </div>

        <div className="milestone-modal-footer">
          <button onClick={() => window.print()} className="spec-action-btn">
            <Download size={14} /> Download PDF Advice
          </button>
          <button onClick={onClose} className="primary-button btn-sm">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   4. Milestone 4: Digital KYC Dossier Modal
   ========================================================================== */
export function KycDossierModal({ isOpen, onClose, kycData }) {
  if (!isOpen) return null;

  return (
    <div className="milestone-modal-overlay" onClick={onClose}>
      <div className="milestone-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="milestone-modal-header">
          <h3>
            <UserCheck size={18} className="text-purple-400" />
            Digital KYC Verification Dossier — {kycData?.applicantId || "#KYC-2024-1247"}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface text-muted" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="milestone-modal-body">
          <div className="flex items-center gap-4 p-3 bg-surface border rounded-lg">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 border-2 border-purple-400 flex items-center justify-center font-bold text-lg text-purple-300">
              JD
            </div>
            <div className="space-y-0.5">
              <h4 className="font-bold text-sm">{kycData?.customerName || "Jane Doe"}</h4>
              <p className="text-xs text-muted">Aadhaar: XXXX-XXXX-4819 | PAN: ABCPD1234F</p>
              <div className="flex gap-2 pt-1">
                <span className="spec-data-val badge-success">Face Match 94%</span>
                <span className="spec-data-val badge-info">Liveness Passed</span>
                <span className="spec-data-val badge-success">PEP Clear</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <h5 className="font-semibold text-muted uppercase tracking-wider">Document AI & OCR Extraction</h5>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-surface border rounded-lg">
                <strong className="block text-indigo-400">Aadhaar National ID</strong>
                <span className="text-muted block mt-1">OCR Confidence: 99.4%</span>
                <span className="text-emerald-400">UIDAI cryptographic XML signature verified</span>
              </div>
              <div className="p-2.5 bg-surface border rounded-lg">
                <strong className="block text-indigo-400">Income Tax PAN Card</strong>
                <span className="text-muted block mt-1">OCR Confidence: 98.8%</span>
                <span className="text-emerald-400">NSDL / Protean verification active</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs space-y-1">
            <strong className="text-purple-300 block">PCI-DSS & Audit Compliance Proof</strong>
            <p className="text-muted">
              PII is encrypted at rest using AES-256-GCM cipher. SHA-256 hash chained into immutable audit log.
              Keycloak role <code className="text-cyan">ROLE_CUSTOMER_VERIFIED</code> assigned upon final approval.
            </p>
          </div>
        </div>

        <div className="milestone-modal-footer">
          <button onClick={onClose} className="primary-button btn-sm">
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
