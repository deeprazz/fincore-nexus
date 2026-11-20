import React, { useState, useEffect, useCallback } from "react";
import Tabs from "../../components/ui/Tabs";
import Spinner from "../../components/ui/Spinner";
import PaymentForm from "./PaymentForm";
import PaymentReceipt from "./PaymentReceipt";
import PaymentSagaTracker from "./PaymentSagaTracker";
import BeneficiaryList from "./BeneficiaryList";
import BeneficiaryForm from "./BeneficiaryForm";
import PaymentHistory from "./PaymentHistory";
import SettlementReport from "./SettlementReport";
import {
  initiatePayment,
  getPayments,
  getBeneficiaries,
  addBeneficiary,
  verifyPennyDrop,
  deleteBeneficiary,
  approvePayment,
  rejectPayment,
  retryCompensation,
} from "../../api/payments";
import { getAccounts } from "../../api/accounts";
import { useAuth } from "../../context/AuthContext";

const TABS = [
  { id: "transfer", label: "Transfer Funds" },
  { id: "beneficiaries", label: "Beneficiaries" },
  { id: "history", label: "Transaction History" },
  { id: "settlement", label: "Settlement & Reconciliation" },
];

export default function PaymentsPage() {
  const { auth } = useAuth();
  const [activeTab, setActiveTab] = useState("transfer");
  const [accounts, setAccounts] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [activeTrackingPayment, setActiveTrackingPayment] = useState(null);
  const [prefilledBeneficiary, setPrefilledBeneficiary] = useState(null);
  const [showAddBenModal, setShowAddBenModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [accs, bens, pmts] = await Promise.all([
        getAccounts(auth).catch(() => []),
        getBeneficiaries(null, auth).catch(() => []),
        getPayments(null, auth).catch(() => []),
      ]);
      setAccounts(Array.isArray(accs) ? accs : []);
      setBeneficiaries(Array.isArray(bens) ? bens : []);
      setPayments(Array.isArray(pmts) ? pmts : []);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePaymentSubmit = async (payload, idempotencyKey) => {
    setFeedbackMessage(null);
    const res = await initiatePayment(payload, idempotencyKey, auth);
    setActiveTrackingPayment(res);
    await loadData();
  };

  const handleAddBeneficiary = async (payload) => {
    setFeedbackMessage(null);
    await addBeneficiary(payload, auth);
    setShowAddBenModal(false);
    await loadData();
    setFeedbackMessage({ type: "success", text: "Beneficiary registered. Proceed with simulated penny-drop verification." });
  };

  const handleVerifyPennyDrop = async (id) => {
    setFeedbackMessage(null);
    try {
      const updated = await verifyPennyDrop(id, auth);
      await loadData();
      setFeedbackMessage({
        type: updated.status === "VERIFIED" ? "success" : "warning",
        text: `Penny-Drop complete: Status is ${updated.status}. ${updated.verificationDetails || ""}`
      });
    } catch (err) {
      setFeedbackMessage({ type: "error", text: err.message || "Failed to verify beneficiary" });
      await loadData();
    }
  };

  const handleDeleteBeneficiary = async (id) => {
    setFeedbackMessage(null);
    await deleteBeneficiary(id, auth);
    await loadData();
  };

  const handleApprovePayment = async (id) => {
    setFeedbackMessage(null);
    try {
      const res = await approvePayment(id, auth);
      await loadData();
      setFeedbackMessage({ type: "success", text: `Payment ${res.utr || id} approved and released to settlement.` });
    } catch (err) {
      setFeedbackMessage({ type: "error", text: err.message || "Approval failed" });
    }
  };

  const handleRejectPayment = async (id, reason) => {
    setFeedbackMessage(null);
    try {
      await rejectPayment(id, reason, auth);
      await loadData();
      setFeedbackMessage({ type: "warning", text: `Payment rejected by reviewer.` });
    } catch (err) {
      setFeedbackMessage({ type: "error", text: err.message || "Rejection failed" });
    }
  };

  const handleRetryCompensation = async (id) => {
    setFeedbackMessage(null);
    try {
      await retryCompensation(id, auth);
      await loadData();
      setFeedbackMessage({ type: "success", text: "Refund compensation retried successfully." });
    } catch (err) {
      setFeedbackMessage({ type: "error", text: err.message || "Compensation retry failed" });
    }
  };

  const handlePayBeneficiary = (ben) => {
    setPrefilledBeneficiary(ben);
    setSelectedReceipt(null);
    setActiveTrackingPayment(null);
    setActiveTab("transfer");
  };

  if (loading && payments.length === 0 && beneficiaries.length === 0) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <div>
          <h2 className="text-2xl font-bold">Payments & Transfer Orchestration</h2>
          <p className="text-sm text-muted">
            IMPS, UPI, NEFT Rails with Rule-Based Fraud Detection & Automated Saga Settlement
          </p>
        </div>
      </div>

      {feedbackMessage && (
        <div className={`p-3 rounded text-sm flex items-center justify-between border ${
          feedbackMessage.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
          feedbackMessage.type === "warning" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
          "bg-red-500/10 border-red-500/30 text-red-400"
        }`}>
          <span>{feedbackMessage.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-xs ml-4 underline opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      <Tabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={(tab) => {
          setActiveTab(tab);
          setSelectedReceipt(null);
          setActiveTrackingPayment(null);
        }}
      />

      {activeTab === "transfer" && (
        <div>
          {activeTrackingPayment ? (
            <PaymentSagaTracker
              initialPayment={activeTrackingPayment}
              onViewReceipt={(p) => {
                setSelectedReceipt(p);
                setActiveTrackingPayment(null);
              }}
              onNewPayment={() => {
                setActiveTrackingPayment(null);
                setSelectedReceipt(null);
                setPrefilledBeneficiary(null);
              }}
              onViewHistory={() => {
                setActiveTrackingPayment(null);
                setSelectedReceipt(null);
                setActiveTab("history");
              }}
            />
          ) : selectedReceipt ? (
            <PaymentReceipt
              payment={selectedReceipt}
              onReset={() => {
                setSelectedReceipt(null);
                setPrefilledBeneficiary(null);
              }}
              onViewSaga={() => {
                setActiveTrackingPayment(selectedReceipt);
                setSelectedReceipt(null);
              }}
            />
          ) : (
            <div className="card p-6 border">
              <PaymentForm
                accounts={accounts}
                beneficiaries={beneficiaries}
                defaultBeneficiary={prefilledBeneficiary}
                onSubmitPayment={handlePaymentSubmit}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "beneficiaries" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-base">Beneficiary Registry</h3>
            <button
              onClick={() => setShowAddBenModal(!showAddBenModal)}
              className="px-3 py-1.5 rounded bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors"
            >
              {showAddBenModal ? "Close Form" : "+ Add Beneficiary"}
            </button>
          </div>

          {showAddBenModal && (
            <div className="card p-5 border bg-surface-alt">
              <h4 className="font-bold text-sm mb-3">Register New Beneficiary</h4>
              <BeneficiaryForm
                onCreated={handleAddBeneficiary}
                onCancel={() => setShowAddBenModal(false)}
              />
            </div>
          )}

          <BeneficiaryList
            beneficiaries={beneficiaries}
            onVerifyPennyDrop={handleVerifyPennyDrop}
            onDelete={handleDeleteBeneficiary}
            onSelectForPayment={handlePayBeneficiary}
          />
        </div>
      )}

      {activeTab === "history" && (
        <div className="card p-5 border">
          {activeTrackingPayment ? (
            <PaymentSagaTracker
              initialPayment={activeTrackingPayment}
              onViewReceipt={(p) => {
                setSelectedReceipt(p);
                setActiveTrackingPayment(null);
              }}
              onNewPayment={() => {
                setActiveTrackingPayment(null);
                setSelectedReceipt(null);
                setActiveTab("transfer");
              }}
              onViewHistory={() => {
                setActiveTrackingPayment(null);
                setSelectedReceipt(null);
              }}
            />
          ) : selectedReceipt ? (
            <PaymentReceipt
              payment={selectedReceipt}
              onReset={() => setSelectedReceipt(null)}
              onViewSaga={() => {
                setActiveTrackingPayment(selectedReceipt);
                setSelectedReceipt(null);
              }}
            />
          ) : (
            <PaymentHistory
              payments={payments}
              currentUser={auth}
              onViewReceipt={(p) => setSelectedReceipt(p)}
              onTrackSaga={(p) => {
                setActiveTrackingPayment(p);
                setSelectedReceipt(null);
              }}
              onApprove={handleApprovePayment}
              onReject={handleRejectPayment}
              onRetryCompensation={handleRetryCompensation}
            />
          )}
        </div>
      )}

      {activeTab === "settlement" && <SettlementReport />}
    </div>
  );
}
