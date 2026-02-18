/**
 * Tests for useApiMutation and specialized variants (useApiPost, useApiDelete, useApiPatch, useApiPut).
 */
import { act, renderHook } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  useApiMutation,
  useApiPost,
  useApiDelete,
  useApiPatch,
  useApiPut,
} from "~/hooks/useApiMutation";
import { mockJsonResponse, mock204Response } from "../utils/testUtils";

describe("useApiMutation", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  describe("initial state", () => {
    it("returns loading false, error null, data null", () => {
      globalThis.fetch = jest.fn();
      const { result } = renderHook(() =>
        useApiMutation("/api/test", "POST"),
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.data).toBeNull();
    });
  });

  describe("success flows", () => {
    it("calls fetch with correct method, headers, and body on success", async () => {
      const mockData = { id: 1, name: "Test" };
      globalThis.fetch = jest.fn().mockResolvedValue(
        mockJsonResponse(mockData),
      );

      const { result } = renderHook(() =>
        useApiMutation<{ id: number; name: string }, { name: string }>(
          "/api/test",
          "POST",
        ),
      );

      await act(async () => {
        await result.current.mutate({ name: "Test" });
      });

      expect(fetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Accept: "application/json",
            "Content-Type": "application/json",
          }) as Record<string, unknown>,
          body: JSON.stringify({ name: "Test" }),
        }),
      );
      expect(result.current.data).toEqual(mockData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("sends no Content-Type or body when payload is undefined (e.g. DELETE)", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue(mock204Response());

      const { result } = renderHook(() =>
        useApiMutation("/api/test", "DELETE"),
      );

      await act(async () => {
        await result.current.mutate();
      });

      expect(fetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          method: "DELETE",
          headers: { Accept: "application/json" },
          body: undefined,
        }),
      );
    });

    it("handles 204 No Content as null result", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue(mock204Response());

      const { result } = renderHook(() =>
        useApiMutation<null>("/api/delete", "DELETE"),
      );

      let resolved: unknown;
      await act(async () => {
        resolved = await result.current.mutate();
      });

      expect(resolved).toBeNull();
      expect(result.current.data).toBeNull();
    });

    it("uses customEndpoint when provided to mutate", async () => {
      const mockData = { ok: true };
      globalThis.fetch = jest.fn().mockResolvedValue(
        mockJsonResponse(mockData),
      );

      const { result } = renderHook(() =>
        useApiMutation("/api/default", "POST"),
      );

      await act(async () => {
        await result.current.mutate(
          { x: 1 },
          "/api/custom/override",
        );
      });

      expect(fetch).toHaveBeenCalledWith(
        "/api/custom/override",
        expect.any(Object),
      );
    });
  });

  describe("error handling", () => {
    it("prefers error or message from JSON body on HTTP error", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue(
        mockJsonResponse(
          { error: "Validation failed", message: "Different message" },
          { status: 400 },
        ),
      );

      const { result } = renderHook(() =>
        useApiMutation("/api/test", "POST"),
      );

      await act(async () => {
        try {
          await result.current.mutate({});
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBe("Validation failed");
    });

    it("falls back to message when error is missing in JSON body", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue(
        mockJsonResponse({ message: "Server exploded" }, { status: 500 }),
      );

      const { result } = renderHook(() =>
        useApiMutation("/api/test", "POST"),
      );

      await act(async () => {
        try {
          await result.current.mutate({});
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBe("Server exploded");
    });

    it("uses statusText when error body is not JSON", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue(
        mockJsonResponse(null, {
          status: 503,
          json: () => Promise.reject(new Error("Not JSON")),
        }),
      );

      const { result } = renderHook(() =>
        useApiMutation("/api/test", "POST"),
      );

      await act(async () => {
        try {
          await result.current.mutate({});
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBe("Service Unavailable");
    });

    it("handles network/throw with non-Error as Unknown error", async () => {
      globalThis.fetch = jest.fn().mockRejectedValue("string error");

      const { result } = renderHook(() =>
        useApiMutation("/api/test", "POST"),
      );

      await act(async () => {
        try {
          await result.current.mutate({});
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBe("Unknown error occurred");
    });
  });

  describe("timeout", () => {
    it("aborts and sets Request timed out when fetch does not resolve", async () => {
      jest.useFakeTimers();
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";

      globalThis.fetch = jest
        .fn()
        .mockImplementation(
          (_url: string, init?: RequestInit): Promise<never> => {
            return new Promise<never>((_, reject) => {
              const signal = init?.signal;
              if (signal) {
                signal.addEventListener("abort", () => reject(abortError));
              }
            });
          },
        );

      const { result } = renderHook(() =>
        useApiMutation("/api/test", "POST", { timeout: 1000 }),
      );

      let thrown: Error | undefined;
      const mutatePromise = act(async () => {
        try {
          await result.current.mutate({});
        } catch (e) {
          thrown = e as Error;
        }
      });

      await act(async () => {
        jest.advanceTimersByTime(1100);
      });

      await mutatePromise;

      expect(result.current.error).toBe("Request timed out");
      expect(thrown?.message).toBe("Request timed out");
      jest.useRealTimers();
    });

    it("uses custom timeout from options", async () => {
      jest.useFakeTimers();
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";

      globalThis.fetch = jest
        .fn()
        .mockImplementation(
          (_url: string, init?: RequestInit): Promise<never> => {
            return new Promise<never>((_, reject) => {
              const signal = init?.signal;
              if (signal) {
                signal.addEventListener("abort", () => reject(abortError));
              }
            });
          },
        );

      const { result } = renderHook(() =>
        useApiMutation("/api/test", "POST", { timeout: 500 }),
      );

      const mutatePromise = act(async () => {
        try {
          await result.current.mutate({});
        } catch {
          // Expected
        }
      });

      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      await mutatePromise;

      expect(result.current.error).toBe("Request timed out");
      jest.useRealTimers();
    });
  });

  describe("callbacks", () => {
    it("calls onSuccess with result and payload on success", async () => {
      const mockData = { id: 1 };
      const payload = { name: "Test" };
      globalThis.fetch = jest.fn().mockResolvedValue(
        mockJsonResponse(mockData),
      );

      const onSuccess = jest.fn();
      const { result } = renderHook(() =>
        useApiMutation<{ id: number }, { name: string }>("/api/test", "POST", {
          onSuccess,
        }),
      );

      await act(async () => {
        await result.current.mutate(payload);
      });

      expect(onSuccess).toHaveBeenCalledWith(mockData, payload);
    });

    it("calls onError with Error on failure", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue(
        mockJsonResponse({ error: "Bad input" }, { status: 400 }),
      );

      const onError = jest.fn();
      const { result } = renderHook(() =>
        useApiMutation("/api/test", "POST", { onError }),
      );

      await act(async () => {
        try {
          await result.current.mutate({});
        } catch {
          // Expected
        }
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Bad input",
        }),
      );
    });

    it("calls onFinally after success or error", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue(
        mockJsonResponse({ ok: true }),
      );

      const onFinally = jest.fn();
      const { result } = renderHook(() =>
        useApiMutation("/api/test", "POST", { onFinally }),
      );

      await act(async () => {
        await result.current.mutate({});
      });

      expect(onFinally).toHaveBeenCalled();
    });

    it("calls onFinally after error", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue(
        mockJsonResponse(null, {
          status: 500,
          statusText: "Error",
          json: () => Promise.reject(new Error("Not JSON")),
        }),
      );

      const onFinally = jest.fn();
      const { result } = renderHook(() =>
        useApiMutation("/api/test", "POST", { onFinally }),
      );

      await act(async () => {
        try {
          await result.current.mutate({});
        } catch {
          // Expected
        }
      });

      expect(onFinally).toHaveBeenCalled();
    });

    it("uses latest options (optionsRef) when options change", async () => {
      const mockData = { id: 1 };
      globalThis.fetch = jest.fn().mockResolvedValue(
        mockJsonResponse(mockData),
      );

      const onSuccess1 = jest.fn();
      const onSuccess2 = jest.fn();
      const { result, rerender } = renderHook(
        ({ onSuccess }) =>
          useApiMutation<{ id: number }>("/api/test", "POST", {
            onSuccess,
          }),
        {
          initialProps: { onSuccess: onSuccess1 },
        },
      );

      rerender({ onSuccess: onSuccess2 });

      await act(async () => {
        await result.current.mutate();
      });

      expect(onSuccess1).not.toHaveBeenCalled();
      expect(onSuccess2).toHaveBeenCalledWith(mockData, undefined);
    });
  });

  describe("reset", () => {
    it("clears loading, error, and data", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue(
        mockJsonResponse(null, {
          status: 500,
          statusText: "Error",
          json: () => Promise.reject(new Error("Not JSON")),
        }),
      );

      const { result } = renderHook(() =>
        useApiMutation("/api/test", "POST"),
      );

      await act(async () => {
        try {
          await result.current.mutate({});
        } catch {
          // Expected
        }
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.data).toBeNull();
    });
  });

  describe("HTTP methods", () => {
    it.each([
      ["POST", "POST"],
      ["PUT", "PUT"],
      ["PATCH", "PATCH"],
      ["DELETE", "DELETE"],
    ] as const)(
      "uses %s when method is %s",
      async (method, expectedMethod) => {
        globalThis.fetch = jest.fn().mockResolvedValue(
          method === "DELETE" ? mock204Response() : mockJsonResponse({}),
        );

        const { result } = renderHook(() =>
          useApiMutation("/api/test", method),
        );

        await act(async () => {
          await result.current.mutate(
            method === "DELETE" ? undefined : { x: 1 },
          );
        });

        expect(fetch).toHaveBeenCalledWith(
          "/api/test",
          expect.objectContaining({ method: expectedMethod }),
        );
      },
    );
  });

  describe("edge cases", () => {
    it("throws when successful response is not JSON", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue(
        mockJsonResponse(null, {
          status: 200,
          contentType: "text/plain",
          body: "plain text",
          json: () => Promise.reject(new Error("Not JSON")),
        }),
      );

      const { result } = renderHook(() =>
        useApiMutation("/api/test", "POST"),
      );

      await expect(
        act(async () => {
          await result.current.mutate({});
        }),
      ).rejects.toThrow("Expected JSON response but received: text/plain");
    });

    it("keeps mutate reference stable when endpoint and method unchanged", () => {
      globalThis.fetch = jest.fn();
      const { result, rerender } = renderHook(() =>
        useApiMutation("/api/test", "POST"),
      );

      const mutate1 = result.current.mutate;
      rerender();
      const mutate2 = result.current.mutate;

      expect(mutate1).toBe(mutate2);
    });
  });
});

describe("useApiPost", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn().mockResolvedValue(mockJsonResponse({}));
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls fetch with POST method", async () => {
    const { result } = renderHook(() => useApiPost("/api/test"));

    await act(async () => {
      await result.current.mutate({});
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("useApiDelete", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn().mockResolvedValue(mock204Response());
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls fetch with DELETE method", async () => {
    const { result } = renderHook(() => useApiDelete("/api/test"));

    await act(async () => {
      await result.current.mutate();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

describe("useApiPatch", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn().mockResolvedValue(mockJsonResponse({}));
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls fetch with PATCH method", async () => {
    const { result } = renderHook(() => useApiPatch("/api/test"));

    await act(async () => {
      await result.current.mutate({});
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});

describe("useApiPut", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn().mockResolvedValue(mockJsonResponse({}));
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls fetch with PUT method", async () => {
    const { result } = renderHook(() => useApiPut("/api/test"));

    await act(async () => {
      await result.current.mutate({});
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({ method: "PUT" }),
    );
  });
});
