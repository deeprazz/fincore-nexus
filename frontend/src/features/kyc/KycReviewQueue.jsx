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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto">
          {[
            { id: "PENDING_REVIEW", label: "Review Queue", icon: Clock },
            { id: "ALL", label: "All Records", icon: UserCheck },
            { id: "APPROVED", label: "Approved", icon: CheckCircle2 },
            { id: "REJECTED", label: "Rejected", icon: XCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  filter === tab.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search applicant or PAN..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          {onNewApplication && (
            <button
              onClick={onNewApplication}
              className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 whitespace-nowrap shrink-0 shadow-sm"
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
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Applicant Name</th>
                <th className="px-4 py-3">Government PAN</th>
                <th className="px-4 py-3">Aadhaar (Last 4)</th>
                <th className="px-4 py-3">OCR Status</th>
                <th className="px-4 py-3">Biometrics</th>
                <th className="px-4 py-3">Risk Level</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <div>{app.fullName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-slate-700">
                    {app.panNumberMasked}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {app.aadhaarMasked}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {app.ocrStatus} ({Number(app.ocrConfidence).toFixed(0)}%)
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {app.faceMatchStatus} ({Number(app.faceMatchConfidence).toFixed(0)}%)
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge level={app.riskLevel} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        app.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : app.status === "REJECTED"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {app.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedApp(app)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
