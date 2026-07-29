import { AuditAction } from "@prisma/client";
import type { ReadonlyURLSearchParams } from "next/navigation";

export const DEFAULT_AUDIT_PAGE = 1;
export const DEFAULT_AUDIT_PAGE_SIZE = 25;
export const MAX_AUDIT_PAGE_SIZE = 100;

export type AuditFilters = {
  page: number;
  pageSize: number;
  action: AuditAction | "";
  entityType: string;
  userId: string;
  dateFrom: string;
  dateTo: string;
};

export const DEFAULT_AUDIT_FILTERS: AuditFilters = {
  page: DEFAULT_AUDIT_PAGE,
  pageSize: DEFAULT_AUDIT_PAGE_SIZE,
  action: "",
  entityType: "",
  userId: "",
  dateFrom: "",
  dateTo: "",
};

const AUDIT_ACTION_VALUES = new Set<string>(Object.values(AuditAction));

/** Narrows an arbitrary string to a known AuditAction, or "" when unrecognized. */
export function toAuditAction(value: string): AuditAction | "" {
  return AUDIT_ACTION_VALUES.has(value) ? (value as AuditAction) : "";
}

/** Returns true when value is a valid ISO date string. */
function isValidIsoDate(value: string): boolean {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

/** Coerces a URL param to a page number (min 1). */
function parsePageParam(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? String(DEFAULT_AUDIT_PAGE), 10);
  if (Number.isNaN(parsed) || parsed < 1) return DEFAULT_AUDIT_PAGE;
  return parsed;
}

/** Coerces a URL param to a page size (clamped 1–100, default 25). */
function parsePageSizeParam(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? String(DEFAULT_AUDIT_PAGE_SIZE), 10);
  if (Number.isNaN(parsed)) return DEFAULT_AUDIT_PAGE_SIZE;
  return Math.min(MAX_AUDIT_PAGE_SIZE, Math.max(1, parsed));
}

/** Parses audit filter state from URL search params. */
export function parseAuditFilters(
  searchParams: URLSearchParams | ReadonlyURLSearchParams,
): AuditFilters {
  const action = toAuditAction(searchParams.get("action") ?? "");

  const rawDateFrom = searchParams.get("dateFrom") ?? "";
  const rawDateTo = searchParams.get("dateTo") ?? "";

  return {
    page: parsePageParam(searchParams.get("page")),
    pageSize: parsePageSizeParam(searchParams.get("pageSize")),
    action,
    entityType: searchParams.get("entityType") ?? "",
    userId: searchParams.get("userId") ?? "",
    dateFrom: isValidIsoDate(rawDateFrom) ? rawDateFrom : "",
    dateTo: isValidIsoDate(rawDateTo) ? rawDateTo : "",
  };
}

/** Serializes audit filters to URL search params, omitting defaults and empty values. */
export function serializeAuditFilters(filters: AuditFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.page > DEFAULT_AUDIT_PAGE) {
    params.set("page", String(filters.page));
  }
  if (filters.pageSize !== DEFAULT_AUDIT_PAGE_SIZE) {
    params.set("pageSize", String(filters.pageSize));
  }
  if (filters.action) {
    params.set("action", filters.action);
  }
  if (filters.entityType) {
    params.set("entityType", filters.entityType);
  }
  if (filters.userId) {
    params.set("userId", filters.userId);
  }
  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }
  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  return params;
}

/** Builds the list API endpoint for the given filters. */
export function buildAuditListEndpoint(filters: AuditFilters): string {
  const queryString = serializeAuditFilters(filters).toString();
  return `/api/admin/audit${queryString ? `?${queryString}` : ""}`;
}

/** Builds export query string (filters only — no pagination). */
export function buildAuditExportQuery(filters: AuditFilters): string {
  const params = new URLSearchParams();
  if (filters.action) params.set("action", filters.action);
  if (filters.entityType) params.set("entityType", filters.entityType);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  return params.toString();
}
