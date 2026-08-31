/**
 * Parsing and normalization for bulk-added election config (office names, election dates).
 *
 * Hard constraint: `new Date(string)` and `Date.parse` appear NOWHERE in this module.
 * They resolve `YYYY-MM-DD` as UTC but `M/D/YYYY` as local, which produces off-by-one-day
 * election dates. Calendar dates here are parsed by hand from an explicit allowlist and
 * built with `Date.UTC`.
 *
 * This module is deliberately app-local (not `packages/shared-validators`): the
 * `date-handling` effort will rewrite it against whatever calendar-date representation its
 * ticket 04 picks, and that is a rewrite rather than a relocation.
 */

/** Maximum lines accepted in one bulk paste. Enforced client-side and again server-side. */
export const MAX_BULK_ROWS = 50;

/** User-facing message for a line that is not an accepted calendar-date format. */
export const INVALID_DATE_MESSAGE = "use 2026-11-03 or 11/3/2026";

/**
 * Splits pasted text into candidate lines.
 *
 * Newline-separated only — commas are never separators, because office names plausibly
 * contain them ("Council Member, District 3"). Blank and whitespace-only lines are dropped
 * so they never become phantom rows.
 */
export function splitPastedLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Normalizes an office name for storage: trim only.
 *
 * Casing is preserved as typed ("NYS Assembly" must not be title-cased), internal
 * whitespace is untouched, and quotes and trailing commas are not stripped.
 */
export function normalizeOfficeName(input: string): string {
  return input.trim();
}

/**
 * Key used to compare office names against existing records and within a batch.
 * Case-insensitive, matching what the single-add API already does.
 */
export function officeNameMatchKey(input: string): string {
  return normalizeOfficeName(input).toLowerCase();
}

const ISO_DATE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const US_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/**
 * Parses a calendar date from the strict allowlist: `YYYY-MM-DD` or `M/D/YYYY`
 * (zero-padded variants of both accepted). Long forms like `November 3, 2026` are
 * rejected.
 *
 * Returns a `Date` at UTC midnight, or `null` when the input is not an accepted format or
 * the components do not round-trip (e.g. `2026-02-30`).
 */
export function parseCalendarDate(input: string): Date | null {
  const trimmed = input.trim();

  let year: number;
  let month: number;
  let day: number;

  const iso = ISO_DATE.exec(trimmed);
  const us = iso ? null : US_DATE.exec(trimmed);

  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (us) {
    month = Number(us[1]);
    day = Number(us[2]);
    year = Number(us[3]);
  } else {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  // Reject values whose components don't round-trip (2026-02-30 rolls into March).
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Builds the `YYYY-MM-DD` string the strict parser accepts from the **local-midnight**
 * `Date` that `<DatePicker>` produces.
 *
 * Uses LOCAL components deliberately. `formatElectionDateForForm` builds the same shape
 * from UTC components, which is right for its documented input — a `Date` read back from
 * the DB, which is UTC midnight — and wrong for a picker's local-midnight `Date`, where it
 * gives the correct answer only because New York sits at a negative UTC offset. A
 * local-midnight `Date`'s local components are the day the admin clicked, at every offset.
 */
export function calendarDateFromLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats a UTC-midnight election date with its weekday, for the bulk preview's
 * stored-value column. NY elections are Tuesdays, so a fat-fingered `11/4/2026 → Wed` is
 * visible at a glance.
 */
export function formatCalendarDateWithWeekday(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Half-open UTC-day range for matching an election date by day rather than by exact
 * instant.
 *
 * `where: { date: exactMidnight }` fails open: a stray non-midnight row would be missed by
 * the precheck, pass the case-sensitive `@unique` index (it is a different instant), and
 * land as a silent duplicate — two Nov 3 entries in the dropdown. Day-matching turns that
 * into an "already exists" skip.
 */
export function utcDayRange(date: Date): { gte: Date; lt: Date } {
  const gte = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const lt = new Date(gte.getTime() + 24 * 60 * 60 * 1000);
  return { gte, lt };
}
