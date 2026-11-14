import { apiRequest } from "./client";

export async function initiatePayment(payload, idempotencyKey) {
  const headers = {};
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  return apiRequest("/payments", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

export async function getPayments(customerId) {
  const query = customerId ? `?customerId=${encodeURIComponent(customerId)}` : "";
  return apiRequest(`/payments${query}`);
}

export async function getPayment(id) {
  return apiRequest(`/payments/${encodeURIComponent(id)}`);
}

export async function getPaymentByUtr(utr) {
  return apiRequest(`/payments/utr/${encodeURIComponent(utr)}`);
}

export async function addBeneficiary(payload) {
  return apiRequest("/beneficiaries", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getBeneficiaries(customerId) {
  const query = customerId ? `?customerId=${encodeURIComponent(customerId)}` : "";
  return apiRequest(`/beneficiaries${query}`);
}

export async function verifyPennyDrop(id) {
  return apiRequest(`/beneficiaries/${encodeURIComponent(id)}/verify`, {
    method: "POST",
  });
}

export async function deleteBeneficiary(id) {
  return apiRequest(`/beneficiaries/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function getSettlementReport() {
  return apiRequest("/settlement/report");
}

export async function triggerNeftBatch() {
  return apiRequest("/settlement/neft/batch", {
    method: "POST",
  });
}
