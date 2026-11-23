/**
 * useGenerateReport records `report_requested` for every report job, and every
 * report form requests jobs through it.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { act, renderHook } from "@testing-library/react";
import {
  GENERATE_REPORT_ENDPOINT,
  useGenerateReport,
} from "~/hooks/useGenerateReport";
import { fetchJsonResponse, installFetchMock } from "../utils/mocks";

const mockCapture = jest.fn<void, unknown[]>();
jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: (...args: unknown[]) => mockCapture(...args) },
}));

type Payload = { type: string; format: string };

describe("useGenerateReport", () => {
  beforeEach(() => mockCapture.mockReset());

  it("records report_requested, then calls the form's onSuccess", async () => {
    installFetchMock(async () => fetchJsonResponse({ reportId: "r1" }));
    const onSuccess = jest.fn();
    const { result } = renderHook(() =>
      useGenerateReport<Payload>({ onSuccess }),
    );

    await act(() =>
      result.current.mutate({ type: "voterList", format: "xlsx" }),
    );

    expect(mockCapture).toHaveBeenCalledWith("report_requested", {
      report_type: "VoterList",
      report_key: "voterList",
      format: "xlsx",
    });
    expect(onSuccess).toHaveBeenCalledWith(
      { reportId: "r1" },
      { type: "voterList", format: "xlsx" },
    );
  });

  it("records nothing when the job is refused", async () => {
    installFetchMock(async () =>
      fetchJsonResponse({ error: "Forbidden" }, 403),
    );
    const onError = jest.fn();
    const { result } = renderHook(() =>
      useGenerateReport<Payload>({ onError }),
    );

    await act(async () => {
      await result.current
        .mutate({ type: "voterList", format: "xlsx" })
        .catch(() => undefined);
    });

    expect(mockCapture).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });
});

describe("report forms", () => {
  // A form that posts to the endpoint some other way skips report_requested.
  it("request report jobs only through useGenerateReport", () => {
    const root = join(__dirname, "../..");
    const hook = join(root, "hooks/useGenerateReport.ts");
    const sourceFiles = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          return name === "__tests__" || name === "api"
            ? []
            : sourceFiles(path);
        }
        return /\.tsx?$/.test(name) ? [path] : [];
      });

    const offenders = sourceFiles(root)
      .filter((path) => path !== hook)
      .filter((path) =>
        readFileSync(path, "utf8").includes(`"${GENERATE_REPORT_ENDPOINT}"`),
      )
      .map((path) => relative(root, path));

    expect(offenders).toEqual([]);
  });
});
