"use client";
import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Clock } from "lucide-react";

import type { EdRollup } from "~/lib/validations/committee";
import {
  formatTownName,
  openSeats,
  type CommitteeTownGroup,
} from "./gridModel";

export type CommitteeGridProps = {
  groups: CommitteeTownGroup[];
  selectedCommitteeId: number | null;
  onSelectCommittee: (committeeListId: number) => void;
};

/**
 * Committees grouped by town in collapsible sections. Rows are native buttons
 * (keyboard-selectable); status is spelled out in text, not color alone.
 * Plain DOM, no virtualization (plan §6).
 */
export function CommitteeGrid({
  groups,
  selectedCommitteeId,
  onSelectCommittee,
}: CommitteeGridProps) {
  const [collapsedTowns, setCollapsedTowns] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const toggleTown = (town: string) =>
    setCollapsedTowns((prev) => {
      const next = new Set(prev);
      if (next.has(town)) next.delete(town);
      else next.add(town);
      return next;
    });

  return (
    <div>
      {groups.map((group) => {
        const collapsed = collapsedTowns.has(group.town);
        const listId = `committee-grid-${group.town.replace(/\W+/g, "-")}`;
        return (
          <section key={group.town} aria-label={formatTownName(group.town)}>
            <button
              type="button"
              aria-expanded={!collapsed}
              aria-controls={listId}
              onClick={() => toggleTown(group.town)}
              className="sticky top-0 z-10 flex w-full items-center justify-between gap-2 border-b bg-slate-50 px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300"
            >
              <span className="flex items-center gap-1">
                {collapsed ? (
                  <ChevronRight className="h-3 w-3" aria-hidden />
                ) : (
                  <ChevronDown className="h-3 w-3" aria-hidden />
                )}
                {formatTownName(group.town)}
              </span>
              <span className="font-normal normal-case text-slate-500">
                {group.summary.edCount} EDs · {group.summary.vacant} open
                {group.summary.pendingCount > 0 &&
                  ` · ${group.summary.pendingCount} pending`}
              </span>
            </button>
            {!collapsed && (
              <ul id={listId}>
                {group.rollups.map((rollup) => (
                  <li key={rollup.committeeListId}>
                    <CommitteeGridRow
                      rollup={rollup}
                      showLegDistrict={group.multipleLegDistricts}
                      selected={rollup.committeeListId === selectedCommitteeId}
                      onSelect={onSelectCommittee}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function CommitteeGridRow({
  rollup,
  showLegDistrict,
  selected,
  onSelect,
}: {
  rollup: EdRollup;
  showLegDistrict: boolean;
  selected: boolean;
  onSelect: (committeeListId: number) => void;
}) {
  const open = openSeats(rollup);
  const missingWeight = rollup.missingWeightSeatNumbers.length;
  return (
    <button
      type="button"
      onClick={() => onSelect(rollup.committeeListId)}
      aria-current={selected ? "true" : undefined}
      data-committee-id={rollup.committeeListId}
      className={`flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-800 dark:hover:bg-slate-900 ${
        selected
          ? "bg-blue-50 shadow-[inset_3px_0_0_0_#2563eb] dark:bg-blue-950"
          : ""
      }`}
    >
      <span className="w-20 shrink-0 font-medium">
        <span className="sr-only">{formatTownName(rollup.cityTown)} </span>
        ED {rollup.electionDistrict}
        {showLegDistrict && (
          <span className="ml-1 text-xs font-normal text-slate-500">
            LD {rollup.legDistrict}
          </span>
        )}
      </span>
      <SeatDots filled={rollup.filled} total={rollup.totalSeats} />
      <span
        className={`shrink-0 tabular-nums ${
          open ? "text-slate-700 dark:text-slate-200" : "text-slate-400"
        }`}
      >
        {rollup.filled}/{rollup.totalSeats}
        <span className="sr-only"> seats filled</span>
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-1">
        {rollup.pendingCount > 0 && (
          <span
            className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 text-xs text-amber-900 dark:bg-amber-900 dark:text-amber-100"
            title={`${rollup.pendingCount} pending`}
          >
            <Clock className="h-3 w-3" aria-hidden />
            {rollup.pendingCount}
            <span className="sr-only"> pending</span>
          </span>
        )}
        {missingWeight > 0 && (
          <span title="Missing weight" className="inline-flex">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden />
            <span className="sr-only">Missing weight</span>
          </span>
        )}
        {rollup.unassignedCount > 0 && (
          <span
            className="rounded border px-1 text-[10px] text-slate-500"
            title="Unassigned members"
          >
            +{rollup.unassignedCount}
            <span className="sr-only"> unassigned</span>
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-slate-300 md:hidden" aria-hidden />
      </span>
    </button>
  );
}

function SeatDots({ filled, total }: { filled: number; total: number }) {
  return (
    <span className="flex shrink-0 gap-0.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${
            i < filled ? "bg-emerald-500" : "border border-slate-400"
          }`}
        />
      ))}
    </span>
  );
}
