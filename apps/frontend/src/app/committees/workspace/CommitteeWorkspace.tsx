"use client";
/**
 * Committee Operations Workspace (plan §6), rendered by `committees/page.tsx`
 * when `COMMITTEES_WORKSPACE=1`. Owns only: filters, the selected committee
 * id, the selected tab, and loading/error coordination. (The open action
 * arrives with the action drawer, ticket 13.)
 *
 * URL is the source of truth for `committee`, `tab`, `town`, and `ld`:
 * - committee selection is `router.push` (back/forward moves between
 *   committees); filter and tab changes are `router.replace`.
 * - a committee in the URL is restored if visible; otherwise, once the whole
 *   grid has loaded, it is cleared. With no valid committee, desktop selects
 *   the first visible row (without writing it to the URL) and mobile shows
 *   the list.
 * - a town/LD outside the caller's scope is cleared once scope is known.
 * - a Leader whose scope is a single (town, LD) starts with it applied.
 *
 * Detail: the selected committee loads from the detail endpoint
 * (`useCommitteeDetail`, which aborts and ignores stale requests). Desktop
 * shows list and detail side by side, with a toggle that collapses the list;
 * below `md` the `committee` param alone switches list ↔ detail.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PanelLeftOpen } from "lucide-react";

import type { CommitteeScope } from "../committeeScope";
import { CommitteeDetailPane } from "./CommitteeDetailPane";
import { CommitteeEmptyScope } from "./CommitteeEmptyScope";
import { CommitteeGridPane } from "./CommitteeGridPane";
import { CommitteeWorkspaceHeader } from "./CommitteeWorkspaceHeader";
import {
  EMPTY_GRID_FILTERS,
  filterRollups,
  groupRollupsByTown,
  legDistrictsForTown,
  reconcileUrlState,
  type CommitteeGridFilters,
} from "./gridModel";
import { useCommitteeDetail } from "./useCommitteeDetail";
import { useCommitteeGridData } from "./useCommitteeGridData";
import { useHeightBelowNav } from "./useHeightBelowNav";
import { useIsDesktop } from "./useIsDesktop";
import {
  buildWorkspaceHref,
  parseWorkspaceUrlState,
  type WorkspaceTab,
  type WorkspaceUrlPatch,
} from "./workspaceUrlState";

export type CommitteeWorkspaceProps = {
  /** Active term label for the header. */
  termLabel: string;
  /**
   * Leader single-scope shortcut (`singleCommitteeScope`): applied as the
   * town/LD filters when the URL carries neither. Null for everyone else.
   */
  initialScope: CommitteeScope | null;
};

const COLLAPSE_LIST_ID = "committee-list-collapse";
const EXPAND_LIST_ID = "committee-list-expand";

type LocalFilters = Pick<
  CommitteeGridFilters,
  "query" | "onlyOpenSeats" | "onlyPending" | "onlyMissingWeight"
>;

export function CommitteeWorkspace({
  termLabel,
  initialScope,
}: CommitteeWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/committees";
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktop();
  const height = useHeightBelowNav();
  const grid = useCommitteeGridData();

  const url = parseWorkspaceUrlState(searchParams);

  // --- URL writes ----------------------------------------------------------
  // Writes build on the latest params we know of — including writes whose
  // echo through useSearchParams has not landed yet — so two writes in one
  // commit (e.g. the Leader shortcut and a recovery) do not clobber each other.
  const latestParams = useRef(new URLSearchParams(searchParams?.toString()));
  useEffect(() => {
    latestParams.current = new URLSearchParams(searchParams?.toString());
  }, [searchParams]);

  const writeUrl = useCallback(
    (patch: WorkspaceUrlPatch, mode: "push" | "replace") => {
      const href = buildWorkspaceHref(pathname, latestParams.current, patch);
      latestParams.current = new URL(href, "http://workspace.local").searchParams;
      router[mode](href, { scroll: false });
    },
    [pathname, router],
  );

  // Leader single-scope shortcut: once, on arrival without town/LD filters.
  const appliedInitialScope = useRef(false);
  useEffect(() => {
    if (appliedInitialScope.current) return;
    appliedInitialScope.current = true;
    if (initialScope && url.town === null && url.ld === null) {
      writeUrl(
        { town: initialScope.cityTown, ld: initialScope.legDistrict },
        "replace",
      );
    }
  }, [initialScope, url.town, url.ld, writeUrl]);

  // --- Filters -------------------------------------------------------------
  const [localFilters, setLocalFilters] = useState<LocalFilters>(EMPTY_GRID_FILTERS);
  const scope = grid.scopeFilters;

  // URL filters outside the caller's scope are ignored now and cleared below.
  const town =
    scope && url.town !== null && !scope.towns.includes(url.town)
      ? null
      : url.town;
  const ldOptions = useMemo(
    () => (scope ? legDistrictsForTown(scope, town) : []),
    [scope, town],
  );
  const ld =
    scope && url.ld !== null && !ldOptions.includes(url.ld) ? null : url.ld;

  const visible = useMemo(
    () => filterRollups(grid.rollups, { ...localFilters, town, ld }),
    [grid.rollups, localFilters, town, ld],
  );
  const groups = useMemo(() => groupRollupsByTown(visible), [visible]);

  // --- Selection -----------------------------------------------------------
  const gridComplete = grid.status === "ready";
  const urlCommittee =
    url.committeeId === null
      ? null
      : (visible.find((r) => r.committeeListId === url.committeeId) ?? null);
  // A URL committee is kept while the grid is still loading (it may be on a
  // later page); once complete, only a visible one counts.
  const urlSelectionHolds =
    url.committeeId !== null && (urlCommittee !== null || !gridComplete);
  const selectedCommitteeId = urlSelectionHolds
    ? url.committeeId
    : isDesktop
      ? (visible[0]?.committeeListId ?? null)
      : null;
  const selectedCommittee =
    visible.find((r) => r.committeeListId === selectedCommitteeId) ?? null;
  const showingDetailOnMobile = url.committeeId !== null;

  // Invalid-selection recovery: decide against the full scope only.
  useEffect(() => {
    if (!gridComplete || !scope) return;
    const patch = reconcileUrlState(
      { committeeId: url.committeeId, town: url.town, ld: url.ld },
      scope,
      visible,
    );
    if (patch) writeUrl(patch, "replace");
  }, [gridComplete, scope, url.committeeId, url.town, url.ld, visible, writeUrl]);

  const selectCommittee = useCallback(
    (committeeListId: number) => {
      if (committeeListId === url.committeeId) return;
      writeUrl({ committee: committeeListId }, "push");
    },
    [url.committeeId, writeUrl],
  );
  const setTab = useCallback(
    (tab: WorkspaceTab) => writeUrl({ tab }, "replace"),
    [writeUrl],
  );

  // --- Detail ----------------------------------------------------------------
  const detail = useCommitteeDetail(selectedCommitteeId);

  // Mobile Back: return to the list and put focus back on the row it came from.
  const returnFocusTo = useRef<number | null>(null);
  const backToList = useCallback(() => {
    returnFocusTo.current = url.committeeId;
    writeUrl({ committee: null }, "replace");
  }, [url.committeeId, writeUrl]);
  useEffect(() => {
    if (showingDetailOnMobile || returnFocusTo.current === null) return;
    const id = returnFocusTo.current;
    returnFocusTo.current = null;
    document
      .querySelector<HTMLElement>(`[data-committee-id="${id}"]`)
      ?.focus();
  }, [showingDetailOnMobile]);

  // Desktop list collapse (a toggle, not a drag handle). Focus follows the
  // toggle so keyboard users are not dropped on <body>.
  const [listCollapsed, setListCollapsed] = useState(false);
  const toggledList = useRef(false);
  const toggleList = useCallback(() => {
    toggledList.current = true;
    setListCollapsed((c) => !c);
  }, []);
  useEffect(() => {
    if (!toggledList.current) return;
    toggledList.current = false;
    document
      .getElementById(listCollapsed ? EXPAND_LIST_ID : COLLAPSE_LIST_ID)
      ?.focus();
  }, [listCollapsed]);

  if (gridComplete && grid.rollups.length === 0) {
    return (
      <div className="flex w-full flex-col overflow-hidden" style={{ height }}>
        <CommitteeWorkspaceHeader termLabel={termLabel} summary={grid.summary} />
        <CommitteeEmptyScope termLabel={termLabel} />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col overflow-hidden" style={{ height }}>
      <CommitteeWorkspaceHeader termLabel={termLabel} summary={grid.summary} />
      <div className="flex min-h-0 flex-1">
        {listCollapsed && (
          <div className="hidden shrink-0 border-r md:flex">
            <button
              id={EXPAND_LIST_ID}
              type="button"
              onClick={toggleList}
              aria-label="Show committee list"
              aria-expanded={false}
              aria-controls="committee-list-pane"
              title="Show committee list"
              className="flex h-full w-12 items-start justify-center pt-3 text-slate-500 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-slate-900"
            >
              <PanelLeftOpen className="h-5 w-5" aria-hidden />
            </button>
          </div>
        )}
        <aside
          id="committee-list-pane"
          aria-label="Committee list"
          className={`${showingDetailOnMobile ? "hidden" : "flex"} ${
            listCollapsed ? "md:hidden" : "md:flex"
          } min-h-0 w-full min-w-0 flex-col border-r md:w-[38%] md:min-w-[320px] md:max-w-[460px]`}
        >
          <CommitteeGridPane
            filters={{
              onCollapse: toggleList,
              collapseButtonId: COLLAPSE_LIST_ID,
              towns: scope?.towns ?? [],
              legDistricts: ldOptions,
              value: { ...localFilters, town, ld },
              onTownChange: (next) => writeUrl({ town: next, ld: null }, "replace"),
              onLegDistrictChange: (next) => writeUrl({ ld: next }, "replace"),
              onLocalChange: (patch) =>
                setLocalFilters((prev) => ({ ...prev, ...patch })),
            }}
            groups={groups}
            selectedCommitteeId={selectedCommitteeId}
            onSelectCommittee={selectCommittee}
            status={grid.status}
            error={grid.error}
            onRetry={grid.reload}
          />
        </aside>
        <section
          aria-label="Committee detail"
          className={`${
            showingDetailOnMobile ? "flex" : "hidden md:flex"
          } min-h-0 min-w-0 flex-1 flex-col`}
        >
          <CommitteeDetailPane
            key={selectedCommitteeId ?? "none"}
            committeeId={selectedCommitteeId}
            committee={selectedCommittee}
            detail={detail}
            tab={url.tab}
            onTabChange={setTab}
            onBack={backToList}
            focusHeadingOnMount={!isDesktop}
          />
        </section>
      </div>
    </div>
  );
}
