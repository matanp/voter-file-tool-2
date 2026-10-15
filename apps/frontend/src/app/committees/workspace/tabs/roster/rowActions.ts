import { PrivilegeLevel } from "@prisma/client";

import { hasPermissionFor } from "~/lib/utils";
import type { SeatRosterRow } from "~/lib/validations/committee";
import type { CommitteeAction, CommitteeRef } from "../../committeeAction";

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
 * - Occupied (seated or unassigned):
 *   - Admin: **Record resignation** and **Remove member** (Admin-only
 *     endpoint). Replace is not offered to Admin until an atomic replace
 *     command exists (plan §8 "Replacement in v1").
 *   - Leader/RequestAccess: **Replace member** (submitted via `requestAdd`
 *     with the occupant as the replacement target).
 * - ReadAccess: nothing.
 */
export function rosterRowActions(
  row: SeatRosterRow,
  committee: CommitteeRef,
  actingPermissions: PrivilegeLevel,
): RosterRowActionItem[] {
  const isAdmin = hasPermissionFor(actingPermissions, PrivilegeLevel.Admin);
  const canSubmit = hasPermissionFor(
    actingPermissions,
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
  if (isAdmin) {
    return [
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
    {
      label: "Replace member",
      action: { kind: "replace-member", committee, memberId },
    },
  ];
}
