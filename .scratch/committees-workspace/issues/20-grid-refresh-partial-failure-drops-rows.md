# 20 - A failed background grid refresh drops rows from later pages

Type: task
Status: resolved
Parent: ../map.md

Found in branch review of `committees-workspace` against `main` (2026-10-14, at `fdddbda`).

## Problem

`useGridRefresh` (`apps/frontend/src/app/committees/workspace/useGridRefresh.ts`) shows the last complete grid while a refresh drains, so pages shouldn't flash. But `refreshing` turns false as soon as `rawGrid.status === "error"`, which drops the snapshot. If the reload fails *after* page 1 of several (e.g. page 2 times out), the grid falls back to `rawGrid.rollups`, which holds only the pages that loaded. Committees from the later pages vanish from the list until Retry. The pinned selection can vanish with them if it was on one of those pages.

This only happens when the scope needs more than one page (`GRID_PAGE_SIZE = 500` committees), i.e. Admin county-wide.

The file header says "a failed reload surfaces normally (rows kept, error alert with Retry)". Rows are kept only if the failure hits page 1.

## Fix

When a refresh fails, keep showing the snapshot's `rollups` / `summary` / `scopeFilters` and surface only the error (status `error` with the old rows), rather than the partial raw grid.

## Acceptance

- Test in `CommitteeWorkspace.pendingRefresh.test.tsx`: the initial load has two pages; the refresh's page 2 rejects; every row from the first load is still listed and the error alert with Retry shows.

## Answer

Built in Lane B (worktree off `committees-workspace` at `8413196`).

- `useGridRefresh.ts`: the snapshot is now kept while the reload drains **or after it fails** (`keepSnapshot`), and dropped only once the raw grid is `ready` with new rollups. On failure the hook returns the snapshot's `rollups` / `summary` / `scopeFilters` with `status: "error"` and the raw error, so the grid pane shows the last complete grid plus the error alert and Retry instead of the partial pages.
- Retry stays `rawGrid.reload` (in `CommitteeWorkspace.tsx`, untouched). Because the snapshot survives, a Retry after a failed refresh also drains in the background and swaps in at once; a Retry after a failed *initial* load (no snapshot) behaves as before.
- Test (`CommitteeWorkspace.pendingRefresh.test.tsx`): two-page initial load, a decision triggers a refresh whose page 2 returns 500; all four rows stay listed with the selection, the alert reads "Could not load committees: Gateway timeout" with Retry, and Retry drains and shows the updated row.
- Not changed: `refresh()` still only takes a new snapshot and pin when the raw grid is `ready`, so a mutation made while the grid shows a failed refresh keeps the earlier snapshot and sets no pin.

## Comments
