"use client";
/**
 * Debounced committee member name search (`GET /api/committee/memberSearch`).
 *
 * The query is normalized to its search words first; one that is too short
 * (`isSearchableMemberQuery`) never hits the server and reports `idle`. Each new query aborts the previous request,
 * and a result is shown only while it still answers the current query, so a
 * slow response can never replace a newer one.
 */
import { useEffect, useState } from "react";

import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import {
  isSearchableMemberQuery,
  memberSearchResponseSchema,
  memberSearchTerms,
  type MemberSearchHit,
} from "~/lib/validations/committee";

export const MEMBER_SEARCH_DEBOUNCE_MS = 250;

export type MemberSearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; hits: MemberSearchHit[]; truncated: boolean }
  | { status: "error"; error: string };

type Result = { q: string } & (
  | { ok: true; hits: MemberSearchHit[]; truncated: boolean }
  | { ok: false; error: string }
);

export function memberSearchUrl(q: string): string {
  return `/api/committee/memberSearch?q=${encodeURIComponent(q)}`;
}

export function useMemberSearch(query: string): MemberSearchState {
  const normalized = memberSearchTerms(query).join(" ");
  const active = isSearchableMemberQuery(normalized);
  const debounced = useDebouncedValue(normalized, MEMBER_SEARCH_DEBOUNCE_MS);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!isSearchableMemberQuery(debounced)) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch(memberSearchUrl(debounced), {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Search failed (status ${String(res.status)})`);
        }
        const body = memberSearchResponseSchema.parse(await res.json());
        setResult({ q: debounced, ok: true, ...body });
      } catch (error) {
        if (controller.signal.aborted) return;
        setResult({
          q: debounced,
          ok: false,
          error: error instanceof Error ? error.message : "Search failed",
        });
      }
    })();
    return () => controller.abort();
  }, [debounced]);

  if (!active) return { status: "idle" };
  if (result === null || result.q !== normalized) return { status: "loading" };
  return result.ok
    ? { status: "ready", hits: result.hits, truncated: result.truncated }
    : { status: "error", error: result.error };
}
