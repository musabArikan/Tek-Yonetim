export function normalizeAmountInput(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function formatAmountInput(value) {
  const digits = normalizeAmountInput(value);

  if (!digits) {
    return "";
  }

  return Number(digits).toLocaleString("tr-TR");
}

export function parseAmountInput(value) {
  const digits = normalizeAmountInput(value);
  return digits ? Number(digits) : 0;
}

export function sanitizeAmountForPayload(value, fallback = 0) {
  const normalized = Number(String(value ?? "").replace(/\./g, ""));

  if (Number.isNaN(normalized)) {
    return fallback;
  }

  return normalized;
}
