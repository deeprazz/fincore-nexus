import { apiRequest } from "./client";

export function getAuditLogs(auth) {
  return apiRequest("/audit", {}, auth);
}

export function verifyAuditChain(auth) {
  return apiRequest("/audit/verify", {}, auth);
}
