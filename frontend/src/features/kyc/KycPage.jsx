import React, { useState, useEffect } from "react";
import { UserCheck, ShieldCheck, Clock, CheckCircle2, PlusCircle, RefreshCw } from "lucide-react";
import { getKycApplications } from "../../api/kyc";
import KycReviewQueue from "./KycReviewQueue";
import KycWizard from "./KycWizard";
import Card from "../../components/ui/Card";

export default function KycPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const data = await getKycApplications();
      setApplications(data || []);
    } catch (err) {
      console.error("Failed to load KYC applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const total = applications.length;
  const pending = applications.filter((a) => a.status === "PENDING_REVIEW").length;
  const approved = applications.filter((a) => a.status === "APPROVED").length;
  const avgRisk = total > 0
    ? (applications.reduce((acc, a) => acc + Number(a.riskScore || 0), 0) / total).toFixed(2)
    : "0.00";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-indigo-600" />
            KYC & Identity Verification Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated onboarding, neural OCR, biometric liveness, PEP/sanctions screening & dual Maker-Checker authorization
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchApplications}
            disabled={loading}
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setShowWizard(!showWizard)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            {showWizard ? (
              "View Applications"
            ) : (
              <>
                <PlusCircle className="w-4 h-4 mr-1.5" /> Onboard Customer
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Onboarded</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{total}</h3>
            </div>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending Review</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{pending}</h3>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Approved KYC</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{approved}</h3>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Average Risk Score</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{avgRisk}</h3>
            </div>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

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
