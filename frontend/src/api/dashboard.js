import { apiRequest } from "./client";

export function getDashboardSummary(auth) {
  return apiRequest("/dashboard/summary", {}, auth);
}
