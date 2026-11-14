import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { CustomerForm } from "./CustomerForm";
import { CustomerTable } from "./CustomerTable";
import { getCustomers } from "../../api/customers";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const { auth } = useAuth();
  const { setError } = useToast();

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

  return (
    <>
      <CustomerForm onCustomerCreated={loadData} />

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Customer Directory</h2>
            <p>{customers.length} customer record(s) returned by the backend</p>
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
        <CustomerTable customers={customers} />
      </section>
    </>
  );
}

export default CustomerList;
