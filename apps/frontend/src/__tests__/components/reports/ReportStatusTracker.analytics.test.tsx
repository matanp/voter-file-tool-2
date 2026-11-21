/**
 * ReportStatusTracker records a watched job's final status once, named by the
 * request `trackReportRequested` remembered.
 */
import React from "react";
import { render } from "@testing-library/react";

import { ReportStatusTracker } from "~/app/components/ReportStatusTracker";
import { trackReportRequested } from "~/lib/analytics";

const mockCapture = jest.fn<void, unknown[]>();
jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: (...args: unknown[]) => mockCapture(...args) },
}));

type Listener = (message: { data: unknown }) => void;
let mockListener: Listener | null = null;
jest.mock("ably/react", () => ({
  AblyProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  ChannelProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useChannel: (_channel: string, listener: Listener) => {
    mockListener = listener;
  },
}));
jest.mock("~/lib/ably", () => ({ getAblyClient: () => ({}) }));

const events = (name: string) =>
  mockCapture.mock.calls.filter(([event]) => event === name);

describe("ReportStatusTracker analytics", () => {
  beforeEach(() => mockCapture.mockClear());

  it("records a failure once, with the requested report's type", () => {
    trackReportRequested("job-1", { type: "voterList", format: "pdf" });
    const onError = jest.fn();
    render(<ReportStatusTracker reportId="job-1" onError={onError} />);

    const failed = { data: { jobId: "job-1", status: "FAILED", error: "x" } };
    mockListener?.(failed);
    mockListener?.(failed);

    expect(onError).toHaveBeenCalled();
    expect(events("report_failed")).toEqual([
      [
        "report_failed",
        {
          report_type: "VoterList",
          report_key: "voterList",
          format: "pdf",
          ms_since_request: expect.any(Number) as unknown,
        },
      ],
    ]);
  });

  it("records a completion and ignores progress updates", () => {
    trackReportRequested("job-2", { type: "voterList", format: "xlsx" });
    render(<ReportStatusTracker reportId="job-2" onComplete={jest.fn()} />);

    mockListener?.({ data: { jobId: "job-2", status: "PROCESSING" } });
    expect(events("report_completed")).toHaveLength(0);

    mockListener?.({
      data: { jobId: "job-2", status: "COMPLETED", url: "https://x" },
    });
    expect(events("report_completed")).toHaveLength(1);
  });
});
