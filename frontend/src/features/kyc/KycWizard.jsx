import React, { useState } from "react";
import { UserCheck, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import DocumentUpload from "./DocumentUpload";
import WebcamCapture from "./WebcamCapture";
import { onboardKyc } from "../../api/kyc";

export default function KycWizard({ onSuccess, onCancel }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    customerId: "a0000000-0000-0000-0000-000000000001",
    fullName: "Aarav Sharma",
    dateOfBirth: "1992-05-15",
    panNumber: "ABCDE1234F",
    aadhaarNumber: "987654321013", // 12-digit test aadhaar
    livenessChallenge: "EYE_BLINK",
  });

  const [panFile, setPanFile] = useState(null);
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep1 = () => {
    if (!formData.customerId.trim()) return "Customer ID is required";
    if (!formData.fullName.trim()) return "Full name is required";
    if (!formData.dateOfBirth) return "Date of birth is required";
    if (!formData.panNumber.trim() || formData.panNumber.length !== 10) {
      return "PAN must be 10 characters (e.g., ABCDE1234F)";
    }
    const cleanAadhaar = formData.aadhaarNumber.replace(/[\s-]/g, "");
    if (cleanAadhaar.length !== 12) {
      return "Aadhaar number must be 12 digits";
    }
    return null;
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        setError(err);
        return;
      }
    }
    setStep((prev) => prev + 1);
  };

  const handlePrev = () => {
    setError(null);
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const data = new FormData();
      data.append("customerId", formData.customerId);
      data.append("fullName", formData.fullName);
      data.append("dateOfBirth", formData.dateOfBirth);
      data.append("panNumber", formData.panNumber.toUpperCase());
      data.append("aadhaarNumber", formData.aadhaarNumber.replace(/[\s-]/g, ""));
      data.append("livenessChallenge", formData.livenessChallenge);

      if (panFile) data.append("panFile", panFile);
      if (aadhaarFile) data.append("aadhaarFile", aadhaarFile);
      if (selfieFile) data.append("selfieFile", selfieFile);

      const res = await onboardKyc(data);
      if (onSuccess) onSuccess(res);
    } catch (err) {
      setError(err.message || "KYC onboarding failed. Please check the identification values.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl mx-auto shadow-sm">
      {/* Stepper Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">New Customer KYC Onboarding</h2>
          <p className="text-xs text-slate-500">Maker submission workflow with biometric verification</p>
        </div>
        <div className="flex items-center space-x-1.5 text-xs font-semibold">
          <span className={`px-2.5 py-1 rounded-full ${step === 1 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>1. Identity</span>
          <span className="text-slate-300">/</span>
          <span className={`px-2.5 py-1 rounded-full ${step === 2 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>2. Documents</span>
          <span className="text-slate-300">/</span>
          <span className={`px-2.5 py-1 rounded-full ${step === 3 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>3. Biometrics</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Identity Information */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Customer UUID</label>
            <input
              type="text"
              name="customerId"
              value={formData.customerId}
              onChange={handleChange}
              placeholder="e.g. a0000000-0000-0000-0000-000000000001"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="As per Government ID"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number</label>
              <input
                type="text"
                name="panNumber"
                maxLength={10}
                value={formData.panNumber}
                onChange={handleChange}
                placeholder="e.g. ABCDE1234F"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">10 alphanumeric characters. Masked in logs & storage.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Aadhaar Number</label>
              <input
                type="text"
                name="aadhaarNumber"
                maxLength={14}
                value={formData.aadhaarNumber}
                onChange={handleChange}
                placeholder="e.g. 9876 5432 1013"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">12-digit number validated with Verhoeff algorithm.</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Document Upload */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Uploaded identification files are automatically encrypted at rest using AES-256-GCM.
          </p>

          <DocumentUpload
            label="Government PAN Card (Front)"
            description="Clear copy of PAN card. Used for neural OCR extraction."
            file={panFile}
            onChange={setPanFile}
          />

          <DocumentUpload
            label="Aadhaar Card (Front / Back)"
            description="Aadhaar identity proof. Only last 4 digits stored; raw card encrypted."
            file={aadhaarFile}
            onChange={setAadhaarFile}
          />
        </div>
      )}

      {/* Step 3: Biometrics & Liveness */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="mb-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Liveness Challenge Protocol</label>
            <select
              name="livenessChallenge"
              value={formData.livenessChallenge}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="EYE_BLINK">Blink Twice Challenge (Optical Micro-movement)</option>
              <option value="HEAD_TURN">Head Rotation Challenge (3D Angular Landmark)</option>
            </select>
          </div>

          <WebcamCapture
            challenge={formData.livenessChallenge}
            onCapture={setSelfieFile}
          />
        </div>
      )}

      {/* Form Navigation Actions */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-5 mt-6">
        {step > 1 ? (
          <button
            type="button"
            onClick={handlePrev}
            className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
        )}

        {step < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm"
          >
            Continue <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-sm disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Verifying & Onboarding...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Submit KYC Application
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
