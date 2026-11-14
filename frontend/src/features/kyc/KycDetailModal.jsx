import React, { useState } from "react";
import { X, CheckCircle, XCircle, UserCheck, ShieldAlert, FileText, Download, Loader2 } from "lucide-react";
import RiskPanel from "./RiskPanel";
import OcrResultPanel from "./OcrResultPanel";
import FaceMatchPanel from "./FaceMatchPanel";
import { approveKyc, rejectKyc } from "../../api/kyc";

export default function KycDetailModal({ application, onClose, onActionComplete }) {
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState(null);

  if (!application) return null;

  const {
    id,
    customerId,
    fullName,
    dateOfBirth,
    panNumberMasked,
    aadhaarMasked,
    status,
    submittedBy,
    reviewedBy,
    reviewNotes: storedNotes,
    createdAt,
    documents = [],
  } = application;

  const isPending = status === "PENDING_REVIEW";

  const handleApprove = async () => {
    setActionError(null);
    setProcessing(true);
    try {
      await approveKyc(id, reviewNotes || "KYC verified and approved by checker");
      if (onActionComplete) onActionComplete();
      onClose();
    } catch (err) {
      setActionError(err.message || "Approval failed. Maker cannot be checker.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!reviewNotes.trim()) {
      setActionError("Please provide a reason for rejection in review notes.");
      return;
    }
    setActionError(null);
    setProcessing(true);
    try {
      await rejectKyc(id, reviewNotes);
      if (onActionComplete) onActionComplete();
      onClose();
    } catch (err) {
      setActionError(err.message || "Rejection failed. Maker cannot be checker.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white/95 backdrop-blur z-10">
          <div>
            <div className="flex items-center space-x-2">
              <UserCheck className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">{fullName}</h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  status === "APPROVED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : status === "REJECTED"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              KYC ID: <span className="font-mono text-slate-700">{id}</span> | Customer:{" "}
              <span className="font-mono text-slate-700">{customerId}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-xs text-rose-700">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-200/80">
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase">Government PAN</p>
              <p className="text-sm font-bold font-mono text-slate-800">{panNumberMasked}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase">Aadhaar Last 4</p>
              <p className="text-sm font-bold font-mono text-slate-800">{aadhaarMasked}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase">Date of Birth</p>
              <p className="text-sm font-semibold text-slate-800">{dateOfBirth}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase">Submitted By</p>
              <p className="text-sm font-semibold text-slate-800">{submittedBy}</p>
            </div>
          </div>

          {/* Biometrics & OCR Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <OcrResultPanel application={application} />
            <FaceMatchPanel application={application} />
          </div>

          {/* Risk Panel */}
          <RiskPanel application={application} />

          {/* Encrypted Documents List */}
          {documents && documents.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-sm text-slate-800">Encrypted Documents at Rest (AES-256-GCM)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div className="truncate">
                        <p className="font-medium text-slate-800 truncate">{doc.documentType}</p>
                        <p className="text-[10px] text-slate-400">{(doc.fileSize / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <a
                      href={`/api/kyc/documents/${doc.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                      title="Download Decrypted Document"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Maker-Checker Review Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-slate-800">Maker-Checker Authorization</h3>
              <span className="text-xs text-slate-500">
                Created: {new Date(createdAt).toLocaleString()}
              </span>
            </div>

            {isPending ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Compliance Rule:</span> Dual control requires review by a Manager or Administrator. The maker who submitted this record ({submittedBy}) cannot approve their own application.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Review / Audit Notes
                  </label>
                  <textarea
                    rows={2}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Enter compliance verification remarks or reason for decision..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={processing}
                    className="inline-flex items-center px-4 py-2 border border-rose-300 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4 mr-1.5 text-rose-600" /> Reject Application
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={processing}
                    className="inline-flex items-center px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                    )}
                    Approve KYC (Unlock Banking)
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-slate-700">
                  <span className="font-semibold">Checker:</span>
                  <span>{reviewedBy || "Automated Review"}</span>
                </div>
                {storedNotes && (
                  <div className="flex items-start space-x-2 text-slate-700">
                    <span className="font-semibold">Notes:</span>
                    <span className="text-slate-600">{storedNotes}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
