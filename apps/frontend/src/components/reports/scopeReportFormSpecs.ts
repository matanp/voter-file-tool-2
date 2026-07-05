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

/** Shared long-form date for default report names. */
export function formatScopedReportDefaultDate(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function defaultScopedReportName(prefix: string): string {
  return `${prefix} - ${formatScopedReportDefaultDate()}`;
}

export function last30DaysIsoRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}
