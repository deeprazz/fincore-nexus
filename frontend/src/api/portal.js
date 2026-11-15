import { apiRequest, apiRequestWithResponse } from "./client";

export function registerCustomer(name, email, password) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function getPortalOverview(auth) {
  return apiRequest("/customer-portal/overview", {}, auth);
}

export function getPortalTransactions(accountId, auth) {
  return apiRequest(`/customer-portal/transactions?accountId=${encodeURIComponent(accountId)}`, {}, auth);
}

export function setOrChangePortalPin(currentPin, pin, auth) {
  return apiRequest(
    "/customer-portal/pin",
    {
      method: "POST",
      body: JSON.stringify({ currentPin, pin }),
    },
    auth
  );
}

export function portalTransfer(sourceAccountId, destinationAccountNumber, amount, transactionPin, auth) {
  return apiRequest(
    "/customer-portal/transfer",
    {
      method: "POST",
      body: JSON.stringify({
        sourceAccountId,
        destinationAccountNumber,
        amount: Number(amount),
        transactionPin,
      }),
    },
    auth
  );
}

export function getPortalStatement(from, to, auth) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const q = params.toString();
  return apiRequest(`/customer-portal/statement${q ? `?${q}` : ""}`, {}, auth);
}

export async function exportPortalStatementCsv(accountId, from, to, auth) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const q = params.toString();
  const res = await apiRequestWithResponse(
    `/customer-portal/accounts/${encodeURIComponent(accountId)}/statement/export${q ? `?${q}` : ""}`,
    { headers: { Accept: "text/csv" } },
    auth
  );
  return res.data;
}
