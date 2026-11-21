import type { ScopeReportType } from "@voter-file-tool/shared-validators";

export interface ScopeReportFormMessages {
  submitLabel: string;
  submitLabelPdf?: string;
  loadingMessage: string;
  toastStartedTitle: string;
  toastStartedDescription: string;
  successToast: string;
  successHeading: string;
  errorFallback: string;
  showPdfPreview: boolean;
}

export const SCOPE_REPORT_FORM_MESSAGES: Record<
  ScopeReportType,
  ScopeReportFormMessages
> = {
  committeeRoster: {
    submitLabel: "Generate Report",
    loadingMessage: "Generating committee roster...",
    toastStartedTitle: "Report Generation Started",
    toastStartedDescription:
      "Your committee roster report is being generated.",
    successToast: "Committee roster report generated successfully!",
    successHeading: "Committee roster report generated successfully!",
    errorFallback: "Failed to generate committee roster",
    showPdfPreview: false,
  },
  signInSheet: {
    submitLabel: "Generate PDF",
    loadingMessage: "Generating sign-in sheet...",
    toastStartedTitle: "Report Generation Started",
    toastStartedDescription:
      "Your sign-in sheet is being generated. You'll be notified when it's ready.",
    successToast: "Sign-in sheet generated successfully!",
    successHeading: "Sign-in sheet generated successfully!",
    errorFallback: "Failed to generate sign-in sheet",
    showPdfPreview: true,
  },
  designationWeightSummary: {
    submitLabel: "Generate Report",
    loadingMessage: "Generating designation weight summary...",
    toastStartedTitle: "Report Generation Started",
    toastStartedDescription:
      "Your designation weight summary is being generated.",
    successToast: "Designation weight summary generated!",
    successHeading: "Designation weight summary generated successfully!",
    errorFallback: "Failed to generate designation weight summary",
    showPdfPreview: false,
  },
  vacancyReport: {
    submitLabel: "Generate Report",
    loadingMessage: "Generating vacancy report...",
    toastStartedTitle: "Report Generation Started",
    toastStartedDescription: "Your vacancy report is being generated.",
    successToast: "Vacancy report generated!",
    successHeading: "Vacancy report generated successfully!",
    errorFallback: "Failed to generate vacancy report",
    showPdfPreview: false,
  },
  changesReport: {
    submitLabel: "Generate Report",
    loadingMessage: "Generating changes report...",
    toastStartedTitle: "Report Generation Started",
    toastStartedDescription: "Your changes report is being generated.",
    successToast: "Changes report generated!",
    successHeading: "Changes report generated successfully!",
    errorFallback: "Failed to generate changes report",
    showPdfPreview: false,
  },
  petitionOutcomesReport: {
    submitLabel: "Generate Report",
    loadingMessage: "Generating petition outcomes report...",
    toastStartedTitle: "Report Generation Started",
    toastStartedDescription:
      "Your petition outcomes report is being generated.",
    successToast: "Petition outcomes report generated!",
    successHeading: "Petition outcomes report generated successfully!",
    errorFallback: "Failed to generate petition outcomes report",
    showPdfPreview: false,
  },
};

/*
 * These helpers depend on the clock and the time zone: on the server (UTC on Vercel) they can
 * return a different day than in the browser. `timeZone` defaults to the runtime's own zone;
 * tests pass one explicitly. Their results only seed controlled inputs, whose server values
 * React replaces during hydration; don't render them as text in server-rendered output.
 */

/** Shared long-form date for default report names, e.g. "November 20, 2026". */
export function formatScopedReportDefaultDate(
  now: Date = new Date(),
  timeZone?: string,
): string {
  return now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone,
  });
}

export function defaultScopedReportName(
  prefix: string,
  now: Date = new Date(),
  timeZone?: string,
): string {
  return `${prefix} - ${formatScopedReportDefaultDate(now, timeZone)}`;
}

/** The calendar day `now` falls on in `timeZone`. */
function calendarDayIn(
  now: Date,
  timeZone: string | undefined,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone,
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return { year: part("year"), month: part("month"), day: part("day") };
}

/** The 30 days ending today in `timeZone`, as `YYYY-MM-DD` calendar dates. */
export function last30DaysIsoRange(
  now: Date = new Date(),
  timeZone?: string,
): { from: string; to: string } {
  const { year, month, day } = calendarDayIn(now, timeZone);
  // Calendar arithmetic on UTC midnights: no DST or offset can shift the day.
  const isoDay = (offsetDays: number) =>
    new Date(Date.UTC(year, month - 1, day + offsetDays))
      .toISOString()
      .slice(0, 10);
  return { from: isoDay(-30), to: isoDay(0) };
}
