import { API_BASE_URL } from "../utils/constants";

let latencyListener = null;

export function setLatencyListener(listener) {
  latencyListener = listener;
}

export async function apiRequestWithResponse(path, options = {}, auth = null) {
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const token = auth?.token;
  const username = auth?.username;
  const password = auth?.password;

  const authHeader = token
    ? { Authorization: `Bearer ${token}` }
    : username && password
    ? { Authorization: `Basic ${btoa(`${username}:${password}`)}` }
    : {};

  const headers = {
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...authHeader,
    ...options.headers,
  };

  let url;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    url = path;
  } else {
    // Normalize path to always begin with /api
    const normalizedPath = path.startsWith("/api")
      ? path
      : `/api${path.startsWith("/") ? "" : "/"}${path}`;

    if (API_BASE_URL && API_BASE_URL.includes(":8080")) {
      // Single Unified API Gateway (Port 8080)
      url = `${API_BASE_URL.replace(/\/api\/?$/, "")}${normalizedPath}`;
    } else if (normalizedPath.startsWith("/api/loans")) {
      const loansHost =
        import.meta.env.VITE_LOANS_API_URL ||
        (API_BASE_URL && API_BASE_URL.includes(":8081")
          ? API_BASE_URL.replace(/\/api\/?$/, "").replace(":8081", ":8082")
          : "");
      url = loansHost ? `${loansHost}${normalizedPath}` : normalizedPath;
    } else if (
      normalizedPath.startsWith("/api/payments") ||
      normalizedPath.startsWith("/api/beneficiaries") ||
      normalizedPath.startsWith("/api/settlement")
    ) {
      const paymentsHost =
        import.meta.env.VITE_PAYMENTS_API_URL ||
        (API_BASE_URL && API_BASE_URL.includes(":8081")
          ? API_BASE_URL.replace(/\/api\/?$/, "").replace(":8081", ":8083")
          : "");
      url = paymentsHost ? `${paymentsHost}${normalizedPath}` : normalizedPath;
    } else if (
      normalizedPath.startsWith("/api/kyc") ||
      normalizedPath.startsWith("/api/compliance")
    ) {
      const kycHost =
        import.meta.env.VITE_KYC_API_URL ||
        (API_BASE_URL && API_BASE_URL.includes(":8081")
          ? API_BASE_URL.replace(/\/api\/?$/, "").replace(":8081", ":8084")
          : "");
      url = kycHost ? `${kycHost}${normalizedPath}` : normalizedPath;
    } else if (normalizedPath.startsWith("/api/notifications")) {
      const notificationHost =
        import.meta.env.VITE_NOTIFICATIONS_API_URL ||
        (API_BASE_URL && API_BASE_URL.includes(":8081")
          ? API_BASE_URL.replace(/\/api\/?$/, "").replace(":8081", ":8085")
          : "");
      url = notificationHost ? `${notificationHost}${normalizedPath}` : normalizedPath;
    } else {
      url = `${API_BASE_URL.replace(/\/api\/?$/, "")}${normalizedPath}`;
    }
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes("failed to fetch")) {
      const serviceName = path.startsWith("/api/loans")
        ? "Loan Management Service (Port 8082)"
        : path.startsWith("/api/payments") || path.startsWith("/api/beneficiaries") || path.startsWith("/api/settlement")
        ? "Payment Orchestration Service (Port 8083)"
        : path.startsWith("/api/kyc") || path.startsWith("/api/compliance")
        ? "KYC & Compliance Service (Port 8084)"
        : path.startsWith("/api/notifications")
        ? "Notification Service (Port 8085)"
        : "Core Banking Service (Port 8081) or API Gateway (Port 8080)";
      throw new Error(`Unable to connect to ${serviceName}. Please verify the service is running.`, { cause: err });
    }
    throw err;
  }

  const duration = Math.round(
    (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt
  );
  if (latencyListener) {
    latencyListener(duration);
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    if (data && typeof data === "object") {
      message = data.message || data.error || data.detail || message;
    } else if (typeof data === "string" && data.trim()) {
      message = data;
    }
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return { data, response, headers: response.headers, latency: duration };
}

export async function apiRequest(path, options = {}, auth = null) {
  const res = await apiRequestWithResponse(path, options, auth);
  return res.data;
}

export default apiRequest;
