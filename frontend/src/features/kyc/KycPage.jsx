import React, { useState, useEffect, useCallback } from "react";
import { UserCheck, ShieldCheck, Clock, CheckCircle2, PlusCircle, RefreshCw, ShieldAlert } from "lucide-react";
import { getKycApplications } from "../../api/kyc";
import { getCustomers, updateCustomerKyc } from "../../api/customers";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import KycReviewQueue from "./KycReviewQueue";
import KycWizard from "./KycWizard";
import Card from "../../components/ui/Card";

export default function KycPage() {
  const [applications, setApplications] = useState([]);
  const [coreCustomers, setCoreCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  const { auth } = useAuth();
  const { setError, setSuccess } = useToast();
  const isManagerOrAdmin = auth?.role === "MANAGER" || auth?.role === "ADMIN";

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const [kycRes, customersRes] = await Promise.allSettled([
        getKycApplications(),
        getCustomers("ALL", auth),
      ]);
      setApplications(kycRes.status === "fulfilled" && Array.isArray(kycRes.value) ? kycRes.value : []);
      setCoreCustomers(customersRes.status === "fulfilled" && Array.isArray(customersRes.value) ? customersRes.value : []);
    } catch (err) {
      console.error("Failed to load KYC applications:", err);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleVerifyCoreCustomer = async (customerId, newStatus) => {
    try {
      setLoading(true);
      await updateCustomerKyc(customerId, newStatus, auth);
      setSuccess(`Customer KYC updated to ${newStatus}. Account opening is now unlocked.`);
      await fetchApplications();
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

  const pendingCoreCustomers = coreCustomers.filter(
    (c) => String(c.kycStatus ?? "").toUpperCase() === "PENDING"
  );

  const total = applications.length + coreCustomers.length;
  const pending = applications.filter((a) => a.status === "PENDING_REVIEW").length + pendingCoreCustomers.length;
  const approved = applications.filter((a) => a.status === "APPROVED").length + coreCustomers.filter((c) => c.kycStatus === "VERIFIED").length;
  const avgRisk = applications.length > 0
    ? (applications.reduce((acc, a) => acc + Number(a.riskScore || 0), 0) / applications.length).toFixed(2)
    : "0.00";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: "#f8fafc" }}>
            <UserCheck className="w-7 h-7 text-indigo-400" />
            KYC & Identity Verification Hub
          </h1>
          <p className="text-xs text-muted mt-1">
            Automated onboarding, neural OCR, biometric liveness, PEP/sanctions screening & dual Maker-Checker authorization
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={fetchApplications}
            disabled={loading}
            className="secondary-button"
            title="Refresh records"
            type="button"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={() => setShowWizard(!showWizard)}
            className="primary-button"
            type="button"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            {showWizard ? (
              "View Applications"
            ) : (
              <>
                <PlusCircle size={15} /> Onboard Customer
              </>
            )}
          </button>
        </div>
      </div>

      {/* Maker-Checker Role Alert Banner */}
      {!isManagerOrAdmin && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 16px",
            background: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: "10px",
            fontSize: "12px",
            color: "#fbbf24",
          }}
        >
          <ShieldAlert size={18} style={{ flexShrink: 0 }} />
          <span>
            <strong>Maker-Checker Governance Notice:</strong> You are signed in as <strong>{auth?.role || "TELLER"}</strong>.
            Tellers register and initiate profiles. To <strong>approve KYC verification</strong> and unlock banking/account opening, sign in as <strong>Manager</strong> (<code>manager</code> / <code>Manager@123</code>).
          </span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Total Onboarded</p>
              <h3 className="text-2xl font-bold mt-1" style={{ color: "#f8fafc" }}>{total}</h3>
            </div>
            <div className="p-2 rounded-lg" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}>
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Pending Review</p>
              <h3 className="text-2xl font-bold mt-1" style={{ color: "#fbbf24" }}>{pending}</h3>
            </div>
            <div className="p-2 rounded-lg" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24" }}>
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Approved KYC</p>
              <h3 className="text-2xl font-bold mt-1" style={{ color: "#34d399" }}>{approved}</h3>
            </div>
            <div className="p-2 rounded-lg" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Average Risk Score</p>
              <h3 className="text-2xl font-bold mt-1" style={{ color: "#f8fafc" }}>{avgRisk}</h3>
            </div>
            <div className="p-2 rounded-lg" style={{ background: "rgba(148, 163, 184, 0.15)", color: "#94a3b8" }}>
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Registered Core Customers Awaiting Verification */}
      {pendingCoreCustomers.length > 0 && (
        <div className="panel" style={{ border: "1px solid #1f293d", background: "#111827", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ margin: 0, color: "#f8fafc", fontSize: "16px", fontWeight: 700 }}>
                Portal Registered Customers Awaiting KYC Verification ({pendingCoreCustomers.length})
              </h3>
              <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "12px" }}>
                Customers registered via the self-service banking portal requiring Maker-Checker authorization to unlock account opening.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {pendingCoreCustomers.map((cust) => (
              <div
                key={cust.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  background: "#0c121b",
                  border: "1px solid #28374d",
                  borderRadius: "8px",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ color: "#f8fafc", fontWeight: 600, fontSize: "14px" }}>{cust.name}</div>
                  <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>
                    Email: <span style={{ color: "#cbd5e1" }}>{cust.email}</span> &bull; ID: <span style={{ fontFamily: "monospace", color: "#64748b" }}>{cust.id}</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ padding: "3px 9px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                    PENDING KYC
                  </span>

                  {isManagerOrAdmin ? (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => handleVerifyCoreCustomer(cust.id, "VERIFIED")}
                        style={{
                          background: "rgba(16, 185, 129, 0.2)",
                          border: "1px solid rgba(16, 185, 129, 0.4)",
                          color: "#34d399",
                          padding: "6px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <CheckCircle2 size={14} /> Verify KYC
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerifyCoreCustomer(cust.id, "REJECTED")}
                        style={{
                          background: "rgba(239, 68, 68, 0.2)",
                          border: "1px solid rgba(239, 68, 68, 0.4)",
                          color: "#f87171",
                          padding: "6px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: "11px", color: "#fbbf24", fontStyle: "italic" }}>
                      Log in as Manager to verify
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main View: Wizard or Review Queue */}
      {showWizard ? (
        <KycWizard
          onSuccess={() => {
            setShowWizard(false);
            fetchApplications();
          }}
          onCancel={() => setShowWizard(false)}
        />
      ) : (
        <KycReviewQueue
          applications={applications}
          onRefresh={fetchApplications}
          onNewApplication={() => setShowWizard(true)}
        />
      )}
    </div>
  );
}
