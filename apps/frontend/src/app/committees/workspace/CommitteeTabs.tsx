"use client";
import React from "react";

import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { COMMITTEE_TABS } from "./tabs/registry";
import type { CommitteeDetailState } from "./useCommitteeDetail";
import {
  WORKSPACE_TABS,
  isWorkspaceTab,
  type WorkspaceTab,
} from "./workspaceUrlState";

export type CommitteeTabsProps = {
  committeeId: number;
  detail: CommitteeDetailState;
  tab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  /** Sticky content above the tab strip: the context header and summary. */
  header: React.ReactNode;
  /** Retry after a failed load. */
  onRetry: () => void;
  /** Passed to the tab as `onRefresh`. */
  onRefresh: () => void;
};

/**
 * The detail tabs (Radix: `tablist`/`tab`/`tabpanel`, arrow keys move between
 * tabs). It is also the detail pane's scroll container: the header and tab
 * strip stay pinned while the panel scrolls (plan §10). Only the active
 * panel mounts. Tab components come from `tabs/registry.ts` and receive
 * `CommitteeTabProps` once the detail has loaded; loading and failed states
 * are handled here, once, for every tab.
 */
export function CommitteeTabs({
  committeeId,
  detail,
  tab,
  onTabChange,
  header,
  onRetry,
  onRefresh,
}: CommitteeTabsProps) {
  return (
    <Tabs
      value={tab}
      onValueChange={(v) => {
        if (isWorkspaceTab(v)) onTabChange(v);
      }}
      className="min-h-0 min-w-0 flex-1 overflow-y-auto"
    >
      <div className="sticky top-0 z-10 border-b bg-white dark:bg-slate-950">
        {header}
        <TabsList
          aria-label="Committee sections"
          className="flex h-auto w-full justify-start gap-0 overflow-x-auto rounded-none bg-transparent p-0 px-2"
        >
          {WORKSPACE_TABS.map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className="shrink-0 rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-slate-900 data-[state=active]:shadow-none dark:data-[state=active]:border-slate-100"
            >
              {COMMITTEE_TABS[t].label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {WORKSPACE_TABS.map((t) => {
        const { Component } = COMMITTEE_TABS[t];
        return (
          <TabsContent key={t} value={t} className="m-0 min-w-0">
            {detail.status === "ready" ? (
              <Component
                committeeId={committeeId}
                detail={detail.detail}
                onRefresh={onRefresh}
              />
            ) : (
              <DetailStatus detail={detail} onRetry={onRetry} />
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

function DetailStatus({
  detail,
  onRetry,
}: {
  detail: CommitteeDetailState;
  onRetry: () => void;
}) {
  if (detail.status === "error") {
    return (
      <div role="alert" className="space-y-2 p-4 text-sm">
        <p className="text-red-700 dark:text-red-400">
          Could not load this committee: {detail.error}
        </p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }
  return (
    <p role="status" className="p-4 text-sm text-slate-500">
      Loading committee details…
    </p>
  );
}
