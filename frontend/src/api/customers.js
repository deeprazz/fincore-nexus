import { apiRequest } from "./client";

export function getCustomers(kycStatus = "ALL", auth) {
  const q = kycStatus && kycStatus !== "ALL" ? `?kycStatus=${encodeURIComponent(kycStatus)}` : "";
  return apiRequest(`/customers${q}`, {}, auth);
}

export function createCustomer(dataOrName, emailOrAuth, authOrUndefined) {
  let body;
  let auth;

  if (typeof dataOrName === "object" && dataOrName !== null) {
    body = JSON.stringify({
      name: (dataOrName.name || "").trim(),
      email: (dataOrName.email || "").trim(),
      phoneNumber: (dataOrName.phoneNumber || "").trim(),
      aadhaarNumber: (dataOrName.aadhaarNumber || "").trim(),
      panNumber: (dataOrName.panNumber || "").trim().toUpperCase(),
      password: dataOrName.password || "Customer@123",
    });
    auth = emailOrAuth;
  } else {
    body = JSON.stringify({
      name: (dataOrName || "").trim(),
      email: (emailOrAuth || "").trim(),
      password: "Customer@123",
    });
    auth = authOrUndefined;
  }

  return apiRequest(
    "/customers",
    {
      method: "POST",
      body,
    },
    auth
  );
}

export function updateCustomerKyc(customerId, kycStatus, auth) {
  return apiRequest(
    `/customers/${encodeURIComponent(customerId)}/kyc?status=${encodeURIComponent(kycStatus)}`,
    {
      method: "PUT",
      body: JSON.stringify({ kycStatus, status: kycStatus }),
    },
    auth
  );
}
