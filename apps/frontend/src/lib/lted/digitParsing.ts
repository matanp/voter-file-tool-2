/** Normalize Excel cell values to digit-only strings (strips trailing .0, rejects non-digits). */
export function normalizeDigits(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const withoutDecimal = raw.replace(/\.0+$/, "");
  if (!/^\d+$/.test(withoutDecimal)) return null;
  const noLeadingZeros = withoutDecimal.replace(/^0+/, "");
  return noLeadingZeros.length > 0 ? noLeadingZeros : "0";
}

/** Parse a district/ward cell value to a non-negative integer, or null if invalid. */
export function parseDistrictValue(value: unknown): number | null {
  const digits = normalizeDigits(value);
  if (!digits) return null;
  const parsed = Number.parseInt(digits, 10);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

/** Normalize a Monroe town code cell to a 3-digit padded string, or null if invalid. */
export function normalizeTownCode(value: unknown): string | null {
  const parsed = parseDistrictValue(value);
  if (parsed === null) return null;
  return parsed.toString().padStart(3, "0");
}
