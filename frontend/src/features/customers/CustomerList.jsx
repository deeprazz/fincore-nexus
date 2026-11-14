import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, ShieldAlert, CheckCircle2 } from "lucide-react";
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

  const isManagerOrAdmin = auth?.role === "MANAGER" || auth?.role === "ADMIN";

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
      setSuccess(`Customer KYC updated to ${newStatus}. Account opening is now unlocked.`);
      await loadData();
    } catch (err) {
      if (err.message && (err.message.includes("403") || err.message.includes("Forbidden"))) {
        setError(
          "Maker-Checker Access Control (403): Tellers cannot approve KYC. Please sign in as Manager (manager / Manager@123) or Admin to approve KYC."
        );
      } else {
        setError(err.message || "Failed to update KYC status.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CustomerForm onCustomerCreated={loadData} />

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Customer Directory & Verification</h2>
            <p>{customers.length} customer record(s) registered in Core Banking</p>
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

        {!isManagerOrAdmin && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "12px",
              color: "#fbbf24",
            }}
          >
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>Maker-Checker Dual Control:</strong> You are signed in as <strong>{auth?.role || "TELLER"}</strong>.
              To approve/verify customer KYC and unlock account opening, sign in as <strong>Manager</strong> (<code>manager</code> / <code>Manager@123</code>).
            </span>
          </div>
        )}

        {isManagerOrAdmin && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "12px",
              color: "#34d399",
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>Manager Authority Active:</strong> Click <strong>Verify</strong> on any PENDING customer below to verify their KYC and immediately unlock account opening.
            </span>
          </div>
        )}

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
