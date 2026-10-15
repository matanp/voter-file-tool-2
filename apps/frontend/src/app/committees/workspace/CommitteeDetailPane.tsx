"use client";
/**
 * The selected committee (plan §6): context header, summary, and tabs, fed by
 * the detail endpoint through `useCommitteeDetail` in `CommitteeWorkspace`.
 * The workspace keys this pane on the committee id, so nothing in it (focus,
 * scroll position, tab-local state) carries over between committees.
 *
 * The header shows as soon as either the grid row or the detail is available;
 * the summary and tab contents wait for the detail.
 */
import React, { useCallback, useRef } from "react";

import type { EdRollup } from "~/lib/validations/committee";
import type { CommitteeActionHandler } from "./committeeAction";
import {
  CommitteeContextHeader,
  type CommitteeIdentity,
} from "./CommitteeContextHeader";
import { CommitteeSummary } from "./CommitteeSummary";
import { CommitteeTabs } from "./CommitteeTabs";
import type { CommitteeDetailData } from "./useCommitteeDetail";
import type { WorkspaceTab } from "./workspaceUrlState";

export type CommitteeDetailPaneProps = {
  /** Selected `committeeListId`, or null when nothing is selected. */
  committeeId: number | null;
  /** The selection's grid row, when loaded: lets the header render before the detail. */
  committee: EdRollup | null;
  detail: CommitteeDetailData;
  tab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  /** Below `md` only: return to the committee list. */
  onBack: () => void;
  /** A roster action: the workspace opens the action drawer. */
  onAction: CommitteeActionHandler;
  /**
   * Move focus to the committee heading when it first renders. Used below
   * `md`, where the list the user selected from has just been hidden.
   */
  focusHeadingOnMount?: boolean;
};

export function CommitteeDetailPane({
  committeeId,
  committee,
  detail,
  tab,
  onTabChange,
  onBack,
  onAction,
  focusHeadingOnMount = false,
}: CommitteeDetailPaneProps) {
  const focused = useRef(false);
  const headingRef = useCallback(
    (el: HTMLHeadingElement | null) => {
      if (!el || focused.current || !focusHeadingOnMount) return;
      focused.current = true;
      el.focus();
    },
    [focusHeadingOnMount],
  );

  if (committeeId === null) {
    return (
      <p className="m-auto p-6 text-sm text-slate-500">Select a committee.</p>
    );
  }

  const identity: CommitteeIdentity | null =
    detail.status === "ready" ? detail.detail.committee : committee;

  if (!identity && detail.status !== "error") {
    return (
      <>
        <CommitteeContextHeader committee={null} onBack={onBack} />
        <p className="m-auto p-6 text-sm text-slate-500" role="status">
          Loading committee…
        </p>
      </>
    );
  }

  return (
    <CommitteeTabs
      committeeId={committeeId}
      detail={detail}
      tab={tab}
      onTabChange={onTabChange}
      onRetry={detail.reload}
      onRefresh={detail.reload}
      onAction={onAction}
      header={
        <>
          <CommitteeContextHeader
            committee={identity}
            onBack={onBack}
            headingRef={headingRef}
          />
          {detail.status === "ready" ? (
            <CommitteeSummary
              rollup={detail.detail.rollup}
              ltedWeight={detail.detail.committee.ltedWeight}
            />
          ) : (
            <div className="h-2" aria-hidden />
          )}
        </>
      }
    />
  );
}
