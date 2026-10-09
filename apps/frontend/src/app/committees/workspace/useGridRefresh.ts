"use client";
/**
 * Cross-pane refresh (ticket 10; reused by the action drawer, ticket 13): after
 * a mutation in the detail pane, the grid reloads so the affected row's counts
 * update, without disturbing what the user is looking at.
 *
 * `useCommitteeGridData().reload()` alone is not enough for that:
 * - it sets `status: "loading"` and then shows only the first page while later
 *   pages drain, so the grid flashes and rows from later pages briefly vanish;
 * - the mutation can change whether the selected row still matches a quick
 *   filter (accepting the last pending submission under **Only pending**), and
 *   the workspace's invalid-selection recovery would then drop the selection.
 *
 * So a refresh keeps showing the last complete grid (as `ready`) until the
 * reload has drained every page, then swaps it in at once. A failed reload
 * surfaces normally (rows kept, error alert with Retry). The committee that
 * was selected when the refresh started stays in the list even if it no
 * longer matches the filters, until the user changes the selection or a
 * filter. Selection, tab and filters live in the URL and local state, which a
 * refresh never writes.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import type { EdRollup } from "~/lib/validations/committee";
import type { CommitteeGridData } from "./useCommitteeGridData";

type Snapshot = Pick<CommitteeGridData, "rollups" | "summary" | "scopeFilters">;

/** The selected committee kept visible after a refresh, while `key` still matches. */
type Pin = { committeeId: number; key: string };

/**
 * `visible` plus the pinned committee (in grid order) when the filters would
 * now hide it. Pure; exported for tests.
 */
export function keepRowVisible(
  visible: EdRollup[],
  all: EdRollup[],
  committeeId: number | null,
): EdRollup[] {
  if (committeeId === null) return visible;
  if (visible.some((r) => r.committeeListId === committeeId)) return visible;
  if (!all.some((r) => r.committeeListId === committeeId)) return visible;
  const ids = new Set(visible.map((r) => r.committeeListId));
  return all.filter(
    (r) => ids.has(r.committeeListId) || r.committeeListId === committeeId,
  );
}

export type GridRefresh = {
  /** The grid to render: the last complete grid while a refresh drains. */
  grid: CommitteeGridData;
  /**
   * Reloads the grid in the background, keeping `selectedCommitteeId` listed.
   * Safe to call at any time; before the first complete load it is a plain
   * reload.
   */
  refresh: (selectedCommitteeId: number | null) => void;
  /** Applies the pin to the filtered rows (see `keepRowVisible`). */
  keepSelectedVisible: (visible: EdRollup[]) => EdRollup[];
};

/**
 * @param viewKey identifies what the user is looking at (URL committee and
 *   every filter). A pin is dropped as soon as it changes.
 */
export function useGridRefresh(
  rawGrid: CommitteeGridData,
  viewKey: string,
): GridRefresh {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [pin, setPin] = useState<Pin | null>(null);

  // The reload has not started while the hook still returns the snapshot's
  // rollups (`reload` builds a new array for every page), and has not finished
  // until the grid is `ready` again.
  const refreshing =
    snapshot !== null &&
    rawGrid.status !== "error" &&
    (rawGrid.status !== "ready" || rawGrid.rollups === snapshot.rollups);

  useEffect(() => {
    if (snapshot !== null && !refreshing) setSnapshot(null);
  }, [snapshot, refreshing]);

  const activePin = pin !== null && pin.key === viewKey ? pin : null;
  useEffect(() => {
    if (pin !== null && pin.key !== viewKey) setPin(null);
  }, [pin, viewKey]);

  const latest = useRef({ rawGrid, viewKey });
  latest.current = { rawGrid, viewKey };

  const refresh = useCallback((selectedCommitteeId: number | null) => {
    const { rawGrid: current, viewKey: key } = latest.current;
    if (current.status === "ready") {
      setSnapshot({
        rollups: current.rollups,
        summary: current.summary,
        scopeFilters: current.scopeFilters,
      });
      setPin(
        selectedCommitteeId === null
          ? null
          : { committeeId: selectedCommitteeId, key },
      );
    }
    current.reload();
  }, []);

  const grid: CommitteeGridData =
    refreshing && snapshot
      ? { ...rawGrid, ...snapshot, status: "ready", error: null }
      : rawGrid;

  const pinnedId = activePin?.committeeId ?? null;
  const rollups = grid.rollups;
  const keepSelectedVisible = useCallback(
    (visible: EdRollup[]) => keepRowVisible(visible, rollups, pinnedId),
    [rollups, pinnedId],
  );

  return { grid, refresh, keepSelectedVisible };
}
