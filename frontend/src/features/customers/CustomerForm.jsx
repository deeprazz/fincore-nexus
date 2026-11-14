import React, { useState } from "react";
import { UserPlus } from "lucide-react";
import { createCustomer } from "../../api/customers";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export function CustomerForm({ onCustomerCreated }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const { auth } = useAuth();
  const { setError, setSuccess } = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await createCustomer(name, email, auth);
      setName("");
      setEmail("");
      setSuccess("Customer profile created successfully.");
      if (onCustomerCreated) onCustomerCreated();
    } catch (err) {
      setError(err.message || "Failed to create customer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Register Customer</h2>
          <p>Create a customer profile in the Customer Service</p>
        </div>
        <span className="live-badge">
          <span /> CUSTOMER API
        </span>
      </div>

      <form className="operation-form customer-form" onSubmit={handleSubmit}>
        <label>
          Full name
          <input
            type="text"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter customer's full name"
            required
            disabled={loading}
          />
        </label>
        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@example.com"
            required
            disabled={loading}
          />
        </label>
        <button className="primary-button" type="submit" disabled={loading}>
          <UserPlus size={16} />
          {loading ? "Registering…" : "Register Customer"}
        </button>
      </form>
    </section>
  );
}

export default CustomerForm;
