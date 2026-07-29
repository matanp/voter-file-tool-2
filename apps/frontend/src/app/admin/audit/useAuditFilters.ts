"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import {
  buildAuditExportQuery,
  buildAuditListEndpoint,
  DEFAULT_AUDIT_FILTERS,
  parseAuditFilters,
  serializeAuditFilters,
  type AuditFilters,
} from "./auditFilterState";

type AuditFilterKey = Exclude<keyof AuditFilters, "page" | "pageSize">;
type DateAuditFilterKey = Extract<AuditFilterKey, "dateFrom" | "dateTo">;

function isDateFilterKey(key: AuditFilterKey): key is DateAuditFilterKey {
  return key === "dateFrom" || key === "dateTo";
}

function normalizeSearchParams(
  searchParams: URLSearchParams | ReadonlyURLSearchParams,
): string {
  return serializeAuditFilters(parseAuditFilters(searchParams)).toString();
}

/** Manages audit filter local state with URL sync and debounced date fields. */
export function useAuditFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<AuditFilters>(() =>
    parseAuditFilters(searchParams),
  );
  const [urlFilters, setUrlFilters] = useState<AuditFilters>(() =>
    parseAuditFilters(searchParams),
  );

  /** Query string this hook last intended the URL to hold. */
  const lastWrittenRef = useRef(normalizeSearchParams(searchParams));
  /** Writes sent to the router whose echo through `useSearchParams` is still in flight. */
  const pendingWritesRef = useRef<string[]>([]);
  /**
   * Query string an in-progress URL adoption is moving state to. Set while the
   * adopted `searchParams` have been seen but the resulting `urlFilters` update
   * has not rendered yet, so the write effect can tell "state is one commit
   * behind" from "the user changed something".
   */
  const adoptedQsRef = useRef<string | null>(null);

  /** Applies a user-driven change to both local and URL-bound filter state. */
  const commitFilters = useCallback(
    (update: (prev: AuditFilters) => AuditFilters) => {
      // A user action supersedes any adoption still settling.
      adoptedQsRef.current = null;
      setFilters(update);
      setUrlFilters(update);
    },
    [],
  );

  const debouncedDateFrom = useDebouncedValue(filters.dateFrom);
  const debouncedDateTo = useDebouncedValue(filters.dateTo);

  const queryString = useMemo(
    () => serializeAuditFilters(urlFilters).toString(),
    [urlFilters],
  );

  const listEndpoint = useMemo(
    () => buildAuditListEndpoint(urlFilters),
    [urlFilters],
  );

  const exportQueryString = useMemo(
    () => buildAuditExportQuery(filters),
    [filters],
  );

  useEffect(() => {
    const incoming = normalizeSearchParams(searchParams);

    // Router updates land asynchronously, so an older write can echo back after
    // a newer one has already been sent. Matching against the whole pending
    // queue (rather than only the most recent write) keeps those stale echoes
    // from being mistaken for external navigation and clobbering local state.
    const echoIndex = pendingWritesRef.current.indexOf(incoming);
    if (echoIndex !== -1) {
      pendingWritesRef.current.splice(0, echoIndex + 1);
      return;
    }

    if (incoming === lastWrittenRef.current) return;

    // Genuine external navigation (back/forward, pasted URL): it supersedes
    // anything we have in flight.
    pendingWritesRef.current = [];
    lastWrittenRef.current = incoming;
    adoptedQsRef.current = incoming;
    const parsed = parseAuditFilters(searchParams);
    setFilters(parsed);
    setUrlFilters(parsed);
  }, [searchParams]);

  useEffect(() => {
    const hasPendingDate =
      filters.dateFrom !== urlFilters.dateFrom ||
      filters.dateTo !== urlFilters.dateTo;
    const debounceCaughtUp =
      filters.dateFrom === debouncedDateFrom &&
      filters.dateTo === debouncedDateTo;

    if (!hasPendingDate || !debounceCaughtUp) return;

    // Committing a debounced date is a user-driven change like any other.
    adoptedQsRef.current = null;
    setFilters((prev) =>
      prev.dateFrom === filters.dateFrom && prev.dateTo === filters.dateTo
        ? { ...prev, page: DEFAULT_AUDIT_FILTERS.page }
        : prev,
    );
    setUrlFilters((prev) => ({
      ...prev,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      page: DEFAULT_AUDIT_FILTERS.page,
    }));
  }, [
    debouncedDateFrom,
    debouncedDateTo,
    filters.dateFrom,
    filters.dateTo,
    urlFilters.dateFrom,
    urlFilters.dateTo,
  ]);

  useEffect(() => {
    // An adoption is settling: `queryString` still reflects pre-adoption state
    // for one commit, and writing it here would undo the navigation we just
    // accepted. Wait for state to catch up, then stand down.
    if (adoptedQsRef.current !== null) {
      if (queryString !== adoptedQsRef.current) return;
      adoptedQsRef.current = null;
      return;
    }

    if (queryString === lastWrittenRef.current) return;
    lastWrittenRef.current = queryString;
    pendingWritesRef.current.push(queryString);
    router.replace(`/admin/audit${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    });
  }, [queryString, router]);

  const setFilter = useCallback(
    <K extends AuditFilterKey>(key: K, value: AuditFilters[K]) => {
      if (isDateFilterKey(key)) {
        setFilters((prev) => ({
          ...prev,
          [key]: value,
        }));
        return;
      }

      commitFilters((prev) => ({
        ...prev,
        [key]: value,
        page: DEFAULT_AUDIT_FILTERS.page,
      }));
    },
    [commitFilters],
  );

  const setPage = useCallback(
    (page: number) => {
      commitFilters((prev) => ({ ...prev, page }));
    },
    [commitFilters],
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      commitFilters((prev) => ({
        ...prev,
        pageSize,
        page: DEFAULT_AUDIT_FILTERS.page,
      }));
    },
    [commitFilters],
  );

  const clearFilters = useCallback(() => {
    commitFilters(() => DEFAULT_AUDIT_FILTERS);
  }, [commitFilters]);

  return {
    filters,
    queryString,
    listEndpoint,
    exportQueryString,
    setFilter,
    setPage,
    setPageSize,
    clearFilters,
  };
}
