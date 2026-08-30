/**
 * Safely parses calendar dates, avoiding timezone pitfalls.
 *
 * The main issue: new Date('YYYY-MM-DD') is parsed as UTC midnight,
 * which can shift to the previous day when converted to local time.
 *
 * This function handles YYYY-MM-DD dates by constructing them at noon UTC
 * to avoid DST edge cases, ensuring the date components remain correct.
 */
export function parseCalendarDate(dateString?: string | null): Date | null {
  if (!dateString) return null;

  // Handle YYYY-MM-DD precisely
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (m) {
    const y = Number(m[1]),
      mo = Number(m[2]) - 1,
      d = Number(m[3]);
    // Construct at noon UTC to avoid DST edge cases, then normalize to midnight if needed
    return new Date(Date.UTC(y, mo, d, 12, 0, 0));
  }

  // For other formats, fall back to standard parsing
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? null : d;
}

export type ParsedDateRange =
  | { ok: true; start: Date; end: Date }
  | { ok: false; error: string };

/**
 * Parses start/end calendar dates and requires end to be after start.
 */
export function parseTermDateRange(
  startDate: string,
  endDate: string,
): ParsedDateRange {
  const start = parseCalendarDate(startDate);
  const end = parseCalendarDate(endDate);
  if (!start || !end) {
    return { ok: false, error: "Invalid start or end date" };
  }
  if (end.getTime() <= start.getTime()) {
    return { ok: false, error: "End date must be after start date" };
  }
  return { ok: true, start, end };
}

/**
 * Formats a Date as YYYY-MM-DD using UTC calendar parts for date inputs.
 */
export function formatCalendarDateForForm(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  if (isNaN(value.getTime())) {
    return "";
  }
  const year = value.getUTCFullYear();
  const month = (value.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = value.getUTCDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date for display using UTC calendar parts (e.g. "Jan 1, 2026").
 */
export function formatCalendarDateForDisplay(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  if (isNaN(value.getTime())) {
    return "";
  }
  return value.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
