"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { AUDIT_ACTION_LABELS } from "./auditUtils";
import type { AuditAction } from "@prisma/client";

type DetailEntry = {
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

interface AuditDetailDrawerProps {
  entryId: string | null;
  open: boolean;
  onClose: () => void;
}

function formatJson(value: unknown): string {
  if (value == null) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function AuditDetailDrawer({ entryId, open, onClose }: AuditDetailDrawerProps) {
  const [entry, setEntry] = useState<DetailEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/audit/${encodeURIComponent(id)}`);
      if (!res.ok) {
        throw new Error(res.status === 404 ? "Not found" : "Failed to load");
      }
      const data = (await res.json()) as DetailEntry;
      setEntry(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setEntry(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && entryId) {
      void fetchDetail(entryId);
    } else {
      setEntry(null);
      setError(null);
    }
  }, [open, entryId, fetchDetail]);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="pr-6">
            {entry
              ? `${AUDIT_ACTION_LABELS[entry.action] ?? entry.action} — ${format(new Date(entry.timestamp), "MMM d, yyyy h:mm a")}`
              : "Audit entry"}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {entry && !loading && (
            <>
              <div>
                <p className="text-xs font-medium text-muted-foreground">User</p>
                <p className="text-sm">{entry.user.name ?? entry.user.email}</p>
                <p className="text-xs text-muted-foreground">{entry.user.email}</p>
                <p className="text-xs text-muted-foreground">Role: {entry.userRole}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Entity</p>
                <p className="text-sm">{entry.entityType}</p>
                <p className="font-mono text-xs break-all" title={entry.entityId}>
                  {entry.entityId}
                </p>
              </div>
              {(entry.beforeValue != null || entry.afterValue != null) && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Before / After</p>
                  <div className="grid gap-2 sm:grid-cols-1">
                    {entry.beforeValue != null && (
                      <div>
                        <p className="text-xs font-medium mb-1">Before</p>
                        <pre className="rounded bg-muted p-2 text-xs overflow-x-auto max-h-48 overflow-y-auto">
                          {formatJson(entry.beforeValue)}
                        </pre>
                      </div>
                    )}
                    {entry.afterValue != null && (
                      <div>
                        <p className="text-xs font-medium mb-1">
                          {entry.beforeValue != null ? "After" : "Created"}
                        </p>
                        <pre className="rounded bg-muted p-2 text-xs overflow-x-auto max-h-48 overflow-y-auto">
                          {formatJson(entry.afterValue)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {entry.metadata != null && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Metadata</p>
                  <pre className="rounded bg-muted p-2 text-xs overflow-x-auto max-h-32 overflow-y-auto">
                    {formatJson(entry.metadata)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
