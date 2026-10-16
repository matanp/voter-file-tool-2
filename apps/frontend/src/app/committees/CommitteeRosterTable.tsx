"use client";

import React from "react";
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
import {
  SHOW_MEMBERSHIP_TYPE,
  seatPetitionDisplay,
} from "./workspace/tabs/roster/seatPetitionDisplay";

export interface CommitteeRosterTableProps {
  data: RosterResponse;
  isAdmin: boolean;
  /**
   * Invoked when a user clicks View details on an ED group header. Wiring lives
   * in CommitteeSelector (loads committee detail for that ED).
   */
  onViewEdDetails?: (rollup: EdRollup) => void;
}

/**
 * Renders a rollup's designation weight, mirroring CommitteeSummaryBlock's
 * "weight incomplete ≠ zero weight" rule: any missing-weight seat (or a null
 * weight) renders an em dash rather than a misleading number.
 */
export function formatRollupWeight(rollup: EdRollup): string {
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
 * Orders one committee's rows: seated rows by seat number, then unassigned
 * rows (active members with no seat) in their given order.
 */
function splitCommitteeRows(rows: SeatRosterRow[]): {
  seated: SeatRosterRow[];
  unassigned: SeatRosterRow[];
} {
  return {
    seated: rows
      .filter((row) => !row.unassigned)
      .sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0)),
    unassigned: rows.filter((row) => row.unassigned),
  };
}

/** Columns the optional membership Type column adds (0 while it is hidden). */
const MEMBERSHIP_TYPE_COLUMNS = SHOW_MEMBERSHIP_TYPE ? 1 : 0;

/** Sticky column labels pinned to the top of the viewport while scrolling. */
const STICKY_COLUMN_HEAD_CLASS = "sticky top-0 z-20 bg-background";

/**
 * Town-level committee roster: one row per seat (occupied or vacant) plus
 * unassigned-member rows, grouped by Election District. Pure presentational —
 * all data is precomputed server-side (see docs/COMMITTEE_ROSTER_VIEW.md).
 *
 * Contact (email/phone) renders only for Admins and only when the response
 * carries it (`row.contact !== undefined`); one server flip of `includeContact`
 * removes the column end-to-end.
 */
export function CommitteeRosterTable({
  data,
  isAdmin,
  onViewEdDetails,
}: CommitteeRosterTableProps) {
  const { edRollups, summary } = data;
  // `rows` is omitted when the caller asked for `includeRows=false`.
  const rows = data.rows ?? [];

  // Contact column appears only for Admins, and only when the response actually
  // carries contact on some row (spec §2: gate on `row.contact !== undefined`).
  const showContact = isAdmin && rows.some((row) => row.contact !== undefined);

  // Group rows by ED. Within a group: seated rows first (by seat number), then
  // unassigned rows. No cross-group global sort in v1 (would break grouping).
  const rowsByEd = new Map<string, SeatRosterRow[]>();
  for (const row of rows) {
    const key = edKey(row.legDistrict, row.electionDistrict);
    const bucket = rowsByEd.get(key);
    if (bucket) bucket.push(row);
    else rowsByEd.set(key, [row]);
  }

  // ED, Seat, Name, [Type], [Contact]
  const columnCount = 3 + MEMBERSHIP_TYPE_COLUMNS + (showContact ? 1 : 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground" data-testid="roster-summary">
        {summary.filled}/{summary.totalSeats} seats filled · {summary.vacant}{" "}
        vacant · {summary.edCount} {summary.edCount === 1 ? "ED" : "EDs"}
      </p>

      {/* overflow-visible so sticky th cells stick to the page, not the Table wrapper */}
      <div className="[&>div]:overflow-visible">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={STICKY_COLUMN_HEAD_CLASS}>ED</TableHead>
              <TableHead className={STICKY_COLUMN_HEAD_CLASS}>Seat</TableHead>
              <TableHead className={STICKY_COLUMN_HEAD_CLASS}>Name</TableHead>
              {SHOW_MEMBERSHIP_TYPE ? (
                <TableHead className={STICKY_COLUMN_HEAD_CLASS}>Type</TableHead>
              ) : null}
              {showContact ? (
                <TableHead className={STICKY_COLUMN_HEAD_CLASS}>
                  Contact
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {edRollups.map((rollup) => {
              const key = edKey(rollup.legDistrict, rollup.electionDistrict);
              const groupRows = rowsByEd.get(key) ?? [];
              const { seated: seatedRows, unassigned: unassignedRows } =
                splitCommitteeRows(groupRows);

              return (
                <React.Fragment key={key}>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableCell colSpan={columnCount} className="font-medium">
                      <div className="flex items-center justify-between gap-2">
                        <span>
                          ED {rollup.electionDistrict} · {rollup.filled}/
                          {rollup.totalSeats} filled · weight{" "}
                          {formatRollupWeight(rollup)}
                          {rollup.unassignedCount > 0
                            ? ` · ${rollup.unassignedCount} unassigned`
                            : ""}
                        </span>
                        {onViewEdDetails ? (
                          <button
                            type="button"
                            className="shrink-0 text-sm font-medium text-blue-600 hover:underline"
                            onClick={() => onViewEdDetails(rollup)}
                          >
                            View details
                          </button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>

                  {seatedRows.map((row) => (
                    <SeatRow
                      key={`${row.committeeListId}-seat-${row.seatNumber}`}
                      row={row}
                      showElectionDistrict
                      showContact={showContact}
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
                          showElectionDistrict
                          showContact={showContact}
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
    </div>
  );
}

export interface CommitteeSeatTableProps {
  /** One committee's rows (`detail.rows`): one per seat plus unassigned rows. */
  rows: SeatRosterRow[];
  /**
   * Acting privilege is Admin or above. Contact renders only when this is true
   * AND the response carries it (the server omits `contact` below Admin).
   */
  isAdmin: boolean;
  /** Accessible name for the table. */
  label: string;
  /**
   * Renders a row's action control, or null when the viewer has none for that
   * row. The Actions column appears only if some row renders one.
   */
  renderRowActions?: (row: SeatRosterRow) => React.ReactNode;
}

/**
 * The row-action column stays pinned to the table's right edge, so on narrow
 * screens (the detail pane at 768px, the full-width detail at 375px) a row's
 * action menu is visible without scrolling the table sideways (plan §10).
 */
const ACTIONS_STICKY_CLASS = "sticky right-0 z-[1]";

/**
 * Single-committee seat table (the workspace Roster tab, plan §7.1): seat,
 * member or vacancy, membership type (while SHOW_MEMBERSHIP_TYPE is on), contact
 * when authorized, and an optional per-row action column. Shares its row
 * rendering with the town roster above; there is no ED column or rollup header
 * because the committee is the scope.
 */
export function CommitteeSeatTable({
  rows,
  isAdmin,
  label,
  renderRowActions,
}: CommitteeSeatTableProps) {
  const showContact = isAdmin && rows.some((row) => row.contact !== undefined);
  const { seated, unassigned } = splitCommitteeRows(rows);
  const actions = new Map<SeatRosterRow, React.ReactNode>();
  for (const row of rows) {
    const node = renderRowActions?.(row) ?? null;
    if (node !== null) actions.set(row, node);
  }
  const showActions = actions.size > 0;
  const columnCount =
    2 + MEMBERSHIP_TYPE_COLUMNS + (showContact ? 1 : 0) + (showActions ? 1 : 0);

  const renderRow = (row: SeatRosterRow, key: string) => (
    <SeatRow
      key={key}
      row={row}
      showElectionDistrict={false}
      showContact={showContact}
      actions={showActions ? (actions.get(row) ?? null) : undefined}
    />
  );

  return (
    // `Table` wraps itself in an `overflow-auto` box, so wide content scrolls
    // inside the tab and the page never overflows at 375px.
    <Table aria-label={label}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Seat</TableHead>
          <TableHead>Member</TableHead>
          {SHOW_MEMBERSHIP_TYPE ? <TableHead>Type</TableHead> : null}
          {showContact ? <TableHead>Contact</TableHead> : null}
          {showActions ? (
            <TableHead className={`w-12 ${ACTIONS_STICKY_CLASS} bg-white dark:bg-slate-950`}>
              <span className="sr-only">Actions</span>
            </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {seated.map((row) =>
          renderRow(row, `seat-${row.seatNumber ?? "none"}`),
        )}
        {unassigned.length > 0 ? (
          <>
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columnCount}
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Unassigned
              </TableCell>
            </TableRow>
            {unassigned.map((row, i) =>
              renderRow(row, `unassigned-${row.occupant?.VRCNUM ?? i}`),
            )}
          </>
        ) : null}
      </TableBody>
    </Table>
  );
}

interface SeatRowProps {
  row: SeatRosterRow;
  showElectionDistrict: boolean;
  showContact: boolean;
  /** undefined: no Actions column; null: column present, nothing for this row. */
  actions?: React.ReactNode;
}

function SeatRow({
  row,
  showElectionDistrict,
  showContact,
  actions,
}: SeatRowProps) {
  const name = row.occupant
    ? `${row.occupant.firstName} ${row.occupant.lastName}`.trim()
    : null;
  // Every petitioned/appointed display goes through this one helper
  // (leader-petition-visibility group C is unresolved).
  const petition = seatPetitionDisplay(row);

  return (
    <TableRow
      className={
        petition.petitionedVacant
          ? "bg-amber-50 dark:bg-amber-950/30"
          : undefined
      }
    >
      {showElectionDistrict ? (
        <TableCell>{row.electionDistrict}</TableCell>
      ) : null}
      <TableCell>{row.seatNumber ?? "—"}</TableCell>
      <TableCell>
        {petition.vacancyLabel !== null ? (
          <span className="text-muted-foreground">{petition.vacancyLabel}</span>
        ) : (
          name
        )}
      </TableCell>
      {SHOW_MEMBERSHIP_TYPE ? (
        <TableCell>{petition.membershipTypeLabel}</TableCell>
      ) : null}
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
      {actions !== undefined ? (
        <TableCell
          className={`text-right ${ACTIONS_STICKY_CLASS} ${
            petition.petitionedVacant
              ? "bg-amber-50 dark:bg-amber-950"
              : "bg-white dark:bg-slate-950"
          }`}
        >
          {actions}
        </TableCell>
      ) : null}
    </TableRow>
  );
}
