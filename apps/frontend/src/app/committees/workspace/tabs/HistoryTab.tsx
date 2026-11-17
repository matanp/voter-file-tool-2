"use client";
/**
 * History tab (plan §7.4, ticket 12). Two sections:
 *
 * - **Election outcomes** (Admin only): every petition candidate's result for
 *   the term, from `detail.petitionContext`. Rendered only when the acting
 *   role is Admin or above *and* the server sent the data.
 * - **Committee history**: the newest-first timeline from
 *   `detail.history.events`. `petition_outcome` events appear in it only for
 *   an acting Admin.
 *
 * The server already omits Admin-only data for Leaders; the `actingPermissions`
 * gate is defence in depth and keeps a Developer's acting-as view faithful.
 */
import React, { useContext } from "react";
import { PrivilegeLevel } from "@prisma/client";

import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";
import type { CommitteeTabProps } from "./types";
import { CommitteeHistoryTimeline } from "./history/CommitteeHistoryTimeline";
import { ElectionOutcomes } from "./history/ElectionOutcomes";
import { timelineEvents } from "./history/historyModel";

export function HistoryTab({ committeeId, detail }: CommitteeTabProps) {
  const { actingPermissions } = useContext(GlobalContext);
  const isAdmin = hasPermissionFor(actingPermissions, PrivilegeLevel.Admin);
  const events = timelineEvents(detail.history.events, isAdmin);

  return (
    <div className="space-y-6 p-4">
      {isAdmin && detail.petitionContext !== undefined && (
        <ElectionOutcomes
          committeeListId={committeeId}
          termId={detail.committee.termId}
          petitionContext={detail.petitionContext}
        />
      )}
      <CommitteeHistoryTimeline
        events={events}
        hasMore={detail.history.hasMore}
        showAdminDetail={isAdmin}
      />
    </div>
  );
}
