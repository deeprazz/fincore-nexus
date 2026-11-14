import { apiRequest } from "./client";

export function getAuditLogs(auth) {
  return apiRequest("/audit", {}, auth);
}

export function verifyAuditChain(auth) {
  return apiRequest("/audit/verify", {}, auth);
}

export function getAuditLogsForEntity(entityId, auth) {
  return apiRequest(`/audit/entity/${encodeURIComponent(entityId)}`, {}, auth);
}
