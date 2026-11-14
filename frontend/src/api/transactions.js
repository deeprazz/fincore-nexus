import { apiRequest } from "./client";

export function getAccountTransactions(accountId, auth) {
  return apiRequest(`/accounts/${encodeURIComponent(accountId)}/transactions`, {}, auth);
}
