"use client";
/** Roster tab (plan §7.1): the selected committee's seat table. */
import React, { useContext, useMemo } from "react";
import { PrivilegeLevel } from "@prisma/client";

import { GlobalContext } from "~/components/providers/GlobalContext";
import { hasPermissionFor } from "~/lib/utils";
import type { SeatRosterRow } from "~/lib/validations/committee";
import { CommitteeSeatTable } from "../../CommitteeRosterTable";
import { RosterRowActionMenu } from "./roster/RosterRowActionMenu";
import { VacantSeatButton } from "./roster/VacantSeatButton";
import { committeeRefFrom } from "../committeeAction";
import { rosterRowActions } from "./roster/rowActions";
import type { CommitteeTabProps } from "./types";

/** Only when rendered outside `CommitteeTabs` (which always passes `onAction`). */
const noop = () => undefined;

/** e.g. "Actions for seat 2", "Add member for seat 2", "Actions for Sam Loose". */
function rowActionLabel(row: SeatRosterRow, action: string): string {
  if (row.seatNumber !== null) return `${action} for seat ${row.seatNumber}`;
  const name = row.occupant
    ? `${row.occupant.firstName} ${row.occupant.lastName}`.trim()
    : "unassigned member";
  return `${action} for ${name}`;
}

/** e.g. "seat-2", "member-V1": matches a row's control across refreshes. */
function rowKey(row: SeatRosterRow): string {
  return row.seatNumber !== null
    ? `seat-${row.seatNumber}`
    : `member-${row.occupant?.VRCNUM ?? ""}`;
}

export function RosterTab({ detail, onAction = noop }: CommitteeTabProps) {
  // Client visibility only (skills/auth-check-patterns). Contact is already
  // absent from `detail` below Admin; the acting privilege additionally hides
  // it from a Developer simulating a lower role.
  const { actingPermissions } = useContext(GlobalContext);
  const isAdmin = hasPermissionFor(actingPermissions, PrivilegeLevel.Admin);
  const committee = useMemo(
    () => committeeRefFrom(detail.committee),
    [detail.committee],
  );

  // A vacant seat's action sits beside the vacancy text; the pinned Actions
  // column holds only occupied rows' menus, so it stays icon-wide on phones.
  const renderVacancyAction = (row: SeatRosterRow) => {
    if (row.occupant !== null) return null;
    const [item] = rosterRowActions(row, committee, actingPermissions);
    if (!item) return null;
    return (
      <VacantSeatButton
        label={rowActionLabel(row, item.label)}
        rowKey={rowKey(row)}
        item={item}
        onAction={onAction}
      />
    );
  };

  const renderRowActions = (row: SeatRosterRow) => {
    if (row.occupant === null) return null;
    const items = rosterRowActions(row, committee, actingPermissions);
    if (items.length === 0) return null;
    return (
      <RosterRowActionMenu
        label={rowActionLabel(row, "Actions")}
        rowKey={rowKey(row)}
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
          renderVacancyAction={renderVacancyAction}
        />
      )}
    </section>
  );
}
