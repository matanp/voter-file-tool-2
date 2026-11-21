import posthog from "posthog-js";

/**
 * Every custom PostHog event and its properties, in one place.
 *
 * Properties must never carry voter PII: no names, addresses, VRCNUMs, DOBs,
 * phone numbers or search values. Use field names, codes and counts.
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
