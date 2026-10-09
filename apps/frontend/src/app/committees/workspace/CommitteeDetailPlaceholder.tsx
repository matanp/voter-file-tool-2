"use client";
/**
 * Placeholder for the detail pane (ticket 08 replaces this with
 * `CommitteeDetailPane`, loading `GET /api/committee/{id}/detail`). It renders
 * the selected committee's context from the grid row and the tab strip, so the
 * workspace's URL-driven selection and tab state are complete and testable.
 */
import React from "react";
import { ChevronLeft } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { EdRollup } from "~/lib/validations/committee";
import { formatTownName } from "./gridModel";
import {
  WORKSPACE_TABS,
  isWorkspaceTab,
  type WorkspaceTab,
} from "./workspaceUrlState";

const TAB_LABELS: Record<WorkspaceTab, string> = {
  roster: "Roster",
  pending: "Pending",
  seats: "Seats & Weight",
  history: "History",
};

export type CommitteeDetailPlaceholderProps = {
  /** Selected committee's grid row; null while it is still loading. */
  committee: EdRollup | null;
  /** True when an id is selected but its row has not loaded yet. */
  loading: boolean;
  tab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  /** Mobile only: return to the committee list. */
  onBack: () => void;
};

export function CommitteeDetailPlaceholder({
  committee,
  loading,
  tab,
  onTabChange,
  onBack,
}: CommitteeDetailPlaceholderProps) {
  if (!committee) {
    return (
      <div
        className="flex flex-1 items-center justify-center text-sm text-slate-500"
        role="status"
      >
        {loading ? "Loading committee…" : "Select a committee."}
      </div>
    );
  }

  return (
    <>
      <div className="border-b px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="mb-1 flex items-center text-xs text-slate-500 md:hidden"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden /> Back to committees
        </button>
        <h2 className="truncate text-xl font-semibold leading-tight">
          {formatTownName(committee.cityTown)} · ED {committee.electionDistrict}
        </h2>
        <p className="text-sm text-slate-500">
          LD {committee.legDistrict} · {committee.filled} of{" "}
          {committee.totalSeats} seats filled
        </p>
      </div>
      <Tabs
        value={tab}
        onValueChange={(v) => {
          if (isWorkspaceTab(v)) onTabChange(v);
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-b bg-transparent p-0 px-2">
          {WORKSPACE_TABS.map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className="rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-slate-900 data-[state=active]:shadow-none dark:data-[state=active]:border-slate-100"
            >
              {TAB_LABELS[t]}
            </TabsTrigger>
          ))}
        </TabsList>
        {WORKSPACE_TABS.map((t) => (
          <TabsContent key={t} value={t} className="m-0 p-4 text-sm text-slate-500">
            {TAB_LABELS[t]} details are not available yet.
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
