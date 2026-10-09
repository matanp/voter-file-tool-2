"use client";
import React from "react";
import { ChevronLeft } from "lucide-react";

import { formatTownName } from "./gridModel";

export type CommitteeIdentity = {
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
};

export type CommitteeContextHeaderProps = {
  /** The committee being shown; null while neither the grid row nor the detail has arrived. */
  committee: CommitteeIdentity | null;
  /** Below `md` only: return to the committee list. */
  onBack: () => void;
  /** Receives the `h2` so the pane can move focus to it (it is focusable by script only). */
  headingRef?: React.Ref<HTMLHeadingElement>;
};

/** Selected-committee context: the page's `h2`, plus **Back to committees** below `md`. */
export function CommitteeContextHeader({
  committee,
  onBack,
  headingRef,
}: CommitteeContextHeaderProps) {
  return (
    <div className="min-w-0 px-4 pt-3">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 mb-1 flex items-center rounded text-sm text-slate-600 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 md:hidden dark:text-slate-300"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden /> Back to committees
      </button>
      {committee && (
        <>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="truncate text-xl font-semibold leading-tight focus:outline-none"
          >
            {formatTownName(committee.cityTown)} · ED {committee.electionDistrict}
          </h2>
          <p className="text-sm text-slate-500">LD {committee.legDistrict}</p>
        </>
      )}
    </div>
  );
}
