const mockCapture = jest.fn<void, unknown[]>();
jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: (...args: unknown[]) => mockCapture(...args) },
}));

import { actionName, errorCode, track } from "~/lib/analytics";

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
});
