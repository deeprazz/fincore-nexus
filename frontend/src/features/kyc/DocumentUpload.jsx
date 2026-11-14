import React from "react";
import { Upload, CheckCircle, FileText } from "lucide-react";

export default function DocumentUpload({
  label,
  description,
  file,
  onChange,
  accept = "image/*,application/pdf",
}) {
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && onChange) {
      onChange(selected);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-700">{label}</label>
      <div className="relative border border-dashed border-slate-300 rounded-lg p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
        {file ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 truncate">
              <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="truncate">
                <p className="text-xs font-medium text-slate-800 truncate">{file.name}</p>
                <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <span className="inline-flex items-center text-xs font-semibold text-emerald-600 shrink-0">
              <CheckCircle className="w-4 h-4 mr-1" /> Ready
            </span>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center cursor-pointer py-2">
            <Upload className="w-5 h-5 text-slate-400 mb-1" />
            <p className="text-xs text-slate-600 font-medium">Click to select document</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{description || "JPG, PNG, or PDF up to 5MB"}</p>
            <input type="file" accept={accept} onChange={handleFileChange} className="hidden" />
          </label>
        )}
      </div>
    </div>
  );
}
