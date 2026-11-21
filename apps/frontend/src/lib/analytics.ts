import posthog from "posthog-js";
import {
  getPrismaReportType,
  type ReportTypeKey,
} from "@voter-file-tool/shared-validators";

/** How a submitted action ended. */
export type ActionOutcomeKind = "success" | "ineligible" | "error";

/**
 * Every custom PostHog event and its properties, in one place.
 *
 * Properties must never carry voter PII: no names, addresses, VRCNUMs, DOBs,
 * phone numbers or search values. Use field names, codes and counts.
 *
 * Every event also carries `privilege_level` (the signed-in user's Privilege),
 * registered as a super property when the user is identified.
 */
export interface AnalyticsEvents {
  /** A server mutation was refused or failed. */
  action_failed: {
    /** The endpoint, without `/api/`, e.g. `committee/add`. */
    action: string;
    /** A server error code (`INELIGIBLE`), else `http_<status>` or `network_error`. */
    error_code: string;
    http_status: number | null;
    /** Eligibility hard-stop codes, for `INELIGIBLE`. */
    reasons?: string[];
  };
  /** A /recordsearch search returned (or failed). */
  record_search_performed: {
    mode: "simple" | "advanced";
    /** Searchable field names only, never their values. */
    criteria_fields: string[];
    result_count: number | null;
    duration_ms: number;
    outcome: "success" | "error";
  };
  /** A voter's "See more details" popover opened. */
  voter_details_opened: {
    /** Top-level page, e.g. `recordsearch`, `petitions`. */
    from: string;
  };
  /** The committee workspace's add / replace / submit-candidate flow finished. */
  committee_member_added: {
    flow: "add" | "replace";
    /** `add`: an Admin adds directly. `submit`: a request for approval. */
    mode: "add" | "submit";
    outcome: ActionOutcomeKind;
    override_used: boolean;
    /** From opening the flow to the server's answer. */
    ms_in_flow: number;
  };
  /** A removal, resignation or Leader exit report was submitted. */
  committee_member_removed: {
    flow: "remove" | "resign" | "report";
    outcome: ActionOutcomeKind;
    /** The removal reason / report kind code. */
    reason: string;
  };
  report_requested: ReportProps;
  report_completed: ReportProps & { ms_since_request: number | null };
  report_failed: ReportProps & { ms_since_request: number | null };
  /** A finished report was downloaded or opened from /reports. */
  report_downloaded: {
    report_type: string;
    via: "download" | "view";
    ms_since_request: number | null;
  };
  petition_action: {
    action: "record_outcome";
    outcome: "success" | "error";
    candidate_count: number;
  };
  /** A synchronous admin upload (weighted table, LTED crosswalk) finished. */
  admin_import_run: {
    /** The endpoint, without `/api/`, e.g. `admin/weightedTable/import`. */
    import_type: string;
    outcome: "success" | "error";
  };
}

interface ReportProps {
  /** Prisma `ReportType`, e.g. `VoterList`, as /reports shows it. */
  report_type: string;
  /** The generateReport `type`, e.g. `voterList`, when known. */
  report_key: string | null;
  format: string | null;
}

export type AnalyticsEvent = keyof AnalyticsEvents;

export function track<E extends AnalyticsEvent>(
  event: E,
  properties: AnalyticsEvents[E],
): void {
  try {
    posthog.capture(event, properties);
  } catch {
    // Analytics must never break the app.
  }
}

/** `/api/committee/add` → `committee/add`. */
export function actionName(url: string): string {
  return url.replace(/^\/api\//, "").replace(/[?#].*$/, "");
}

const ERROR_CODE = /^[A-Z][A-Z0-9_]{2,}$/;

/**
 * The code to report for a failed request. Free-text server messages can
 * quote voter data, so only all-caps codes pass through.
 */
export function errorCode(
  serverError: unknown,
  httpStatus: number | null,
): string {
  if (typeof serverError === "string" && ERROR_CODE.test(serverError)) {
    return serverError;
  }
  return httpStatus === null ? "network_error" : `http_${httpStatus}`;
}

/** A drawer action's failure (or null) as an outcome. */
export function outcomeOf(
  failure: { kind: "ineligible" | "error" } | null,
): ActionOutcomeKind {
  return failure === null ? "success" : failure.kind;
}

/** The first path segment, e.g. `/recordsearch?x` → `recordsearch`. */
export function currentPage(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname.split("/")[1] ?? "";
}

// --- Report jobs ---------------------------------------------------------------

type ReportRequest = {
  report_type: string;
  report_key: string;
  format: string | null;
  requestedAt: number;
};

/** Jobs requested in this tab, so status updates can name their report. */
const reportRequests = new Map<string, ReportRequest>();

/**
 * Call when generateReport accepts a job. Records `report_requested` and
 * remembers the job for `trackReportStatus`.
 */
export function trackReportRequested(
  reportId: string | undefined,
  payload: { type?: unknown; format?: unknown } | undefined,
): void {
  const key = typeof payload?.type === "string" ? payload.type : "unknown";
  let reportType = key;
  try {
    reportType = getPrismaReportType(key as ReportTypeKey) ?? key;
  } catch {
    // Unknown key: report it as given.
  }
  const request: ReportRequest = {
    report_type: reportType,
    report_key: key,
    format: typeof payload?.format === "string" ? payload.format : null,
    requestedAt: Date.now(),
  };
  if (reportId) reportRequests.set(reportId, request);
  track("report_requested", {
    report_type: request.report_type,
    report_key: request.report_key,
    format: request.format,
  });
}

/** Call when a job this tab is watching completes or fails. */
export function trackReportStatus(
  reportId: string,
  status: "COMPLETED" | "FAILED",
): void {
  const request = reportRequests.get(reportId);
  reportRequests.delete(reportId);
  track(status === "COMPLETED" ? "report_completed" : "report_failed", {
    report_type: request?.report_type ?? "unknown",
    report_key: request?.report_key ?? null,
    format: request?.format ?? null,
    ms_since_request: request ? Date.now() - request.requestedAt : null,
  });
}
