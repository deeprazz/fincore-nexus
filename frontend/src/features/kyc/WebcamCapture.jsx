import React, { useState, useRef } from "react";
import { Camera, RefreshCw, Upload, CheckCircle } from "lucide-react";

export default function WebcamCapture({ onCapture, challenge = "EYE_BLINK" }) {
  const [streamActive, setStreamActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [permissionError, setPermissionError] = useState(null);
  const videoRef = useRef(null);

  const startCamera = async () => {
    try {
      setPermissionError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStreamActive(true);
    } catch {
      setPermissionError("Camera access unavailable. You can upload a selfie photo directly.");
      setStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, 640, 480);

    canvas.toBlob((blob) => {
      const file = new File([blob], "live_selfie.jpg", { type: "image/jpeg" });
      setCapturedImage(canvas.toDataURL("image/jpeg"));
      stopCamera();
      if (onCapture) onCapture(file);
    }, "image/jpeg");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedImage(reader.result);
      };
      reader.readAsDataURL(file);
      if (onCapture) onCapture(file);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Live Biometric Selfie & Liveness</h4>
          <p className="text-xs text-slate-500">
            Challenge: <span className="font-semibold text-indigo-600">{challenge === "EYE_BLINK" ? "Look into camera and blink twice" : "Turn head slowly left to right"}</span>
          </p>
        </div>
        {capturedImage && (
          <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Selfie Captured
          </span>
        )}
      </div>

      {capturedImage ? (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border border-slate-300 max-w-xs mx-auto">
            <img src={capturedImage} alt="Captured Selfie" className="w-full h-48 object-cover" />
          </div>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={retake}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retake Selfie
            </button>
          </div>
        </div>
      ) : streamActive ? (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-black max-w-xs mx-auto">
            <video ref={videoRef} className="w-full h-48 object-cover mirror" playsInline muted />
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[11px] text-white">
              Live Feed
            </div>
          </div>
          <div className="flex justify-center space-x-2">
            <button
              type="button"
              onClick={takeSnapshot}
              className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm"
            >
              <Camera className="w-4 h-4 mr-1.5" /> Capture Snapshot
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex items-center px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg text-center space-y-3 bg-white">
          <div className="flex justify-center space-x-3">
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <Camera className="w-4 h-4 mr-1.5" /> Open Webcam
            </button>
            <label className="inline-flex items-center px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer">
              <Upload className="w-4 h-4 mr-1.5" /> Upload Photo
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
          {permissionError && (
            <p className="text-xs text-amber-600 max-w-sm mx-auto">{permissionError}</p>
          )}
        </div>
      )}
    </div>
  );
}
