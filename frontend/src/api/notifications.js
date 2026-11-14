import { apiRequest } from "./client";

export async function getNotifications(customerId) {
  const query = customerId ? `?customerId=${encodeURIComponent(customerId)}` : "";
  return apiRequest(`/notifications${query}`);
}

export async function getCustomerNotifications(customerId) {
  return apiRequest(`/notifications/customer/${encodeURIComponent(customerId)}`);
}
