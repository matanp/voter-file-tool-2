import { act, renderHook, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useApiQuery } from "~/hooks/useApiQuery";
import { mockJsonResponse } from "../utils/testUtils";

describe("useApiQuery", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("loads JSON data successfully on mount", async () => {
    const terms = [{ id: "term-1", label: "2024-2026" }];
    globalThis.fetch = jest.fn().mockResolvedValue(mockJsonResponse(terms));

    const { result } = renderHook(() =>
      useApiQuery<Array<{ id: string; label: string }>>("/api/admin/terms"),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/terms",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result.current.data).toEqual(terms);
    expect(result.current.error).toBeNull();
  });

  it("exposes error state and supports retry via refetch", async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        mockJsonResponse({ error: "boom" }, { status: 500 }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse([{ id: "term-2", label: "2026-2028" }]),
      );

    const { result } = renderHook(() =>
      useApiQuery<Array<{ id: string; label: string }>>("/api/admin/terms"),
    );

    await waitFor(() => {
      expect(result.current.error).toBe("boom");
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual([
      { id: "term-2", label: "2026-2028" },
    ]);
    expect((fetch as jest.Mock).mock.calls).toHaveLength(2);
  });
});
