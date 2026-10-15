# 20 - A failed background grid refresh drops rows from later pages

Type: task
Status: ready-for-agent
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

## Comments
