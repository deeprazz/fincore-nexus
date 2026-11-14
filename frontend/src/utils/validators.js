export function validateEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePin(pin) {
  return typeof pin === "string" && /^\d{4}$/.test(pin.trim());
}

export function validateAmount(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num) || num <= 0) return false;
  return Math.round(num * 100) === num * 100;
}
