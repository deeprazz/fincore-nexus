import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import Button from "../../components/ui/Button";
import FormField from "../../components/ui/FormField";

const RAILS = [
  { id: "IMPS", name: "IMPS (Immediate Payment)", limit: "₹5,00,000", maxAmount: 500000, badge: "Instant 24x7", time: "Instant (T+0)" },
  { id: "UPI", name: "UPI (Unified Payments)", limit: "₹1,00,000", maxAmount: 100000, badge: "VPA Instant", time: "Instant (T+0)" },
  { id: "NEFT", name: "NEFT (National Electronic)", limit: "₹10,00,000", maxAmount: 1000000, badge: "Half-hourly Batch", time: "Scheduled Half-hourly Batch" },
];

export default function PaymentForm({
  accounts = [],
  beneficiaries = [],
  onSubmitPayment,
  defaultBeneficiary = null,
}) {
  // Wizard steps: 'details' | 'review' | 'authorize'
  const [step, setStep] = useState("details");

  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id || "");
  const [paymentRail, setPaymentRail] = useState("IMPS");
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState(defaultBeneficiary?.id || "");
  const [targetAccount, setTargetAccount] = useState(defaultBeneficiary?.accountNumber || "");
  const [targetIfsc, setTargetIfsc] = useState(defaultBeneficiary?.ifscCode || "FINC0001234");
  const [targetVpa, setTargetVpa] = useState(defaultBeneficiary?.vpa || "");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [transactionPassword, setTransactionPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sourceAccountId && accounts.length > 0) {
      setSourceAccountId(accounts[0].id);
    }
  }, [accounts, sourceAccountId]);

  const selectedBeneficiary = beneficiaries.find((b) => b.id === selectedBeneficiaryId);
  const isBeneficiaryUnverified = selectedBeneficiary && selectedBeneficiary.status !== "VERIFIED";
  const selectedAcc = accounts.find((a) => a.id === sourceAccountId) || accounts[0];
  const activeRail = RAILS.find((r) => r.id === paymentRail) || RAILS[0];

  const handleBeneficiaryChange = (e) => {
    const val = e.target.value;
    setSelectedBeneficiaryId(val);
    const ben = beneficiaries.find((b) => b.id === val);
    if (ben) {
      setTargetAccount(ben.accountNumber || "");
      setTargetIfsc(ben.ifscCode || "FINC0001234");
      setTargetVpa(ben.vpa || "");
    } else {
      setTargetAccount("");
      setTargetIfsc("FINC0001234");
      setTargetVpa("");
    }
  };

  const handleProceedToReview = (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedAcc || !selectedAcc.id) {
      setError("Please select a valid source bank account.");
      return;
    }

    if (isBeneficiaryUnverified) {
      setError(`Cannot transfer funds to ${selectedBeneficiary.status} beneficiary. Simulated penny-drop verification must be completed first.`);
      return;
    }

    const trimmedAmount = amount.trim();
    if (!trimmedAmount || !/^\d+(\.\d{1,2})?$/.test(trimmedAmount) || Number(trimmedAmount) <= 0) {
      setError("Please enter a valid positive transfer amount (up to 2 decimal places).");
      return;
    }

    const numAmount = Number(trimmedAmount);
    if (numAmount > activeRail.maxAmount) {
      setError(`Amount ₹${numAmount.toLocaleString("en-IN")} exceeds the maximum per-transaction limit of ${activeRail.limit} for ${paymentRail}.`);
      return;
    }

    const availableBalance = Number(selectedAcc.balance || 0);
    if (numAmount > availableBalance) {
      setError(`Insufficient funds: Transfer amount (₹${numAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}) exceeds available account balance (₹${availableBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}).`);
      return;
    }

    if (paymentRail === "UPI" && !targetVpa.trim()) {
      setError("Please specify a valid recipient UPI Virtual Payment Address (VPA).");
      return;
    }

    if (paymentRail !== "UPI" && (!targetAccount.trim() || !targetIfsc.trim())) {
      setError("Please specify valid destination account number and IFSC code.");
      return;
    }

    setStep("review");
  };

  const handleProceedToAuthorize = () => {
    setError(null);
    setStep("authorize");
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!transactionPassword || transactionPassword.trim().length === 0) {
      setError("Please enter your transaction authorization password or PIN to confirm.");
      return;
    }

    setSubmitting(true);

    try {
      const resolvedCustomerId = selectedAcc?.customerId || selectedBeneficiary?.customerId || selectedAcc?.id;
      const payload = {
        customerId: resolvedCustomerId,
        sourceAccountId: selectedAcc.id,
        beneficiaryId: selectedBeneficiaryId || null,
        targetAccountNumber: paymentRail === "UPI" ? "" : targetAccount,
        targetIfsc: paymentRail === "UPI" ? "UPI0000000" : (targetIfsc || "FINC0001234"),
        targetVpa: paymentRail === "UPI" ? targetVpa : "",
        amount: amount.trim(),
        paymentRail,
        purpose: purpose.trim() || "Fund Transfer",
        transactionPassword: transactionPassword.trim(),
        transactionPin: transactionPassword.trim(),
      };

      const idempotencyKey = crypto.randomUUID();
      await onSubmitPayment(payload, idempotencyKey);
    } catch (err) {
      setError(err.message || "Failed to execute payment transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const maskedTarget = paymentRail === "UPI"
    ? targetVpa
    : targetAccount.length > 4
    ? `••••••••${targetAccount.slice(-4)}`
    : targetAccount;

  const maskedSource = selectedAcc?.accountNumber
    ? (selectedAcc.accountNumber.length > 4
        ? `••••••••${selectedAcc.accountNumber.slice(-4)}`
        : selectedAcc.accountNumber)
    : "Primary Ledger";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Wizard Progress Stepper */}
      <div className="flex items-center justify-between pb-4 border-b border-border text-xs">
        <div className={`flex items-center gap-2 ${step === "details" ? "text-primary font-bold" : "text-muted"}`}>
          <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-semibold shrink-0 ${step === "details" ? "bg-primary text-white ring-2 ring-primary/20" : "bg-surface-alt border border-border text-muted"}`}>1</span>
          <span>Enter Details</span>
        </div>
        <span className="text-muted/60">→</span>
        <div className={`flex items-center gap-2 ${step === "review" ? "text-primary font-bold" : "text-muted"}`}>
          <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-semibold shrink-0 ${step === "review" ? "bg-primary text-white ring-2 ring-primary/20" : "bg-surface-alt border border-border text-muted"}`}>2</span>
          <span>Review Transfer</span>
        </div>
        <span className="text-muted/60">→</span>
        <div className={`flex items-center gap-2 ${step === "authorize" ? "text-primary font-bold" : "text-muted"}`}>
          <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-semibold shrink-0 ${step === "authorize" ? "bg-primary text-white ring-2 ring-primary/20" : "bg-surface-alt border border-border text-muted"}`}>3</span>
          <span>Authorize & Pay</span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-sm flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Enter Payment Details */}
      {step === "details" && (
        <form onSubmit={handleProceedToReview} className="space-y-5">
          {/* Rail Selection */}
          <div>
            <label className="block text-sm font-semibold mb-2">Select Transfer Rail</label>
            <div className="rails-grid grid grid-cols-3 gap-3">
              {RAILS.map((rail) => (
                <div
                  key={rail.id}
                  onClick={() => setPaymentRail(rail.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    paymentRail === rail.id
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-surface border-border hover:border-muted"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm">{rail.id}</span>
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-surface-alt border">
                      {rail.badge}
                    </span>
                  </div>
                  <div className="text-xs text-muted">Max: {rail.limit}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Source Account Selection */}
          <FormField label="From Source Account" required>
            <select
              className="form-input"
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              required
            >
              {accounts.length > 0 ? (
                accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountNumber} — Balance: ₹{Number(acc.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </option>
                ))
              ) : (
                <option value="">No active accounts found</option>
              )}
            </select>
          </FormField>

          {/* Beneficiary selection */}
          <FormField label="Select Beneficiary (or enter manually)">
            <select
              className="form-input"
              value={selectedBeneficiaryId}
              onChange={handleBeneficiaryChange}
            >
              <option value="">-- Manual / Direct Transfer --</option>
              {beneficiaries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.accountNumber || b.vpa} - {b.status})
                </option>
              ))}
            </select>
          </FormField>

          {/* Warning if selected beneficiary is not verified */}
          {isBeneficiaryUnverified && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded text-xs flex items-center justify-between">
              <span>
                <strong>Warning:</strong> Selected beneficiary is <strong>{selectedBeneficiary.status}</strong>. Complete simulated penny-drop verification before transfers.
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                SIMULATED
              </span>
            </div>
          )}

          {/* Account / IFSC or VPA based on Rail */}
          {paymentRail === "UPI" ? (
            <FormField label="Recipient UPI VPA" required>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. mobile@upi or name@icici"
                value={targetVpa}
                onChange={(e) => setTargetVpa(e.target.value)}
                required
              />
              <span className="text-2xs text-muted block mt-1">
                Virtual Payment Address (No IFSC required for UPI rails)
              </span>
            </FormField>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Destination Account Number" required>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 100000000012"
                  value={targetAccount}
                  onChange={(e) => setTargetAccount(e.target.value)}
                  required
                />
              </FormField>

              <FormField label="Destination IFSC Code" required>
                <input
                  type="text"
                  className="form-input font-mono"
                  placeholder="FINC0001234"
                  value={targetIfsc}
                  onChange={(e) => setTargetIfsc(e.target.value.toUpperCase())}
                  required
                />
                <span className="text-2xs text-muted block mt-1">
                  FinCore branch IFSC: FINC0001234
                </span>
              </FormField>
            </div>
          )}

          {/* Amount and Purpose */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Amount (INR)" required>
              <input
                type="number"
                step="0.01"
                min="1"
                className="form-input font-mono"
                placeholder="5000.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              {selectedAcc && (
                <span className="text-2xs text-muted block mt-1">
                  Available balance: ₹{Number(selectedAcc.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              )}
            </FormField>

            <FormField label="Payment Remarks / Purpose">
              <input
                type="text"
                className="form-input"
                placeholder="Invoice / Vendor Settlement / Rent"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </FormField>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isBeneficiaryUnverified}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <span>Review Payment</span>
              <ArrowRight size={15} />
            </Button>
          </div>
        </form>
      )}

      {/* STEP 2: Review Payment Confirmation */}
      {step === "review" && (
        <div className="space-y-5">
          <div className="p-5 rounded-xl bg-surface border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-xs uppercase font-bold text-muted tracking-wider">Confirm Payment Details</span>
                <h3 className="text-lg font-bold">Transfer Summary Review</h3>
              </div>
              <span className="px-2.5 py-1 rounded text-xs font-bold bg-primary/10 text-primary border border-primary/30">
                {paymentRail}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded bg-surface-alt/50 border border-border">
                <span className="text-muted block">Beneficiary / Recipient</span>
                <strong className="text-sm block mt-0.5">{selectedBeneficiary?.name || "Direct Transfer Recipient"}</strong>
                <span className="font-mono text-muted">{maskedTarget}</span>
                {paymentRail !== "UPI" && (
                  <span className="block text-muted font-mono mt-0.5">IFSC: {targetIfsc}</span>
                )}
              </div>

              <div className="p-3 rounded bg-surface-alt/50 border border-border">
                <span className="text-muted block">From Account</span>
                <strong className="text-sm font-mono block mt-0.5">{maskedSource}</strong>
                <span className="text-muted block mt-0.5">
                  Avail Balance: ₹{Number(selectedAcc?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-4 rounded-lg bg-surface-alt border border-border space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted">Transfer Amount</span>
                <span className="font-bold font-mono">
                  ₹{Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted">Convenience Fee / Taxes</span>
                <span className="text-emerald-400 font-semibold">₹0.00 (Zero Fee)</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between items-center text-base font-bold">
                <span>Total Debit Amount</span>
                <span className="text-primary font-mono text-lg">
                  ₹{Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="text-xs text-muted flex items-center gap-2 p-2.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300">
              <Clock size={15} className="shrink-0" />
              <span>
                <strong>Clearing SLA:</strong> {activeRail.time}. Transferred via FinCore Distributed Saga Orchestrator.
              </span>
            </div>

            {purpose && (
              <div className="text-xs">
                <span className="text-muted">Remarks / Reference: </span>
                <span className="font-medium">{purpose}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep("details")}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={15} />
              <span>Back & Edit</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={handleProceedToAuthorize}
              className="flex items-center gap-2"
            >
              <span>Proceed to Authorize</span>
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Payment Password / PIN Confirmation */}
      {step === "authorize" && (
        <form onSubmit={handleFinalSubmit} className="space-y-5">
          <div className="p-6 rounded-xl bg-surface border border-border space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base">Payment Authorization Required</h3>
                <p className="text-xs text-muted">
                  Confirm transaction of <strong className="text-foreground">₹{Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong> via {paymentRail}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-surface-alt border border-border space-y-3">
              <label className="block text-xs font-semibold text-foreground">
                Transaction Password or 4-Digit Security PIN
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input pr-10 font-mono tracking-widest text-center text-lg"
                  placeholder="••••"
                  autoComplete="current-password"
                  value={transactionPassword}
                  onChange={(e) => setTransactionPassword(e.target.value)}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="p-2.5 rounded bg-surface border border-border/70 text-[11px] text-muted space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <ShieldCheck size={13} />
                  <span>Security & Compliance Protection</span>
                </div>
                <p>
                  Your transaction password is never cached in browser localStorage, never logged, and is securely verified against FinCore backend services over encrypted channels.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => setStep("review")}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={15} />
              <span>Back to Review</span>
            </Button>

            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              disabled={submitting || !transactionPassword.trim()}
              className="flex items-center gap-2 px-6"
            >
              <span>{submitting ? "Submitting Payment..." : `Pay ₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
