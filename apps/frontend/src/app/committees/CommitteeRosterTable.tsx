"use client";

import React from "react";
import type { MembershipType } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type {
  EdRollup,
  RosterResponse,
  SeatRosterRow,
} from "~/lib/validations/committee";

export interface CommitteeRosterTableProps {
  data: RosterResponse;
  isAdmin: boolean;
  /**
   * Invoked when an Admin clicks a row's Edit link. Wiring lives in
   * CommitteeSelector (switches to drill-down + loads the committee). Optional
   * so this presentational component renders standalone (e.g. in unit tests).
   */
  onEditRow?: (row: SeatRosterRow) => void;
}

const MEMBERSHIP_TYPE_LABEL: Record<MembershipType, string> = {
  PETITIONED: "Petitioned",
  APPOINTED: "Appointed",
};

function formatMembershipType(type: MembershipType | null): string {
  return type ? MEMBERSHIP_TYPE_LABEL[type] : "—";
}

/**
 * Renders a rollup's designation weight, mirroring CommitteeSummaryBlock's
 * "weight incomplete ≠ zero weight" rule: any missing-weight seat (or a null
 * weight) renders an em dash rather than a misleading number.
 */
function formatRollupWeight(rollup: EdRollup): string {
  if (
    rollup.designationWeight === null ||
    rollup.missingWeightSeatNumbers.length > 0
  ) {
    return "—";
  }
  return rollup.designationWeight.toFixed(2);
}

/** Stable group key for an ED within a (possibly multi-LD) scope. */
function edKey(legDistrict: number, electionDistrict: number): string {
  return `${legDistrict}-${electionDistrict}`;
}

/**
 * Town-level committee roster: one row per seat (occupied or vacant) plus
 * unassigned-member rows, grouped by Election District. Pure presentational —
 * all data is precomputed server-side (see docs/COMMITTEE_ROSTER_VIEW.md).
 *
 * Contact (email/phone) renders only for Admins and only when the response
 * carries it (`row.contact !== undefined`); one server flip of `includeContact`
 * removes the column end-to-end. The Edit affordance is Admin-only.
 */
export function CommitteeRosterTable({
  data,
  isAdmin,
  onEditRow,
}: CommitteeRosterTableProps) {
  const { rows, edRollups, summary } = data;

  // Contact column appears only for Admins, and only when the response actually
  // carries contact on some row (spec §2: gate on `row.contact !== undefined`).
  const showContact =
    isAdmin && rows.some((row) => row.contact !== undefined);
  const showActions = isAdmin;

  // Group rows by ED. Within a group: seated rows first (by seat number), then
  // unassigned rows. No cross-group global sort in v1 (would break grouping).
  const rowsByEd = new Map<string, SeatRosterRow[]>();
  for (const row of rows) {
    const key = edKey(row.legDistrict, row.electionDistrict);
    const bucket = rowsByEd.get(key);
    if (bucket) bucket.push(row);
    else rowsByEd.set(key, [row]);
  }

  const columnCount =
    4 + (showContact ? 1 : 0) + (showActions ? 1 : 0); // ED, Seat, Name, Type

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground" data-testid="roster-summary">
        {summary.filled}/{summary.totalSeats} seats filled · {summary.vacant}{" "}
        vacant · {summary.edCount} {summary.edCount === 1 ? "ED" : "EDs"}
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ED</TableHead>
            <TableHead>Seat</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            {showContact ? <TableHead>Contact</TableHead> : null}
            {showActions ? (
              <TableHead className="text-right">Actions</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {edRollups.map((rollup) => {
            const key = edKey(rollup.legDistrict, rollup.electionDistrict);
            const groupRows = rowsByEd.get(key) ?? [];
            const seatedRows = groupRows
              .filter((row) => !row.unassigned)
              .sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0));
            const unassignedRows = groupRows.filter((row) => row.unassigned);

            return (
              <React.Fragment key={key}>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableCell
                    colSpan={columnCount}
                    className="sticky top-0 font-medium"
                  >
                    ED {rollup.electionDistrict} · {rollup.filled}/
                    {rollup.totalSeats} filled · weight{" "}
                    {formatRollupWeight(rollup)}
                    {rollup.unassignedCount > 0
                      ? ` · ${rollup.unassignedCount} unassigned`
                      : ""}
                  </TableCell>
                </TableRow>

                {seatedRows.map((row) => (
                  <SeatRow
                    key={`${row.committeeListId}-seat-${row.seatNumber}`}
                    row={row}
                    showContact={showContact}
                    showActions={showActions}
                    onEditRow={onEditRow}
                  />
                ))}

                {unassignedRows.length > 0 ? (
                  <>
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={columnCount}
                        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        Unassigned
                      </TableCell>
                    </TableRow>
                    {unassignedRows.map((row, i) => (
                      <SeatRow
                        key={`${row.committeeListId}-unassigned-${row.occupant?.VRCNUM ?? i}`}
                        row={row}
                        showContact={showContact}
                        showActions={showActions}
                        onEditRow={onEditRow}
                      />
                    ))}
                  </>
                ) : null}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

interface SeatRowProps {
  row: SeatRosterRow;
  showContact: boolean;
  showActions: boolean;
  onEditRow?: (row: SeatRosterRow) => void;
}

function SeatRow({ row, showContact, showActions, onEditRow }: SeatRowProps) {
  const isVacant = row.occupant === null;
  const name = row.occupant
    ? `${row.occupant.firstName} ${row.occupant.lastName}`.trim()
    : null;

  return (
    <TableRow className={row.petitionedVacant ? "bg-amber-50" : undefined}>
      <TableCell>{row.electionDistrict}</TableCell>
      <TableCell>{row.seatNumber ?? "—"}</TableCell>
      <TableCell>
        {isVacant ? (
          <span className="text-muted-foreground">
            {row.petitionedVacant ? "— petitioned vacant —" : "— vacant —"}
          </span>
        ) : (
          name
        )}
      </TableCell>
      <TableCell>{formatMembershipType(row.occupant?.membershipType ?? null)}</TableCell>
      {showContact ? (
        <TableCell className="text-sm text-muted-foreground">
          {row.contact ? (
            <div className="flex flex-col">
              <span>{row.contact.email ?? "—"}</span>
              <span>{row.contact.phone ?? "—"}</span>
            </div>
          ) : (
            "—"
          )}
        </TableCell>
      ) : null}
      {showActions ? (
        <TableCell className="text-right">
          {onEditRow ? (
            <button
              type="button"
              className="text-sm font-medium text-blue-600 hover:underline"
              onClick={() => onEditRow(row)}
            >
              Edit
            </button>
          ) : null}
        </TableCell>
      ) : null}
    </TableRow>
  );
}
