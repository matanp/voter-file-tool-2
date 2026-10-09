import { PrivilegeLevel } from "@prisma/client";

import { hasPermissionFor } from "~/lib/utils";
import type {
  CommitteeDetailResponse,
  SeatRosterRow,
} from "~/lib/validations/committee";

/**
 * The committee identity a row action carries: `committeeListId` plus the
 * composite key the mutation endpoints use (plan §3.11). Same shape as plan
 * §8's `CommitteeRef`.
 */
export type RosterCommitteeRef = {
  committeeListId: number;
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
};

/**
 * What a roster row asks the workspace to do. Deliberately identical to plan
 * §8's `CommitteeAction` union, which ticket 13 owns (with the drawer): 13 can
 * replace this alias with `CommitteeAction` without touching any producer.
 * `memberId` is the occupant's VRCNUM, which is what `/api/committee/remove`
 * and `requestAdd`'s replacement target key on today.
 *
 * The Roster tab only *dispatches* these; it never opens anything itself.
 */
export type RosterRowAction =
  | { kind: "add-member"; committee: RosterCommitteeRef; seatNumber?: number }
  | { kind: "replace-member"; committee: RosterCommitteeRef; memberId: string }
  | { kind: "remove-member"; committee: RosterCommitteeRef; memberId: string }
  | {
      kind: "record-resignation";
      committee: RosterCommitteeRef;
      memberId: string;
    };

export type RosterRowActionItem = {
  label: string;
  action: RosterRowAction;
};

export function committeeRefFrom(
  committee: CommitteeDetailResponse["committee"],
): RosterCommitteeRef {
  return {
    committeeListId: committee.committeeListId,
    cityTown: committee.cityTown,
    legDistrict: committee.legDistrict,
    electionDistrict: committee.electionDistrict,
  };
}

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
  committee: RosterCommitteeRef,
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
