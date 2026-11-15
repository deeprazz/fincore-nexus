import { apiRequest } from "./client";

export async function onboardKyc(formData, auth = null) {
  const opts = {
    method: "POST",
    body: formData,
  };
  return auth ? apiRequest("/kyc/onboard", opts, auth) : apiRequest("/kyc/onboard", opts);
}

export async function approveKyc(id, notes, auth = null) {
  const opts = {
    method: "POST",
    body: JSON.stringify({ notes }),
  };
  return auth ? apiRequest(`/kyc/${encodeURIComponent(id)}/approve`, opts, auth) : apiRequest(`/kyc/${encodeURIComponent(id)}/approve`, opts);
}

export async function rejectKyc(id, notes, auth = null) {
  const opts = {
    method: "POST",
    body: JSON.stringify({ notes }),
  };
  return auth ? apiRequest(`/kyc/${encodeURIComponent(id)}/reject`, opts, auth) : apiRequest(`/kyc/${encodeURIComponent(id)}/reject`, opts);
}

export async function getKycApplications(auth = null) {
  return auth ? apiRequest("/kyc", {}, auth) : apiRequest("/kyc");
}

export async function getPendingKycApplications(auth = null) {
  return auth ? apiRequest("/kyc/pending", {}, auth) : apiRequest("/kyc/pending");
}

export async function getKycApplication(id, auth = null) {
  return auth ? apiRequest(`/kyc/${encodeURIComponent(id)}`, {}, auth) : apiRequest(`/kyc/${encodeURIComponent(id)}`);
}

export async function getPciDssReport(auth = null) {
  return auth ? apiRequest("/compliance/pci-dss", {}, auth) : apiRequest("/compliance/pci-dss");
}

export async function verifyAuditIntegrity(auth = null) {
  return auth ? apiRequest("/compliance/audit/verify", {}, auth) : apiRequest("/compliance/audit/verify");
}
