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
