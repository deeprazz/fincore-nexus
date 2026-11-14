import { apiRequest } from "./client";

export function getCustomers(kycStatus = "ALL", auth) {
  const q = kycStatus && kycStatus !== "ALL" ? `?kycStatus=${encodeURIComponent(kycStatus)}` : "";
  return apiRequest(`/customers${q}`, {}, auth);
}

export function createCustomer(name, email, auth) {
  return apiRequest(
    "/customers",
    {
      method: "POST",
      body: JSON.stringify({ name: name.trim(), email: email.trim() }),
    },
    auth
  );
}

export function updateCustomerKyc(customerId, kycStatus, auth) {
  return apiRequest(
    `/customers/${encodeURIComponent(customerId)}/kyc?status=${encodeURIComponent(kycStatus)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ kycStatus, status: kycStatus }),
    },
    auth
  );
}
