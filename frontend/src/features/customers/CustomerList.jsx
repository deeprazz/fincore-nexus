import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, CheckCircle2, UserCheck } from "lucide-react";
import { CustomerForm } from "./CustomerForm";
import { CustomerTable } from "./CustomerTable";
import { getCustomers, updateCustomerKyc } from "../../api/customers";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const { auth } = useAuth();
  const { setError, setSuccess } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCustomers("ALL", auth);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [auth, setError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleKycAction = async (customerId, newStatus) => {
    setLoading(true);
    try {
      await updateCustomerKyc(customerId, newStatus, auth);
      setSuccess(`Customer KYC successfully updated to ${newStatus}. Full banking services and account opening unlocked.`);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to update KYC status.");
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = customers.filter(c => String(c.kycStatus ?? "").toUpperCase() === "PENDING").length;

  return (
    <>
      <CustomerForm onCustomerCreated={loadData} />

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Customer Directory &amp; KYC Verification</h2>
            <p>
              {customers.length} customer record(s) registered in Core Banking
              {pendingCount > 0 && ` — ${pendingCount} awaiting KYC confirmation`}
            </p>
          </div>
          <button
            className="secondary-button"
            onClick={loadData}
            disabled={loading}
            type="button"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 14px",
            background: "rgba(37, 99, 235, 0.08)",
            border: "1px solid rgba(37, 99, 235, 0.25)",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "12px",
            color: "#60a5fa",
          }}
        >
          <UserCheck size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Teller Verification Station:</strong> Review customer Aadhaar, PAN, and Phone records. Click <strong>Confirm KYC</strong> on any PENDING record to verify the customer and immediately unlock bank account opening.
          </span>
        </div>

        <CustomerTable
          customers={customers}
          showKycActions={true}
          onKycAction={handleKycAction}
          disabled={loading}
        />
      </section>
    </>
  );
}

export default CustomerList;
