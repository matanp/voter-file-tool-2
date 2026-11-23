import {
  useApiMutation,
  type ApiMutationOptions,
  type ApiMutationResult,
} from "~/hooks/useApiMutation";
import { trackReportRequested } from "~/lib/analytics";

/** The endpoint every report job is requested through. */
export const GENERATE_REPORT_ENDPOINT = "/api/generateReport";

/**
 * POST a report job to /api/generateReport. On success it records
 * `report_requested` in PostHog before calling `options.onSuccess`, so every
 * report form is counted. Use this instead of `useApiMutation` for that
 * endpoint.
 */
export function useGenerateReport<
  TPayload extends { type?: unknown; format?: unknown },
  TData extends { reportId?: string } = { reportId: string },
>(
  options?: ApiMutationOptions<TData, TPayload>,
): ApiMutationResult<TData, TPayload> {
  return useApiMutation<TData, TPayload>(GENERATE_REPORT_ENDPOINT, "POST", {
    ...options,
    onSuccess: (data, payload) => {
      trackReportRequested(data.reportId, payload);
      options?.onSuccess?.(data, payload);
    },
  });
}
