import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, KeyRound, CheckCircle2, FileText, ArrowRight } from "lucide-react";
import ComplianceChecklist from "./ComplianceChecklist";
import AuditIntegrityPanel from "./AuditIntegrityPanel";

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState("pci");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 page-title">
            <ShieldCheck className="w-7 h-7 text-blue-500" />
            Regulatory Compliance & Audit Assurance
          </h1>
          <p className="text-xs text-muted mt-1 page-subtitle">
            PCI-DSS technical safeguards self-assessment and SHA-256 cryptographic audit chain mathematical verification
          </p>
        </div>

        <Link
          to="/audit"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg secondary-button"
        >
          <FileText size={14} /> Full Audit Trail <ArrowRight size={13} />
        </Link>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs-container">
        <button
          onClick={() => setActiveTab("pci")}
          className={`tab-btn ${activeTab === "pci" ? "active" : ""}`}
        >
          <CheckCircle2 size={14} />
          <span>PCI-DSS Compliance Checklist</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`tab-btn ${activeTab === "audit" ? "active" : ""}`}
        >
          <KeyRound size={14} />
          <span>Cryptographic Audit Verification</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === "pci" ? <ComplianceChecklist /> : <AuditIntegrityPanel />}
    </div>
  );
}
