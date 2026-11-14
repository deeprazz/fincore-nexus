import React, { useState } from "react";
import { ShieldCheck, KeyRound, CheckCircle2 } from "lucide-react";
import ComplianceChecklist from "./ComplianceChecklist";
import AuditIntegrityPanel from "./AuditIntegrityPanel";

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState("pci");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-indigo-600" />
          Regulatory Compliance & Audit Assurance
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          PCI-DSS technical safeguards self-assessment and SHA-256 cryptographic audit chain mathematical verification
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("pci")}
          className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "pci"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>PCI-DSS Compliance Checklist</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center space-x-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "audit"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Cryptographic Audit Verification</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === "pci" ? <ComplianceChecklist /> : <AuditIntegrityPanel />}
    </div>
  );
}
