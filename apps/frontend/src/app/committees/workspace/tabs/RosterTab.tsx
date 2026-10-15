"use client";
/** Roster tab (plan §7.1): the selected committee's seat table. */
import React, { useContext, useMemo } from "react";
import { PrivilegeLevel } from "@prisma/client";

import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";
import type { SeatRosterRow } from "~/lib/validations/committee";
import { CommitteeSeatTable } from "../../CommitteeRosterTable";
import { RosterRowActionMenu } from "./roster/RosterRowActionMenu";
import { committeeRefFrom, rosterRowActions } from "./roster/rowActions";
import type { CommitteeTabProps } from "./types";

export type RosterTabProps = CommitteeTabProps;

/** Only when rendered outside `CommitteeTabs` (which always passes `onAction`). */
const noop = () => undefined;

function rowActionLabel(row: SeatRosterRow): string {
  if (row.seatNumber !== null) return `Actions for seat ${row.seatNumber}`;
  const name = row.occupant
    ? `${row.occupant.firstName} ${row.occupant.lastName}`.trim()
    : "unassigned member";
  return `Actions for ${name}`;
}

export function RosterTab({ detail, onAction = noop }: RosterTabProps) {
  // Client visibility only (skills/auth-check-patterns). Contact is already
  // absent from `detail` below Admin; the acting privilege additionally hides
  // it from a Developer simulating a lower role.
  const { actingPermissions } = useContext(GlobalContext);
  const isAdmin = hasPermissionFor(actingPermissions, PrivilegeLevel.Admin);
  const committee = useMemo(
    () => committeeRefFrom(detail.committee),
    [detail.committee],
  );

  const renderRowActions = (row: SeatRosterRow) => {
    const items = rosterRowActions(row, committee, actingPermissions);
    if (items.length === 0) return null;
    return (
      <RosterRowActionMenu
        label={rowActionLabel(row)}
        items={items}
        onAction={onAction}
      />
    );
  };

  return (
    <section aria-labelledby="roster-tab-heading" className="space-y-3 p-4">
      <h3 id="roster-tab-heading" className="text-base font-semibold">
        Roster
      </h3>
      {detail.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This committee has no seats or members yet.
        </p>
      ) : (
        <CommitteeSeatTable
          rows={detail.rows}
          isAdmin={isAdmin}
          label={`Seats for ${detail.committee.cityTown} LD ${detail.committee.legDistrict} ED ${detail.committee.electionDistrict}`}
          renderRowActions={renderRowActions}
        />
      )}
    </section>
  );
}
