import { apiRequest } from "./client";

export function getApprovals(auth, all = false) {
  return apiRequest(`/api/approvals?all=${all}`, {}, auth);
}

export function getApproval(id, auth) {
  return apiRequest(`/api/approvals/${encodeURIComponent(id)}`, {}, auth);
}

export function approveOperation(id, auth) {
  return apiRequest(
    `/api/approvals/${encodeURIComponent(id)}/approve`,
    {
      method: "POST",
    },
    auth
  );
}

export function rejectOperation(id, reason, auth) {
  return apiRequest(
    `/api/approvals/${encodeURIComponent(id)}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
    auth
  );
}
