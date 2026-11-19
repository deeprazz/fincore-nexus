export function formatDate(dateValue) {
  if (!dateValue) return "N/A";
  try {
    if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      const [y, m, d] = dateValue.split("-");
      return `${d}/${m}/${y}`;
    }
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return String(dateValue);
    return d.toLocaleDateString("en-IN");
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
