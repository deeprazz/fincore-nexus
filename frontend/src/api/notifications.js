import { apiRequest } from "./client";

export async function getNotifications(customerId, auth) {
  const query = customerId ? `?customerId=${encodeURIComponent(customerId)}` : "";
  return apiRequest(`/notifications${query}`, {}, auth);
}

export async function getCustomerNotifications(customerId, auth) {
  return apiRequest(`/notifications/customer/${encodeURIComponent(customerId)}`, {}, auth);
}
