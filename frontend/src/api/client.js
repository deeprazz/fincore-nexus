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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

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
