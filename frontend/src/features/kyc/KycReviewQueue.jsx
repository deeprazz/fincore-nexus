import React, { useState } from "react";
import { UserCheck, Eye, Search, AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { RiskBadge } from "./RiskPanel";
import KycDetailModal from "./KycDetailModal";
import EmptyState from "../../components/ui/EmptyState";

export default function KycReviewQueue({ applications = [], onRefresh, onNewApplication }) {
  const [filter, setFilter] = useState("PENDING_REVIEW");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApp, setSelectedApp] = useState(null);

  const filtered = applications.filter((app) => {
    const matchesFilter = filter === "ALL" || app.status === filter;
    const matchesSearch =
      searchTerm === "" ||
      app.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.panNumberMasked?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.customerId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="kyc-filter-bar">
        <div className="kyc-filter-tabs">
          {[
            { id: "PENDING_REVIEW", label: "Review Queue", icon: Clock },
            { id: "ALL", label: "All Records", icon: UserCheck },
            { id: "APPROVED", label: "Approved", icon: CheckCircle2 },
            { id: "REJECTED", label: "Rejected", icon: XCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`kyc-filter-tab-btn ${active ? "active" : ""}`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ position: "relative", minWidth: "240px" }}>
            <Search
              size={14}
              style={{ position: "absolute", left: "12px", top: "11px", color: "var(--muted, #64748b)" }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search applicant or PAN..."
              className="kyc-search-input"
            />
          </div>
          {onNewApplication && (
            <button
              onClick={onNewApplication}
              className="primary-button"
              type="button"
              style={{ minHeight: "36px", padding: "8px 14px", fontSize: "12px" }}
            >
              + New KYC
            </button>
          )}
        </div>
      </div>

      {/* Applications Table */}
      {filtered.length === 0 ? (
        <EmptyState message={`No ${filter === "ALL" ? "" : filter.toLowerCase()} KYC applications found.`} />
      ) : (
        <div className="panel" style={{ padding: 0, overflow: "hidden", borderRadius: "12px" }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Applicant Name</th>
                  <th>Government PAN</th>
                  <th>Aadhaar (Last 4)</th>
                  <th>OCR Status</th>
                  <th>Biometrics</th>
                  <th>Risk Level</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{app.fullName}</div>
                      <div style={{ fontSize: "11px", color: "var(--muted, #64748b)", fontFamily: "monospace" }}>
                        {new Date(app.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ fontFamily: "monospace", fontWeight: 600 }}>
                      {app.panNumberMasked}
                    </td>
                    <td style={{ fontFamily: "monospace" }}>
                      {app.aadhaarMasked}
                    </td>
                    <td>
                      <span style={{ color: "#3b82f6", background: "rgba(59, 130, 246, 0.12)", border: "1px solid rgba(59, 130, 246, 0.25)", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600 }}>
                        {app.ocrStatus} ({Number(app.ocrConfidence).toFixed(0)}%)
                      </span>
                    </td>
                    <td>
                      <span style={{ color: "#10b981", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.25)", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600 }}>
                        {app.faceMatchStatus} ({Number(app.faceMatchConfidence).toFixed(0)}%)
                      </span>
                    </td>
                    <td>
                      <RiskBadge level={app.riskLevel} />
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 9px",
                          borderRadius: "9999px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: app.status === "APPROVED" ? "rgba(16, 185, 129, 0.12)" : app.status === "REJECTED" ? "rgba(239, 68, 68, 0.12)" : "rgba(245, 158, 11, 0.12)",
                          color: app.status === "APPROVED" ? "#10b981" : app.status === "REJECTED" ? "#ef4444" : "#f59e0b",
                          border: `1px solid ${app.status === "APPROVED" ? "rgba(16, 185, 129, 0.3)" : app.status === "REJECTED" ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                        }}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedApp(app)}
                        className="secondary-button"
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 10px", fontSize: "11px" }}
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedApp && (
        <KycDetailModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onActionComplete={onRefresh}
        />
      )}
    </div>
  );
}
