import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JobStatus, ReportType, type Report } from "@prisma/client";
import ReportCard from "~/components/reports/ReportCard";

const mockCapture = jest.fn<void, unknown[]>();
jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: (...args: unknown[]) => mockCapture(...args) },
}));

const REQUESTED_AT = new Date("2026-11-20T12:00:00.000Z");

function report(fileType: string) {
  const row = {
    id: "report-1",
    generatedById: "user-1",
    ReportType: ReportType.VoterList,
    fileKey: `reports/report-1.${fileType}`,
    title: "Test report",
    description: null,
    fileType,
    public: false,
    status: JobStatus.COMPLETED,
    requestedAt: REQUESTED_AT,
    completedAt: REQUESTED_AT,
    deleted: false,
    metadata: null,
  } satisfies Record<keyof Report, unknown>;
  return {
    ...row,
    generatedBy: { id: "user-1", name: "Test User", email: "test@example.com" },
    presignedUrl: `https://files.example.com/report-1.${fileType}`,
  };
}

describe("ReportCard analytics", () => {
  beforeEach(() => {
    mockCapture.mockReset();
    jest.spyOn(window, "open").mockImplementation(() => null);
  });

  it("records a download with the report's type and format", async () => {
    render(<ReportCard report={report("xlsx")} />);
    await userEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(mockCapture).toHaveBeenCalledWith("report_downloaded", {
      report_type: "VoterList",
      format: "xlsx",
      via: "download",
      ms_since_request: expect.any(Number) as unknown,
    });
  });

  it("records opening a PDF in a new tab as a view", async () => {
    render(<ReportCard report={report("pdf")} />);
    await userEvent.click(screen.getByRole("button", { name: "View" }));
    expect(mockCapture).toHaveBeenCalledWith(
      "report_downloaded",
      expect.objectContaining({ format: "pdf", via: "view" }),
    );
  });
});
