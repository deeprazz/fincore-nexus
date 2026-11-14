import React, { useState, useEffect, useCallback } from "react";
import { Users, ShieldCheck, RefreshCw } from "lucide-react";
import { CustomerTable } from "./CustomerTable";
import { Metric } from "../../components/ui/Metric";
import { getCustomers, updateCustomerKyc } from "../../api/customers";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export function KycStatusControl() {
  const [customers, setCustomers] = useState([]);
  const [kycFilter, setKycFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);

  const { auth } = useAuth();
  const { setError, setSuccess } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCustomers("ALL", auth);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load customers for KYC");
    } finally {
      setLoading(false);
    }
  }, [auth, setError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleKycAction(customerId, newStatus) {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await updateCustomerKyc(customerId, newStatus, auth);
      setSuccess(`Customer KYC updated to ${newStatus}.`);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to update KYC status");
    } finally {
      setLoading(false);
    }
  }

  const pendingCount = customers.filter(
    (c) => String(c.kycStatus ?? "").toUpperCase() === "PENDING"
  ).length;

  const verifiedCount = customers.filter(
    (c) => String(c.kycStatus ?? "").toUpperCase() === "VERIFIED"
  ).length;

  const visibleCustomers = customers.filter((customer) => {
    const status = String(customer.kycStatus ?? "UNKNOWN").toUpperCase();
    return kycFilter === "ALL" || status === kycFilter;
  });

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>KYC Overview</h2>
          <p>View and manage KYC statuses currently stored for each customer</p>
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

      <div className="metrics-grid kyc-metrics">
        <Metric icon={Users} label="Total Customers" value={customers.length} />
        <Metric icon={ShieldCheck} label="Pending KYC" value={pendingCount} />
        <Metric icon={ShieldCheck} label="Verified KYC" value={verifiedCount} />
      </div>

      <div className="statement-filters">
        <label>
          Filter by KYC status
          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
      </div>

      <CustomerTable
        customers={visibleCustomers}
        showKycActions
        onKycAction={handleKycAction}
        disabled={loading}
      />
      <p className="field-hint kyc-note">
        Manager or Admin approval updates the status in the backend and unlocks account opening.
      </p>
    </section>
  );
}

export default KycStatusControl;
