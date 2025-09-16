/**
 * Utility functions for handling election dates consistently across the application.
 * These functions ensure that election dates are displayed correctly regardless of timezone.
 */

/**
 * Formats an election date for display, preserving the intended date regardless of timezone.
 * This is the primary function to use for displaying election dates in the UI.
 *
 * @param date - The election date (can be a Date object or ISO string)
 * @param options - Formatting options
 * @returns Formatted date string
 */
export function formatElectionDate(
  date: Date | string,
  options: {
    format?: "short" | "long" | "withOrdinal";
    timeZone?: "UTC" | "local";
  } = {},
): string {
  const { format = "short", timeZone = "UTC" } = options;

  const electionDate = typeof date === "string" ? new Date(date) : date;

  if (timeZone === "UTC") {
    // Use UTC methods to preserve the intended date
    const year = electionDate.getUTCFullYear();
    const month = electionDate.getUTCMonth();
    const day = electionDate.getUTCDate();

    switch (format) {
      case "short":
        return `${month + 1}/${day}/${year}`;
      case "long":
        return electionDate.toLocaleDateString("en-US", {
          timeZone: "UTC",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      case "withOrdinal": {
        const ordinal = getOrdinal(day);
        const monthName = electionDate.toLocaleDateString("en-US", {
          timeZone: "UTC",
          month: "long",
        });
        return `${monthName} ${day}${ordinal}, ${year}`;
      }
      default:
        return `${month + 1}/${day}/${year}`;
    }
  } else {
    // Use local timezone (fallback for edge cases)
    switch (format) {
      case "short":
        return electionDate.toLocaleDateString("en-US");
      case "long":
        return electionDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      case "withOrdinal":
        const day = electionDate.getDate();
        const ordinal = getOrdinal(day);
        const monthName = electionDate.toLocaleDateString("en-US", {
          month: "long",
        });
        const year = electionDate.getFullYear();
        return `${monthName} ${day}${ordinal}, ${year}`;
      default:
        return electionDate.toLocaleDateString("en-US");
    }
  }
}

/**
 * Gets the ordinal suffix for a day number (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinal(day: number): string {
  if (day % 10 === 1 && day !== 11) return "st";
  if (day % 10 === 2 && day !== 12) return "nd";
  if (day % 10 === 3 && day !== 13) return "rd";
  return "th";
}

/**
 * Formats an election date for use in form values (parseable ISO string).
 * This is useful for dropdown values and form submissions.
 *
 * @param date - The election date (can be a Date object or ISO string)
 * @returns ISO date string suitable for form values (YYYY-MM-DD format)
 */
export function formatElectionDateForForm(date: Date | string): string {
  const electionDate = typeof date === "string" ? new Date(date) : date;

  // Check if the date is valid
  if (isNaN(electionDate.getTime())) {
    return ""; // Return empty string for invalid dates
  }

  // Return ISO date string in YYYY-MM-DD format for form compatibility
  return electionDate.toISOString().split("T")[0]!;
}

/**
 * Formats an election date for display in lists and simple contexts.
 *
 * @param date - The election date (can be a Date object or ISO string)
 * @returns Short formatted date string
 */
export function formatElectionDateForDisplay(date: Date | string): string {
  return formatElectionDate(date, { format: "short", timeZone: "UTC" });
}

/**
 * Formats an election date for display with full month name and ordinal.
 * This is useful for user-facing displays where you want a more readable format.
 *
 * @param date - The election date (can be a Date object or ISO string)
 * @returns Long formatted date string with ordinal
 */
export function formatElectionDateForUser(date: Date | string): string {
  return formatElectionDate(date, { format: "withOrdinal", timeZone: "UTC" });
}

/**
 * Sorts election dates chronologically.
 *
 * @param dates - Array of election dates
 * @returns Sorted array of election dates (oldest first)
 */
export function sortElectionDates<T extends { date: Date | string }>(
  dates: T[],
): T[] {
  return [...dates].sort((a, b) => {
    const dateA = typeof a.date === "string" ? new Date(a.date) : a.date;
    const dateB = typeof b.date === "string" ? new Date(b.date) : b.date;

    // Check if dates are valid
    const isValidA = !isNaN(dateA.getTime());
    const isValidB = !isNaN(dateB.getTime());

    // If both dates are invalid, consider them equal
    if (!isValidA && !isValidB) {
      return 0;
    }

    // If only one date is invalid, treat invalid date as greater (sorts to end)
    if (!isValidA) {
      return 1;
    }
    if (!isValidB) {
      return -1;
    }

    // Both dates are valid, compare their numeric getTime() values
    return dateA.getTime() - dateB.getTime();
  });
}
