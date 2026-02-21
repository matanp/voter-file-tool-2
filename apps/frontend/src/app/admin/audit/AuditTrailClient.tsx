"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ComboboxDropdown } from "~/components/ui/ComboBox";
import { buildSummary, AUDIT_ACTION_LABELS, AUDIT_ENTITY_TYPES } from "./auditUtils";
import { AuditDetailDrawer } from "./AuditDetailDrawer";
import type { AuditAction } from "@prisma/client";

type AuditLogItem = {
  id: string;
  userId: string;
  userRole: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  timestamp: string;
  beforeValue: unknown;
  afterValue: unknown;
  metadata: unknown;
  user: { name: string | null; email: string };
};

type AuditListResponse = {
  items: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type AuditUsersResponse = {
  users: Array<{ id: string; name: string | null; email: string }>;
};

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const MAX_VISIBLE_PAGES = 5;

function useAuditList() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<AuditListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = searchParams.toString();

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/audit${queryString ? `?${queryString}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Unauthorized" : "Failed to load audit log");
      }
      const json = (await res.json()) as AuditListResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit log");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  return { data, loading, error, refetch: fetchList };
}

/** Fetches admin/leader users for the audit trail user filter dropdown. */
function useAuditUsers() {
  const [users, setUsers] = useState<AuditUsersResponse["users"]>([]);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/audit/users")
      .then((r) => r.json() as Promise<AuditUsersResponse>)
      .then((d) => {
        if (!cancelled) setUsers(d.users ?? []);
      })
      .catch((err) => {
        console.error("Failed to fetch audit users:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return users;
}

export function AuditTrailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, loading, error, refetch } = useAuditList();
  const users = useAuditUsers();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize =
    Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "25", 10) || 25)) ||
    25;
  const action = searchParams.get("action") ?? "";
  const entityType = searchParams.get("entityType") ?? "";
  const userId = searchParams.get("userId") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";

  const updateParams = useCallback(
    (updates: Record<string, string | number | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "" || value === "all") {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }
      next.set("page", "1");
      router.replace(`/admin/audit?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const setPage = useCallback(
    (newPage: number) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("page", String(newPage));
      router.replace(`/admin/audit?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const setPageSize = useCallback(
    (size: number) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("pageSize", String(size));
      next.set("page", "1");
      router.replace(`/admin/audit?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const clearFilters = useCallback(() => {
    router.replace("/admin/audit", { scroll: false });
  }, [router]);

  const handleExport = useCallback(
    async (format: "csv" | "xlsx") => {
      const params = new URLSearchParams();
      params.set("format", format);
      if (action) params.set("action", action);
      if (entityType) params.set("entityType", entityType);
      if (userId) params.set("userId", userId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      setExportLoading(true);
      try {
        const url = `/api/admin/audit/export?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error ?? "Export failed");
        }
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition");
        const match = disposition?.match(/filename="?([^";]+)"?/);
        const filename = match?.[1] ?? `audit-export.${format === "csv" ? "csv" : "xlsx"}`;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      } finally {
        setExportLoading(false);
      }
    },
    [action, entityType, userId, dateFrom, dateTo],
  );

  const userItems = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: u.name?.trim() ? `${u.name} (${u.email})` : u.email,
      })),
    [users],
  );

  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const getPageNumbers = useCallback(() => {
    if (totalPages <= MAX_VISIBLE_PAGES) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + MAX_VISIBLE_PAGES - 1);
    const from = Math.max(1, end - MAX_VISIBLE_PAGES + 1);
    return Array.from({ length: end - from + 1 }, (_, i) => from + i);
  }, [page, totalPages]);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:flex-wrap">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[160px]">
            <Label className="text-xs">Action</Label>
            <Select
              value={action || "all"}
              onValueChange={(v) => updateParams({ action: v === "all" ? undefined : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {(Object.entries(AUDIT_ACTION_LABELS) as [AuditAction, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px]">
            <Label className="text-xs">Entity type</Label>
            <Select
              value={entityType || "all"}
              onValueChange={(v) => updateParams({ entityType: v === "all" ? undefined : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {AUDIT_ENTITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px]">
            <Label className="text-xs">User</Label>
            <ComboboxDropdown
              items={userItems}
              initialValue={userId}
              displayLabel="All users"
              onSelect={(v) => updateParams({ userId: v })}
            />
          </div>
          <div className="flex items-end gap-2">
            <div>
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => updateParams({ dateFrom: e.target.value || undefined })}
                className="w-[140px]"
              />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => updateParams({ dateTo: e.target.value || undefined })}
                className="w-[140px]"
              />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
        <div className="flex items-center gap-2 md:ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={exportLoading}>
                <Download className="mr-1 h-4 w-4" />
                {exportLoading ? "Exporting…" : "Export"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void handleExport("csv")}>
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleExport("xlsx")}>
                XLSX
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-md border">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No audit entries match your filters.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[150px]">User</TableHead>
                  <TableHead className="w-[150px]">Action</TableHead>
                  <TableHead className="w-[120px]">Entity</TableHead>
                  <TableHead className="w-[100px]">Entity ID</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => {
                  const summary = buildSummary({
                    action: row.action,
                    entityType: row.entityType,
                    entityId: row.entityId,
                    beforeValue: row.beforeValue as Record<string, unknown> | null,
                    afterValue: row.afterValue as Record<string, unknown> | null,
                    metadata: row.metadata as Record<string, unknown> | null,
                  });
                  const ts = new Date(row.timestamp);
                  return (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(row.id)}
                    >
                      <TableCell className="w-[180px] text-muted-foreground">
                        {format(ts, "MMM d, yyyy, h:mm a")}
                      </TableCell>
                      <TableCell className="w-[150px]" title={row.user.email}>
                        {row.user.name ?? row.user.email}
                      </TableCell>
                      <TableCell className="w-[150px]">
                        {AUDIT_ACTION_LABELS[row.action] ?? row.action}
                      </TableCell>
                      <TableCell className="w-[120px]">{row.entityType}</TableCell>
                      <TableCell className="w-[100px] font-mono text-xs" title={row.entityId}>
                        {row.entityId.slice(0, 8)}
                        {row.entityId.length > 8 ? "…" : ""}
                      </TableCell>
                      <TableCell className="min-w-0">{summary}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2">
              <p className="text-sm text-muted-foreground">
                Showing {start}–{end} of {total} entries
              </p>
              <div className="flex items-center gap-2">
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(Number(v))}
                >
                  <SelectTrigger className="w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page <= 1}
                    onClick={() => setPage(1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {getPageNumbers().map((n) => (
                    <Button
                      key={n}
                      variant={page === n ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page >= totalPages}
                    onClick={() => setPage(totalPages)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <AuditDetailDrawer
        entryId={selectedId}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
