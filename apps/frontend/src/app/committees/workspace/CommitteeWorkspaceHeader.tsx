"use client";
import React, { useContext } from "react";
import Link from "next/link";
import { PrivilegeLevel } from "@prisma/client";

import { Button } from "~/components/ui/button";
import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";
import type { RosterSummary } from "~/lib/validations/committee";

export type CommitteeWorkspaceHeaderProps = {
  /** Active term label, e.g. "2024–2026". */
  termLabel: string;
  /** Scope-wide totals; null until the grid's first page arrives. */
  summary: RosterSummary | null;
};

/**
 * Page title, scope-wide counts, and Admin-only shortcuts. The shortcuts are
 * client visibility only, so they follow `actingPermissions` (see
 * skills/auth-check-patterns); the pages they link to enforce real privilege.
 */
export function CommitteeWorkspaceHeader({
  termLabel,
  summary,
}: CommitteeWorkspaceHeaderProps) {
  const { actingPermissions } = useContext(GlobalContext);
  const showAdminControls = hasPermissionFor(
    actingPermissions,
    PrivilegeLevel.Admin,
  );

  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold leading-tight">Committees</h1>
        <p className="text-xs text-slate-500" aria-live="polite">
          {termLabel}
          {summary && (
            <>
              {" · "}
              {summary.edCount} committees · {summary.vacant} open seats ·{" "}
              {summary.pendingCount} pending
              {summary.unassignedCount > 0 &&
                ` · ${summary.unassignedCount} unassigned`}
            </>
          )}
        </p>
      </div>
      {showAdminControls && (
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/committees/requests">Review pending</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/committee-roster-reports">Generate report</Link>
          </Button>
        </div>
      )}
    </header>
  );
}
