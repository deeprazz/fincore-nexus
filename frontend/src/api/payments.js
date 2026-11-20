import { apiRequest } from "./client";

function callApi(path, options, auth) {
  if (auth) {
    return apiRequest(path, options || {}, auth);
  }
  if (options) {
    return apiRequest(path, options);
  }
  return apiRequest(path);
}

export async function initiatePayment(payload, idempotencyKey, auth) {
  const headers = {};
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  return callApi(
    "/payments",
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    },
    auth
  );
}

export async function getPayments(customerId, auth) {
  const query = customerId ? `?customerId=${encodeURIComponent(customerId)}` : "";
  return callApi(`/payments${query}`, null, auth);
}

export async function getPayment(id, auth) {
  return callApi(`/payments/${encodeURIComponent(id)}`, null, auth);
}

export async function getPaymentByUtr(utr, auth) {
  return callApi(`/payments/utr/${encodeURIComponent(utr)}`, null, auth);
}

export async function approvePayment(id, auth) {
  return callApi(`/payments/${encodeURIComponent(id)}/approve`, { method: "POST" }, auth);
}

export async function rejectPayment(id, reason = "Payment rejected during manual review", auth) {
  return callApi(
    `/payments/${encodeURIComponent(id)}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
    auth
  );
}

export async function retryCompensation(id, auth) {
  return callApi(`/payments/${encodeURIComponent(id)}/retry-compensation`, { method: "POST" }, auth);
}

export async function addBeneficiary(payload, auth) {
  return callApi(
    "/beneficiaries",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    auth
  );
}

export async function getBeneficiaries(customerId, auth) {
  const query = customerId ? `?customerId=${encodeURIComponent(customerId)}` : "";
  return callApi(`/beneficiaries${query}`, null, auth);
}

export async function verifyPennyDrop(id, auth) {
  return callApi(`/beneficiaries/${encodeURIComponent(id)}/verify`, { method: "POST" }, auth);
}

export async function deleteBeneficiary(id, auth) {
  return callApi(`/beneficiaries/${encodeURIComponent(id)}`, { method: "DELETE" }, auth);
}

export async function getSettlementReport(auth) {
  return callApi("/settlement/report", null, auth);
}

export async function getReconciliationReport(auth) {
  return callApi("/settlement/reconciliation", null, auth);
}

export async function triggerNeftBatch(auth) {
  return callApi("/settlement/neft/batch", { method: "POST" }, auth);
}
