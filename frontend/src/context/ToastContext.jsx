import React, { createContext, useContext, useState, useCallback, useRef } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [error, setErrorState] = useState("");
  const [success, setSuccessState] = useState("");
  const errTimerRef = useRef(null);
  const succTimerRef = useRef(null);

  const setError = useCallback((msg) => {
    setErrorState(msg || "");
    if (errTimerRef.current) clearTimeout(errTimerRef.current);
    if (msg) {
      errTimerRef.current = setTimeout(() => {
        setErrorState("");
      }, 5000);
    }
  }, []);

  const setSuccess = useCallback((msg) => {
    setSuccessState(msg || "");
    if (succTimerRef.current) clearTimeout(succTimerRef.current);
    if (msg) {
      succTimerRef.current = setTimeout(() => {
        setSuccessState("");
      }, 5000);
    }
  }, []);

  const clearMessages = useCallback(() => {
    if (errTimerRef.current) clearTimeout(errTimerRef.current);
    if (succTimerRef.current) clearTimeout(succTimerRef.current);
    setErrorState("");
    setSuccessState("");
  }, []);

  return (
    <ToastContext.Provider
      value={{
        error,
        setError,
        success,
        setSuccess,
        clearMessages,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export default ToastContext;
