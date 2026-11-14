import { apiRequest, apiRequestWithResponse } from "./client";

export function getAccounts(auth) {
  return apiRequest("/accounts", {}, auth);
}

export async function getAccountDetail(accountId, auth) {
  const res = await apiRequestWithResponse(
    `/accounts/${encodeURIComponent(accountId)}`,
    {},
    auth
  );
  return {
    ...res.data,
    cacheStatus: res.headers.get("x-cache") || res.headers.get("X-Cache") || "MISS",
    latency: res.latency,
  };
}

export function createAccount(customerId, initialBalance, auth) {
  return apiRequest(
    "/accounts",
    {
      method: "POST",
      body: JSON.stringify({
        customerId,
        initialBalance: Number(initialBalance),
      }),
    },
    auth
  );
}

export function deposit(accountId, amount, auth) {
  return apiRequest(
    `/accounts/${encodeURIComponent(accountId)}/deposit`,
    {
      method: "POST",
      body: JSON.stringify({ amount: Number(amount) }),
    },
    auth
  );
}

export function withdraw(accountId, amount, auth) {
  return apiRequest(
    `/accounts/${encodeURIComponent(accountId)}/withdraw`,
    {
      method: "POST",
      body: JSON.stringify({ amount: Number(amount) }),
    },
    auth
  );
}

export function transfer(fromAccountId, toAccountId, amount, auth) {
  return apiRequest(
    "/accounts/transfer",
    {
      method: "POST",
      body: JSON.stringify({
        fromAccountId,
        toAccountId,
        amount: Number(amount),
      }),
    },
    auth
  );
}

export function freezeAccount(accountId, auth) {
  return apiRequest(
    `/accounts/${encodeURIComponent(accountId)}/freeze`,
    { method: "POST" },
    auth
  );
}

export function unfreezeAccount(accountId, auth) {
  return apiRequest(
    `/accounts/${encodeURIComponent(accountId)}/unfreeze`,
    { method: "POST" },
    auth
  );
}

export function closeAccount(accountId, auth) {
  return apiRequest(
    `/accounts/${encodeURIComponent(accountId)}/close`,
    { method: "POST" },
    auth
  );
}

export function getAccountStatement(accountId, from, to, auth) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const q = params.toString();
  return apiRequest(
    `/accounts/${encodeURIComponent(accountId)}/statement${q ? `?${q}` : ""}`,
    {},
    auth
  );
}

export async function exportStatementCsv(accountId, from, to, auth) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const q = params.toString();
  const res = await apiRequestWithResponse(
    `/accounts/${encodeURIComponent(accountId)}/statement/export${q ? `?${q}` : ""}`,
    {
      headers: { Accept: "text/csv" },
    },
    auth
  );
  return res.data;
}
