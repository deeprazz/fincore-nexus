export function formatDate(dateValue) {
  if (!dateValue) return "N/A";
  try {
    return new Date(dateValue).toLocaleDateString("en-IN");
  } catch {
    return String(dateValue);
  }
}

export function formatDateTime(dateValue) {
  if (!dateValue) return "N/A";
  try {
    return new Date(dateValue).toLocaleString("en-IN");
  } catch {
    return String(dateValue);
  }
}
