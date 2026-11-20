import { apiRequest } from "./client";

export function getLoans(auth) {
  return apiRequest("/api/loans", {}, auth);
}

export function getCustomerLoans(customerId, auth) {
  return apiRequest(`/api/loans/customer/${encodeURIComponent(customerId)}`, {}, auth);
}

export function getLoan(id, auth) {
  return apiRequest(`/api/loans/${encodeURIComponent(id)}`, {}, auth);
}

export function getApplications(auth) {
  return apiRequest("/api/loans/applications", {}, auth);
}

export function getCustomerApplications(customerId, auth) {
  return apiRequest(`/api/loans/applications/customer/${encodeURIComponent(customerId)}`, {}, auth);
}

export function getApplication(id, auth) {
  return apiRequest(`/api/loans/applications/${encodeURIComponent(id)}`, {}, auth);
}

export function submitApplication(data, auth) {
  return apiRequest(
    "/api/loans/applications",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    auth
  );
}

export function approveApplication(id, auth) {
  return apiRequest(
    `/api/loans/applications/${encodeURIComponent(id)}/approve`,
    {
      method: "PATCH",
    },
    auth
  );
}

export function rejectApplication(id, reason, auth) {
  return apiRequest(
    `/api/loans/applications/${encodeURIComponent(id)}/reject`,
    {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    },
    auth
  );
}

export function calculateEmi(data, auth) {
  return apiRequest(
    "/api/loans/emi/calculate",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    auth
  );
}

export function getEmiSchedule(loanId, auth) {
  return apiRequest(`/api/loans/${encodeURIComponent(loanId)}/schedule`, {}, auth);
}

export function disburseLoan(loanId, auth) {
  return apiRequest(
    `/api/loans/${encodeURIComponent(loanId)}/disburse`,
    {
      method: "POST",
    },
    auth
  );
}

export function prepayLoan(loanId, amount, auth, accountId) {
  const payload = { amount: Number(amount) };
  if (accountId) payload.accountId = accountId;
  return apiRequest(
    `/api/loans/${encodeURIComponent(loanId)}/prepay`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    auth
  );
}

export function forecloseLoan(loanId, auth) {
  return apiRequest(
    `/api/loans/${encodeURIComponent(loanId)}/foreclose`,
    {
      method: "POST",
    },
    auth
  );
}

export function getPortfolio(auth) {
  return apiRequest("/api/loans/portfolio", {}, auth);
}

export function getOverdueCollections(auth) {
  return apiRequest("/api/loans/collections/overdue", {}, auth);
}

export function getCollectionNotes(loanId, auth) {
  return apiRequest(
    `/api/loans/collections/${encodeURIComponent(loanId)}/notes`,
    {},
    auth
  );
}

export function addCollectionNote(loanId, note, actionTaken, auth) {
  return apiRequest(
    `/api/loans/collections/${encodeURIComponent(loanId)}/notes`,
    {
      method: "POST",
      body: JSON.stringify({ note, actionTaken }),
    },
    auth
  );
}
