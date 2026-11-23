import { PrivilegeLevel } from "@prisma/client";

import { hasPrivilegeFor } from "~/lib/utils";
import type { SeatRosterRow } from "~/lib/validations/committee";
import type { CandidateCommitteeRef, CommitteeAction } from "../../committeeAction";

/**
 * A row's `data-row-action` key, e.g. "seat-2", "member-V1": it matches the
 * row's control across refreshes, so focus can find it again.
 */
export function rosterRowKey(row: SeatRosterRow): string {
  return row.seatNumber !== null
    ? `seat-${row.seatNumber}`
    : `member-${row.occupant?.VRCNUM ?? ""}`;
}

/**
 * A row menu item. The Roster tab only *dispatches* its action (plan §8's
 * `CommitteeAction`); it never opens anything itself.
 */
export type RosterRowActionItem = {
  label: string;
  action: CommitteeAction;
};

/**
 * The row actions offered for `row` at the given *acting* privilege. This is
 * client visibility only (skills/auth-check-patterns): every action ends at an
 * endpoint that re-checks the actual session privilege.
 *
 * Mirrors today's `/committees` and plan §8:
 * - Vacant seat: Admin **Add member**; Leader/RequestAccess **Submit
 *   candidate** (both are `add-member`, the drawer picks add vs requestAdd).
 * - Occupied (seated or unassigned): **View voter details** first, then
 *   - Admin: **Record resignation** and **Remove member** (Admin-only
 *     endpoint). Replace is not offered to Admin until an atomic replace
 *     command exists (plan §8 "Replacement in v1").
 *   - Leader/RequestAccess: **Replace member** (submitted via `requestAdd`
 *     with the occupant as the replacement target) and **Report resignation
 *     or removal** (an Exit Report for Admin review), the latter only while
 *     the member has no pending report.
 * - ReadAccess: nothing.
 */
export function rosterRowActions(
  row: SeatRosterRow,
  committee: CandidateCommitteeRef,
  actingPrivilege: PrivilegeLevel,
): RosterRowActionItem[] {
  const isAdmin = hasPrivilegeFor(actingPrivilege, PrivilegeLevel.Admin);
  const canSubmit = hasPrivilegeFor(
    actingPrivilege,
    PrivilegeLevel.RequestAccess,
  );
  if (!canSubmit) return [];

  if (row.occupant === null) {
    if (row.seatNumber === null) return [];
    return [
      {
        label: isAdmin ? "Add member" : "Submit candidate",
        action: { kind: "add-member", committee, seatNumber: row.seatNumber },
      },
    ];
  }

  const memberId = row.occupant.VRCNUM;
  const viewDetails: RosterRowActionItem = {
    label: "View voter details",
    action: { kind: "view-voter-details", committee, memberId },
  };
  if (isAdmin) {
    return [
      viewDetails,
      {
        label: "Record resignation",
        action: { kind: "record-resignation", committee, memberId },
      },
      {
        label: "Remove member",
        action: { kind: "remove-member", committee, memberId },
      },
    ];
  }
  return [
    viewDetails,
    {
      label: "Replace member",
      action: { kind: "replace-member", committee, memberId },
    },
    ...(row.occupant.pendingExitReport
      ? []
      : [
          {
            label: "Report resignation or removal",
            action: { kind: "report-exit" as const, committee, memberId },
          },
        ]),
  ];
}
