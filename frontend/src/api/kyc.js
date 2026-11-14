import { apiRequest } from "./client";

export async function onboardKyc(formData) {
  return apiRequest("/kyc/onboard", {
    method: "POST",
    body: formData,
  });
}

export async function approveKyc(id, notes) {
  return apiRequest(`/kyc/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}

export async function rejectKyc(id, notes) {
  return apiRequest(`/kyc/${encodeURIComponent(id)}/reject`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}

export async function getKycApplications() {
  return apiRequest("/kyc");
}

export async function getPendingKycApplications() {
  return apiRequest("/kyc/pending");
}

export async function getKycApplication(id) {
  return apiRequest(`/kyc/${encodeURIComponent(id)}`);
}

export async function getPciDssReport() {
  return apiRequest("/compliance/pci-dss");
}

export async function verifyAuditIntegrity() {
  return apiRequest("/compliance/audit/verify");
}
