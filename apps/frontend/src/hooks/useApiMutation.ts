import { useState, useCallback } from "react";

export interface ApiMutationOptions<TData = unknown, TPayload = unknown> {
  onSuccess?: (data: TData, payload?: TPayload) => void;
  onError?: (error: Error) => void;
  onFinally?: () => void;
  timeout?: number; // Timeout in milliseconds (default: 10000ms)
}

export interface ApiMutationResult<TData = unknown, TPayload = unknown> {
  mutate: (data?: TPayload, customEndpoint?: string) => Promise<TData>;
  loading: boolean;
  error: string | null;
  data: TData | null;
  reset: () => void;
}

/**
 * Custom hook for handling API mutations (POST, PUT, PATCH, DELETE)
 * Centralizes common patterns for API calls with loading states and error handling
 *
 * @param endpoint - The API endpoint URL
 * @param method - HTTP method (defaults to 'POST')
 * @param options - Optional callbacks for success, error, and finally
 * @returns Object with mutate function, loading state, error state, data, and reset function
 */
export const useApiMutation = <TData = unknown, TPayload = unknown>(
  endpoint: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST",
  options?: ApiMutationOptions<TData, TPayload>,
): ApiMutationResult<TData, TPayload> => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TData | null>(null);

  const mutate = useCallback(
    async (payload?: TPayload, customEndpoint?: string): Promise<TData> => {
      setLoading(true);
      setError(null);

      const url = customEndpoint ?? endpoint;
      const timeoutMs = options?.timeout ?? 10000;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      try {
        const headers =
          payload != null ? { "Content-Type": "application/json" } : undefined;
        const response = await fetch(url, {
          method,
          headers,
          body: payload ? JSON.stringify(payload) : undefined,
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
            // If response is not JSON, use the status text
            errorMessage = response.statusText.trim() || errorMessage;
          }

          throw new Error(errorMessage);
        }

        const result = (await response.json()) as TData;
        setData(result);

        options?.onSuccess?.(result, payload);
        return result;
      } catch (err) {
        // Clear timeout in case of error
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
        options?.onError?.(errorToThrow);
        throw errorToThrow;
      } finally {
        setLoading(false);
        options?.onFinally?.();
      }
    },
    [endpoint, method, options],
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    mutate,
    loading,
    error,
    data,
    reset,
  };
};

/**
 * Specialized hook for POST operations
 * @param endpoint - The API endpoint URL
 * @param options - Optional callbacks
 */
export const useApiPost = <TData = unknown, TPayload = unknown>(
  endpoint: string,
  options?: ApiMutationOptions<TData, TPayload>,
) => useApiMutation<TData, TPayload>(endpoint, "POST", options);

/**
 * Specialized hook for DELETE operations
 * @param endpoint - The API endpoint URL
 * @param options - Optional callbacks
 */
export const useApiDelete = <TData = unknown, TPayload = unknown>(
  endpoint: string,
  options?: ApiMutationOptions<TData, TPayload>,
) => useApiMutation<TData, TPayload>(endpoint, "DELETE", options);

/**
 * Specialized hook for PATCH operations
 * @param endpoint - The API endpoint URL
 * @param options - Optional callbacks
 */
export const useApiPatch = <TData = unknown, TPayload = unknown>(
  endpoint: string,
  options?: ApiMutationOptions<TData, TPayload>,
) => useApiMutation<TData, TPayload>(endpoint, "PATCH", options);

/**
 * Specialized hook for PUT operations
 * @param endpoint - The API endpoint URL
 * @param options - Optional callbacks
 */
export const useApiPut = <TData = unknown, TPayload = unknown>(
  endpoint: string,
  options?: ApiMutationOptions<TData, TPayload>,
) => useApiMutation<TData, TPayload>(endpoint, "PUT", options);
