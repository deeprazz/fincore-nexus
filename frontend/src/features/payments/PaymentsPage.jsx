import React, { useState, useEffect } from "react";
import Tabs from "../../components/ui/Tabs";
import Spinner from "../../components/ui/Spinner";
import PaymentForm from "./PaymentForm";
import PaymentReceipt from "./PaymentReceipt";
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
} from "../../api/payments";
import { getAccounts } from "../../api/accounts";

const TABS = [
  { id: "transfer", label: "Transfer Funds" },
  { id: "beneficiaries", label: "Beneficiaries" },
  { id: "history", label: "Transaction History" },
  { id: "settlement", label: "Settlement & Reconciliation" },
];

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState("transfer");
  const [accounts, setAccounts] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [prefilledBeneficiary, setPrefilledBeneficiary] = useState(null);
  const [showAddBenModal, setShowAddBenModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accs, bens, pmts] = await Promise.all([
        getAccounts().catch(() => []),
        getBeneficiaries().catch(() => []),
        getPayments().catch(() => []),
      ]);
      setAccounts(Array.isArray(accs) ? accs : []);
      setBeneficiaries(Array.isArray(bens) ? bens : []);
      setPayments(Array.isArray(pmts) ? pmts : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePaymentSubmit = async (payload) => {
    const res = await initiatePayment(payload);
    setSelectedReceipt(res);
    await loadData();
  };

  const handleAddBeneficiary = async (payload) => {
    await addBeneficiary(payload);
    setShowAddBenModal(false);
    await loadData();
  };

  const handleVerifyPennyDrop = async (id) => {
    await verifyPennyDrop(id);
    await loadData();
  };

  const handleDeleteBeneficiary = async (id) => {
    await deleteBeneficiary(id);
    await loadData();
  };

  const handlePayBeneficiary = (ben) => {
    setPrefilledBeneficiary(ben);
    setSelectedReceipt(null);
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

      <Tabs tabs={TABS} activeTab={activeTab} onChange={(tab) => { setActiveTab(tab); setSelectedReceipt(null); }} />

      {activeTab === "transfer" && (
        <div>
          {selectedReceipt ? (
            <PaymentReceipt
              payment={selectedReceipt}
              onReset={() => {
                setSelectedReceipt(null);
                setPrefilledBeneficiary(null);
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
          {selectedReceipt ? (
            <PaymentReceipt
              payment={selectedReceipt}
              onReset={() => setSelectedReceipt(null)}
            />
          ) : (
            <PaymentHistory
              payments={payments}
              onViewReceipt={(p) => setSelectedReceipt(p)}
            />
          )}
        </div>
      )}

      {activeTab === "settlement" && <SettlementReport />}
    </div>
  );
}
