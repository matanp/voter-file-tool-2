const mockCapture = jest.fn<void, unknown[]>();
jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: (...args: unknown[]) => mockCapture(...args) },
}));

import {
  actionName,
  errorCode,
  outcomeOf,
  track,
  trackReportRequested,
  trackReportStatus,
} from "~/lib/analytics";

describe("analytics", () => {
  beforeEach(() => mockCapture.mockReset());

  it("passes the event and properties to PostHog", () => {
    track("action_failed", {
      action: "committee/remove",
      error_code: "http_500",
      http_status: 500,
    });
    expect(mockCapture).toHaveBeenCalledWith("action_failed", {
      action: "committee/remove",
      error_code: "http_500",
      http_status: 500,
    });
  });

  it("swallows PostHog errors", () => {
    mockCapture.mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() =>
      track("action_failed", {
        action: "x",
        error_code: "y",
        http_status: null,
      }),
    ).not.toThrow();
  });

  it("names actions by endpoint path", () => {
    expect(actionName("/api/committee/add")).toBe("committee/add");
    expect(actionName("/api/committee/remove?x=1")).toBe("committee/remove");
  });

  it("passes codes through but never free text", () => {
    expect(errorCode("INELIGIBLE", 422)).toBe("INELIGIBLE");
    expect(errorCode("Voter Jane Doe not found", 404)).toBe("http_404");
    expect(errorCode(undefined, null)).toBe("network_error");
  });

  it("maps drawer failures to outcomes", () => {
    expect(outcomeOf(null)).toBe("success");
    expect(outcomeOf({ kind: "ineligible" })).toBe("ineligible");
    expect(outcomeOf({ kind: "error" })).toBe("error");
  });

  it("names a requested report job and its later status", () => {
    trackReportRequested("r1", { type: "voterList", format: "xlsx" });
    expect(mockCapture).toHaveBeenLastCalledWith("report_requested", {
      report_type: "VoterList",
      report_key: "voterList",
      format: "xlsx",
    });

    trackReportStatus("r1", "FAILED");
    expect(mockCapture).toHaveBeenLastCalledWith("report_failed", {
      report_type: "VoterList",
      report_key: "voterList",
      format: "xlsx",
      ms_since_request: expect.any(Number) as unknown,
    });
  });

  it("still records a status for a job requested in another tab", () => {
    trackReportStatus("elsewhere", "COMPLETED");
    expect(mockCapture).toHaveBeenLastCalledWith("report_completed", {
      report_type: "unknown",
      report_key: null,
      format: null,
      ms_since_request: null,
    });
  });

  it("reports an unknown report key as given", () => {
    trackReportRequested(undefined, { type: "mystery" });
    expect(mockCapture).toHaveBeenLastCalledWith("report_requested", {
      report_type: "mystery",
      report_key: "mystery",
      format: null,
    });
  });
});
