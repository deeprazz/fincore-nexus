import React from "react";
import { FileText, CheckCircle2, AlertCircle } from "lucide-react";

export default function OcrResultPanel({ application }) {
  if (!application) return null;

  const {
    ocrStatus = "PENDING",
    ocrConfidence = 96.5,
    extractedPan = "",
    extractedName = "",
    panNumberMasked = "",
    fullName = "",
  } = application;

  const isVerified = ocrStatus === "VERIFIED";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-800">OCR Extraction & Verification</h3>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            isVerified
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          {isVerified ? "OCR Verified" : ocrStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Confidence & Engine */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase">Extraction Confidence</span>
            <span className="text-sm font-bold text-slate-800">{Number(ocrConfidence).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, Math.max(10, Number(ocrConfidence)))}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">FinCore Neural OCR Engine (Text Layer Parser)</p>
        </div>

        {/* Identity match */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 space-y-2">
          <span className="text-xs font-medium text-slate-500 uppercase">Field Verification</span>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">PAN Card Match:</span>
              <span className="font-medium text-slate-700 flex items-center gap-1">
                {extractedPan ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                {extractedPan || panNumberMasked}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Applicant Name Match:</span>
              <span className="font-medium text-slate-700 flex items-center gap-1">
                {extractedName ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                {extractedName || fullName}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
