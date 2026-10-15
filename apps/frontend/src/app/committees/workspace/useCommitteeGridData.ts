"use client";
/**
 * Loads the workspace grid from `GET /api/committee/roster` (the grid read
 * model): the caller's whole scope, without seat rows, drained page by page via
 * the endpoint's cursor.
 *
 * Pagination decision (ticket 07): fetch the entire scope eagerly at the
 * endpoint's maximum page size and filter client-side. The first page renders
 * immediately and the header uses the endpoint's scope-wide `summary`, so
 * counts are complete before later pages arrive. Filters never refetch, so a
 * town/LD change is instant and invalid-selection recovery can be decided
 * against the full scope. Limits are recorded in the ticket's Comments.
 */
import { useCallback, useEffect, useState } from "react";
import {
  ROSTER_MAX_LIMIT,
  rosterResponseSchema,
  type EdRollup,
  type RosterFilters,
  type RosterSummary,
} from "~/lib/validations/committee";

/** Page size for the grid: the endpoint's ceiling, so Admin scope is a few pages. */
export const GRID_PAGE_SIZE = ROSTER_MAX_LIMIT;

export type CommitteeGridStatus =
  /** No page has arrived yet. */
  | "loading"
  /** At least one page shown; more pages are still being fetched. */
  | "loading-more"
  /** Every page loaded. */
  | "ready"
  | "error";

export type CommitteeGridData = {
  /** Every loaded rollup, in (town, LD, ED) order. */
  rollups: EdRollup[];
  /** Scope-wide totals from the endpoint (complete from the first page). */
  summary: RosterSummary | null;
  /** Filter values available to the caller. */
  scopeFilters: RosterFilters | null;
  status: CommitteeGridStatus;
  error: string | null;
  /** Reloads the grid from the first page (retry, or after a mutation). */
  reload: () => void;
};

export function gridPageUrl(cursor: number | null): string {
  const params = new URLSearchParams({
    includeRows: "false",
    limit: String(GRID_PAGE_SIZE),
  });
  if (cursor !== null) params.set("cursor", String(cursor));
  return `/api/committee/roster?${params.toString()}`;
}

async function fetchGridPage(cursor: number | null, signal: AbortSignal) {
  const response = await fetch(gridPageUrl(cursor), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    let message = `Failed to load committees (status ${response.status})`;
    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body.error === "string") message = body.error;
    } catch {
      // keep the status message
    }
    throw new Error(message);
  }
  return rosterResponseSchema.parse(await response.json());
}

export function useCommitteeGridData(): CommitteeGridData {
  const [rollups, setRollups] = useState<EdRollup[]>([]);
  const [summary, setSummary] = useState<RosterSummary | null>(null);
  const [scopeFilters, setScopeFilters] = useState<RosterFilters | null>(null);
  const [status, setStatus] = useState<CommitteeGridStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function drain() {
      setStatus("loading");
      setError(null);
      let cursor: number | null = null;
      let loaded: EdRollup[] = [];
      let first = true;
      try {
        do {
          const page = await fetchGridPage(cursor, signal);
          if (signal.aborted) return;
          loaded = [...loaded, ...page.edRollups];
          if (first) {
            setSummary(page.summary);
            setScopeFilters(page.filters);
            first = false;
          }
          setRollups(loaded);
          // Guard against a cursor that does not advance.
          cursor = page.nextCursor !== cursor ? page.nextCursor : null;
          setStatus(cursor === null ? "ready" : "loading-more");
        } while (cursor !== null);
      } catch (err) {
        if (signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load committees");
        setStatus("error");
      }
    }

    void drain();
    return () => controller.abort();
  }, [generation]);

  const reload = useCallback(() => setGeneration((g) => g + 1), []);

  return { rollups, summary, scopeFilters, status, error, reload };
}
