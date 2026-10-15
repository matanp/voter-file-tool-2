"use client";
import React, { useId } from "react";
import { PanelLeftClose, Search } from "lucide-react";

import { Input } from "~/components/ui/input";
import {
  formatTownName,
  type CommitteeGridFilters,
} from "./gridModel";

export type CommitteeFiltersProps = {
  /** Towns in the caller's scope. */
  towns: string[];
  /** LDs offered for the current town (or all LDs when no town is chosen). */
  legDistricts: number[];
  value: CommitteeGridFilters;
  onTownChange: (town: string | null) => void;
  onLegDistrictChange: (ld: number | null) => void;
  /** Local (non-URL) filters: search text and quick toggles. */
  onLocalChange: (
    patch: Partial<
      Pick<
        CommitteeGridFilters,
        "query" | "onlyOpenSeats" | "onlyPending" | "onlyMissingWeight"
      >
    >,
  ) => void;
  /** Desktop only: hide the committee list (the toggle renders when given). */
  onCollapse?: () => void;
  /** DOM id for the collapse toggle, so focus can return to it on expand. */
  collapseButtonId?: string;
};

const QUICK_FILTERS = [
  ["onlyOpenSeats", "Open seats"],
  ["onlyPending", "Pending"],
  ["onlyMissingWeight", "Missing weight"],
] as const;

export function CommitteeFilters({
  towns,
  legDistricts,
  value,
  onTownChange,
  onLegDistrictChange,
  onLocalChange,
  onCollapse,
  collapseButtonId,
}: CommitteeFiltersProps) {
  const id = useId();
  const selectClass =
    "h-9 min-w-0 rounded-md border bg-white px-2 text-sm dark:bg-slate-950";

  return (
    <div className="space-y-2 border-b p-3" role="search">
      <div className="flex gap-2">
        <label htmlFor={`${id}-town`} className="sr-only">
          Town
        </label>
        <select
          id={`${id}-town`}
          className={`${selectClass} flex-1`}
          value={value.town ?? ""}
          onChange={(e) => onTownChange(e.target.value || null)}
        >
          <option value="">All towns</option>
          {towns.map((t) => (
            <option key={t} value={t}>
              {formatTownName(t)}
            </option>
          ))}
        </select>
        <label htmlFor={`${id}-ld`} className="sr-only">
          Legislative district
        </label>
        <select
          id={`${id}-ld`}
          className={`${selectClass} w-28`}
          value={value.ld === null ? "" : String(value.ld)}
          onChange={(e) =>
            onLegDistrictChange(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">All LDs</option>
          {legDistricts.map((n) => (
            <option key={n} value={n}>
              LD {n}
            </option>
          ))}
        </select>
        {onCollapse && (
          <button
            id={collapseButtonId}
            type="button"
            onClick={onCollapse}
            aria-label="Hide committee list"
            aria-expanded
            aria-controls="committee-list-pane"
            title="Hide committee list"
            className="hidden shrink-0 rounded-md border px-2 text-slate-500 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 md:block dark:hover:bg-slate-900"
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
      <div className="relative">
        <Search
          className="absolute left-2 top-2.5 h-4 w-4 text-slate-400"
          aria-hidden
        />
        <Input
          aria-label="Search by ED number or town"
          className="h-9 pl-8"
          placeholder="ED number or town"
          value={value.query}
          onChange={(e) => onLocalChange({ query: e.target.value })}
        />
      </div>
      <div className="flex flex-wrap gap-1 text-xs">
        {QUICK_FILTERS.map(([key, label]) => {
          const on = value[key];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => onLocalChange({ [key]: !on })}
              className={`rounded-full border px-2 py-0.5 ${
                on
                  ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
