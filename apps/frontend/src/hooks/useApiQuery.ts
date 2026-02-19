import { useCallback, useEffect, useRef, useState } from "react";

export interface ApiQueryOptions<TData = unknown> {
  enabled?: boolean;
  timeout?: number;
  initialData?: TData;
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
  parseResponse?: (rawData: unknown) => TData;
}

export interface ApiQueryResult<TData = unknown> {
  data: TData | null;
  loading: boolean;
  error: string | null;
  refetch: (customEndpoint?: string) => Promise<TData>;
}

/**
 * Shared hook for GET API reads with loading/error state and retry via refetch.
 */
export const useApiQuery = <TData = unknown>(
  endpoint: string,
  options?: ApiQueryOptions<TData>,
): ApiQueryResult<TData> => {
  const [data, setData] = useState<TData | null>(
    options?.initialData ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const refetch = useCallback(
    async (customEndpoint?: string): Promise<TData> => {
      const url = customEndpoint ?? endpoint;
      const timeoutMs = optionsRef.current?.timeout ?? 10000;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorMessage = `Request failed with status ${response.status}`;

          try {
            const errorData = (await response.json()) as {
              error?: string;
              message?: string;
            };
            errorMessage = errorData.error ?? errorData.message ?? errorMessage;
          } catch {
            errorMessage = response.statusText.trim() || errorMessage;
          }

          throw new Error(errorMessage);
        }

        let result: TData;
        const contentType = response.headers.get("content-type");

        if (contentType?.includes("application/json")) {
          const rawData = (await response.json()) as unknown;
          result = optionsRef.current?.parseResponse
            ? optionsRef.current.parseResponse(rawData)
            : (rawData as TData);
        } else if (response.status === 204 || !response.body) {
          result = null as TData;
        } else {
          throw new Error(
            "Expected JSON response but received: " + contentType,
          );
        }

        setData(result);
        optionsRef.current?.onSuccess?.(result);
        return result;
      } catch (err) {
        clearTimeout(timeoutId);

        let errorMessage: string;
        let errorToThrow: Error;

        if (err instanceof Error && err.name === "AbortError") {
          errorMessage = "Request timed out";
          errorToThrow = new Error(errorMessage);
        } else {
          errorMessage =
            err instanceof Error ? err.message : "Unknown error occurred";
          errorToThrow = err instanceof Error ? err : new Error(errorMessage);
        }

        setError(errorMessage);
        optionsRef.current?.onError?.(errorToThrow);
        throw errorToThrow;
      } finally {
        setLoading(false);
      }
    },
    [endpoint],
  );

  useEffect(() => {
    if (optionsRef.current?.enabled === false) {
      return;
    }

    void refetch().catch(() => undefined);
  }, [refetch]);

  return {
    data,
    loading,
    error,
    refetch,
  };
};
