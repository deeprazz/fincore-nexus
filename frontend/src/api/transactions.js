import { apiRequest } from "./client";

export function getAccountTransactions(accountId, auth) {
  return apiRequest(`/transactions/account/${accountId}`, {}, auth);
}
