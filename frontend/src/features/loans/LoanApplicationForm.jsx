import React, { useState, useEffect } from "react";
import { submitApplication } from "../../api/loans";
import { getCustomers } from "../../api/customers";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { CreditAssessmentCard } from "./CreditAssessmentCard";
import { Send, CheckCircle2, RotateCcw } from "lucide-react";

export function LoanApplicationForm({ onApplicationSubmitted, customers: initialCustomers }) {
  const { auth } = useAuth();
  const { setError, setSuccess } = useToast();

  const [customers, setCustomers] = useState(initialCustomers || []);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [formData, setFormData] = useState({
    customerId: "",
    requestedAmount: "50000",
    tenureMonths: "24",
    annualIncome: "600000",
    employmentType: "SALARIED",
    purpose: "Personal Loan",
    existingObligations: "0",
  });

  const [submitting, setSubmitting] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [createdApplication, setCreatedApplication] = useState(null);

  useEffect(() => {
    if (!initialCustomers || initialCustomers.length === 0) {
      setLoadingCustomers(true);
      getCustomers("ALL", auth)
        .then((res) => {
          const list = Array.isArray(res) ? res : [];
          setCustomers(list);
          if (list.length > 0) {
            setFormData((prev) => (prev.customerId ? prev : { ...prev, customerId: list[0].id }));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingCustomers(false));
    } else if (initialCustomers.length > 0) {
      setFormData((prev) => (prev.customerId ? prev : { ...prev, customerId: initialCustomers[0].id }));
    }
  }, [auth, initialCustomers]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerId) {
      setError("Please select or enter a Customer ID");
      return;
    }

    setSubmitting(true);
    setAssessmentResult(null);

    try {
      const payload = {
        customerId: formData.customerId,
        requestedAmount: Number(formData.requestedAmount),
        tenureMonths: parseInt(formData.tenureMonths, 10),
        annualIncome: Number(formData.annualIncome),
        employmentType: formData.employmentType,
        purpose: formData.purpose,
        existingObligations: Number(formData.existingObligations || 0),
      };

      const result = await submitApplication(payload, auth);
      setCreatedApplication(result);

      // Determine score & rate from result
      const score = result.creditScore || 650;
      let decision = result.status || (score >= 700 ? "APPROVED" : score >= 600 ? "MANUAL_REVIEW" : "REJECTED");
      let rate = score >= 800 ? 0.08 : score >= 700 ? 0.10 : score >= 600 ? 0.14 : 0.0;
      let reason = result.rejectionReason || (score >= 700 ? "Credit score meets approval threshold" : score >= 600 ? "Requires manual review" : "Score below threshold");

      setAssessmentResult({
        score,
        decision,
        rate,
        reason,
      });

      setSuccess("Loan application submitted successfully!");
      if (onApplicationSubmitted) {
        onApplicationSubmitted(result);
      }
    } catch (err) {
      setError(err.message || "Failed to submit loan application");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setAssessmentResult(null);
    setCreatedApplication(null);
    setFormData({
      customerId: customers[0]?.id || "",
      requestedAmount: "50000",
      tenureMonths: "24",
      annualIncome: "600000",
      employmentType: "SALARIED",
      purpose: "Personal Loan",
      existingObligations: "0",
    });
  };

  return (
    <div className="panel loan-application-panel">
      <div className="panel-heading">
        <div>
          <h2>Apply for a New Loan</h2>
          <p>Submit credit application with real-time risk assessment</p>
        </div>
        {assessmentResult && (
          <button
            type="button"
            className="secondary-button"
            onClick={handleReset}
          >
            <RotateCcw size={14} /> New Application
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-field full-width">
          <label htmlFor="customerId">Customer</label>
          {customers.length > 0 ? (
            <select
              id="customerId"
              name="customerId"
              value={formData.customerId}
              onChange={handleChange}
              required
              disabled={submitting || !!assessmentResult}
            >
              <option value="">-- Select Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.email} (Cust #{c.id.substring(0, 8).toUpperCase()})
                </option>
              ))}
            </select>
          ) : (
            <input
              id="customerId"
              name="customerId"
              type="text"
              placeholder="Enter customer reference or email"
              value={formData.customerId}
              onChange={handleChange}
              required
              disabled={submitting || !!assessmentResult}
            />
          )}
          {loadingCustomers && <span className="field-help">Loading customers list...</span>}
        </div>

        <div className="form-field">
          <label htmlFor="requestedAmount">Requested Amount (₹)</label>
          <input
            id="requestedAmount"
            name="requestedAmount"
            type="number"
            min="1000"
            step="1000"
            value={formData.requestedAmount}
            onChange={handleChange}
            required
            disabled={submitting || !!assessmentResult}
          />
        </div>

        <div className="form-field">
          <label htmlFor="tenureMonths">Tenure (Months)</label>
          <select
            id="tenureMonths"
            name="tenureMonths"
            value={formData.tenureMonths}
            onChange={handleChange}
            required
            disabled={submitting || !!assessmentResult}
          >
            <option value="6">6 Months</option>
            <option value="12">12 Months (1 Year)</option>
            <option value="24">24 Months (2 Years)</option>
            <option value="36">36 Months (3 Years)</option>
            <option value="48">48 Months (4 Years)</option>
            <option value="60">60 Months (5 Years)</option>
            <option value="120">120 Months (10 Years)</option>
            <option value="240">240 Months (20 Years)</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="annualIncome">Annual Income (₹)</label>
          <input
            id="annualIncome"
            name="annualIncome"
            type="number"
            min="10000"
            step="10000"
            value={formData.annualIncome}
            onChange={handleChange}
            required
            disabled={submitting || !!assessmentResult}
          />
        </div>

        <div className="form-field">
          <label htmlFor="employmentType">Employment Type</label>
          <select
            id="employmentType"
            name="employmentType"
            value={formData.employmentType}
            onChange={handleChange}
            required
            disabled={submitting || !!assessmentResult}
          >
            <option value="SALARIED">Salaried Employee</option>
            <option value="SELF_EMPLOYED">Self Employed Professional</option>
            <option value="BUSINESS">Business Owner</option>
            <option value="RETIRED">Retired / Pensioner</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="existingObligations">Existing Monthly Obligations (₹)</label>
          <input
            id="existingObligations"
            name="existingObligations"
            type="number"
            min="0"
            step="1000"
            value={formData.existingObligations}
            onChange={handleChange}
            disabled={submitting || !!assessmentResult}
          />
        </div>

        <div className="form-field">
          <label htmlFor="purpose">Loan Purpose</label>
          <input
            id="purpose"
            name="purpose"
            type="text"
            value={formData.purpose}
            onChange={handleChange}
            placeholder="e.g. Home Renovation, Education, Vehicle"
            disabled={submitting || !!assessmentResult}
          />
        </div>

        {!assessmentResult && (
          <div className="form-actions full-width">
            <button
              type="submit"
              className="primary-button"
              disabled={submitting}
            >
              <Send size={16} />
              {submitting ? "Assessing Credit..." : "Submit Application & Assess"}
            </button>
          </div>
        )}
      </form>

      {assessmentResult && (
        <div className="assessment-feedback-wrap">
          <div className="feedback-badge-line">
            <CheckCircle2 size={18} className="text-success" />
            <span>Application #{createdApplication?.id ? String(createdApplication.id).substring(0, 8) : ""} Evaluated</span>
          </div>
          <CreditAssessmentCard
            score={assessmentResult.score}
            decision={assessmentResult.decision}
            reason={assessmentResult.reason}
            rate={assessmentResult.rate}
          />
        </div>
      )}
    </div>
  );
}

export default LoanApplicationForm;
