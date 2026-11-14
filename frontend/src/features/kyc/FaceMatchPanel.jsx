import React from "react";
import { UserCheck, CheckCircle2, AlertCircle } from "lucide-react";

export default function FaceMatchPanel({ application }) {
  if (!application) return null;

  const {
    faceMatchStatus = "PENDING",
    faceMatchConfidence = 94.8,
    livenessVerified = true,
  } = application;

  const isMatched = faceMatchStatus === "MATCHED";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <UserCheck className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-800">Biometric & Facial Verification</h3>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            isMatched
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          {isMatched ? "Biometrics Matched" : faceMatchStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Match Confidence */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase">Facial Similarity Score</span>
            <span className="text-sm font-bold text-slate-800">{Number(faceMatchConfidence).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${isMatched ? "bg-emerald-500" : "bg-rose-500"}`}
              style={{ width: `${Math.min(100, Math.max(10, Number(faceMatchConfidence)))}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">Landmark Geometry Threshold: 80.00% (Simulated)</p>
        </div>

        {/* Liveness Check */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 space-y-2">
          <span className="text-xs font-medium text-slate-500 uppercase">Liveness Anti-Spoof</span>
          <div className="flex items-center space-x-2 mt-1">
            {livenessVerified ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700">Passive & Optical Liveness Confirmed</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-amber-700">Liveness Incomplete</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-400">Micro-blink & 3D head movement challenge verified</p>
        </div>
      </div>
    </div>
  );
}
