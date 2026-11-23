import React, { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import type { Report } from "@prisma/client";
import PendingJobsIndicator from "~/components/reports/PendingJobsIndicator";

jest.mock("~/hooks/useApiMutation", () => ({
  useApiDelete: () => ({ mutate: jest.fn(), loading: false }),
}));

const job = {
  id: "job-1",
  title: "Vacancy Report - November 20, 2026",
  ReportType: "VacancyReport",
  status: "PROCESSING",
  // 6:19pm Pacific, 02:19 UTC the next day.
  requestedAt: new Date("2026-11-21T02:19:00Z"),
} as unknown as Report;

const RealDateTimeFormat = Intl.DateTimeFormat;

/** Makes `Intl.DateTimeFormat` default to `timeZone`, standing in for the runtime's zone. */
function useDefaultTimeZone(timeZone: string) {
  jest
    .spyOn(Intl, "DateTimeFormat")
    .mockImplementation(
      (locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) =>
        new RealDateTimeFormat(locales, { timeZone, ...options }),
    );
}

describe("PendingJobsIndicator", () => {
  beforeEach(() => {
    // Keep the mount-time refresh from replacing the initial jobs.
    global.fetch = jest.fn(() => new Promise<Response>(() => undefined));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("hydrates without a mismatch when the server is in UTC and the browser is not", async () => {
    useDefaultTimeZone("UTC");
    const container = document.createElement("div");
    container.innerHTML = renderToString(
      <PendingJobsIndicator initialJobs={[job]} />,
    );
    document.body.appendChild(container);

    jest.restoreAllMocks();
    useDefaultTimeZone("America/Los_Angeles");
    const recoverableErrors: unknown[] = [];
    await act(async () => {
      hydrateRoot(container, <PendingJobsIndicator initialJobs={[job]} />, {
        onRecoverableError: (error) => recoverableErrors.push(error),
      });
    });

    expect(recoverableErrors).toEqual([]);
    expect(container.textContent).toContain("Started Nov 20, 06:19 PM");
    container.remove();
  });
});
