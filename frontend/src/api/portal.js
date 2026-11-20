import { apiRequest, apiRequestWithResponse } from "./client";

export function registerCustomer(nameOrData, email, password, phoneNumber, aadhaarNumber, panNumber) {
  let body;
  if (typeof nameOrData === "object" && nameOrData !== null) {
    body = JSON.stringify(nameOrData);
  } else {
    body = JSON.stringify({
      name: nameOrData,
      email,
      password,
      phoneNumber,
      aadhaarNumber,
      panNumber,
    });
  }
  return apiRequest("/auth/register", {
    method: "POST",
    body,
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

export function getPortalStatement(accountIdOrFrom, fromOrTo, toOrAuth, maybeAuth) {
  let accountId = null;
  let from = "";
  let to = "";
  let auth = null;

  if (arguments.length >= 4) {
    accountId = accountIdOrFrom;
    from = fromOrTo;
    to = toOrAuth;
    auth = maybeAuth;
  } else if (arguments.length === 3) {
    if (typeof toOrAuth === "object" && toOrAuth !== null) {
      from = accountIdOrFrom;
      to = fromOrTo;
      auth = toOrAuth;
    } else {
      accountId = accountIdOrFrom;
      from = fromOrTo;
      to = toOrAuth;
    }
  } else if (arguments.length === 2) {
    from = accountIdOrFrom;
    to = fromOrTo;
  } else if (arguments.length === 1) {
    from = accountIdOrFrom;
  }

  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (accountId) params.set("accountId", accountId);
  const q = params.toString();

  const path = accountId
    ? `/customer-portal/accounts/${encodeURIComponent(accountId)}/statement${q ? `?${q}` : ""}`
    : `/customer-portal/statement${q ? `?${q}` : ""}`;

  return apiRequest(path, {}, auth);
}

export async function exportPortalStatementCsv(accountId, from, to, auth) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (accountId) params.set("accountId", accountId);
  const q = params.toString();

  const path = accountId
    ? `/customer-portal/accounts/${encodeURIComponent(accountId)}/statement/export${q ? `?${q}` : ""}`
    : `/customer-portal/statement/export${q ? `?${q}` : ""}`;

  const res = await apiRequestWithResponse(
    path,
    { headers: { Accept: "text/csv" } },
    auth
  );
  return res.data;
}
