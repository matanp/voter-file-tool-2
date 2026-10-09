"use client";
/**
 * Loads the selected committee from `GET /api/committee/{id}/detail`.
 *
 * Stale requests (plan §6): when the selection changes, the previous request
 * is aborted, and every result is tagged with the committee id and generation
 * it was requested for. A result is shown only while it still matches the
 * current selection, so a slow response for an earlier committee can never
 * replace a later one, even if the abort loses a race with the response.
 *
 * `reload` refetches the same committee. A successful detail stays on screen
 * (with `refreshing: true`) until the new one arrives; a failed one turns back
 * into `loading`.
 */
import { useCallback, useEffect, useState } from "react";

import {
  committeeDetailResponseSchema,
  type CommitteeDetailResponse,
} from "~/lib/validations/committee";

export type CommitteeDetailState =
  /** No committee selected. */
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; detail: CommitteeDetailResponse; refreshing: boolean }
  | { status: "error"; error: string };

export type CommitteeDetailData = CommitteeDetailState & {
  /** Refetches the current committee (retry, or after a mutation). */
  reload: () => void;
};

type Result = {
  committeeId: number;
  generation: number;
} & (
  | { ok: true; detail: CommitteeDetailResponse }
  | { ok: false; error: string }
);

export function committeeDetailUrl(committeeId: number): string {
  return `/api/committee/${committeeId}/detail`;
}

async function fetchCommitteeDetail(
  committeeId: number,
  signal: AbortSignal,
): Promise<CommitteeDetailResponse> {
  const response = await fetch(committeeDetailUrl(committeeId), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    let message = `Failed to load committee (status ${response.status})`;
    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body.error === "string") message = body.error;
    } catch {
      // keep the status message
    }
    throw new Error(message);
  }
  return committeeDetailResponseSchema.parse(await response.json());
}

export function useCommitteeDetail(
  committeeId: number | null,
): CommitteeDetailData {
  const [generation, setGeneration] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (committeeId === null) return;
    const controller = new AbortController();
    const { signal } = controller;
    const tag = { committeeId, generation };

    fetchCommitteeDetail(committeeId, signal).then(
      (detail) => {
        if (!signal.aborted) setResult({ ...tag, ok: true, detail });
      },
      (err: unknown) => {
        if (signal.aborted) return;
        setResult({
          ...tag,
          ok: false,
          error: err instanceof Error ? err.message : "Failed to load committee",
        });
      },
    );
    return () => controller.abort();
  }, [committeeId, generation]);

  const reload = useCallback(() => setGeneration((g) => g + 1), []);

  return { ...deriveState(committeeId, generation, result), reload };
}

function deriveState(
  committeeId: number | null,
  generation: number,
  result: Result | null,
): CommitteeDetailState {
  if (committeeId === null) return { status: "idle" };
  if (!result || result.committeeId !== committeeId) return { status: "loading" };
  const current = result.generation === generation;
  if (result.ok) {
    return { status: "ready", detail: result.detail, refreshing: !current };
  }
  return current ? { status: "error", error: result.error } : { status: "loading" };
}
