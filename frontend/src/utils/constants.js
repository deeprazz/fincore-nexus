export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081/api";

export const KYC_STATUSES = ["ALL", "PENDING", "VERIFIED", "REJECTED"];
export const ACCOUNT_STATUSES = ["ACTIVE", "FROZEN", "CLOSED"];
export const OPERATIONS = ["DEPOSIT", "WITHDRAW", "TRANSFER"];
