# 07 - Workspace shell, part 1: flag, grid pane, URL state

Type: task
Status: resolved
Blocked by: 01, 05
Parent: ../map.md

## Question

Execute the first half of plan §6:

- Server-side `COMMITTEES_WORKSPACE=1` switch in `committees/page.tsx`: off renders `CommitteeSelector` unchanged; on renders `CommitteeWorkspace`. A top-level branch — the workspace never wraps or embeds `CommitteeSelector`.
- `CommitteeWorkspace` owning only filters, selected committee id, selected tab, open action, and loading/error coordination; `CommitteeWorkspaceHeader`, `CommitteeGridPane` (`CommitteeFilters`, `CommitteeGrid`) with narrow domain-shaped props.
- Grid grouped by town with collapsible sections, paginated via the roster cursor; no virtualization or split-pane library.
- URL state `?committee=&tab=&town=&ld=`: `router.replace` for filters/tabs, `router.push` for committee selection; restore an accessible committee from the URL, else first visible on desktop; preserve the Leader single-scope shortcut (`singleCommitteeScope` / `committeeScope.ts`); clear or replace invalid selections after filter changes.

The detail pane may be a placeholder in this ticket; ticket 08 fills it. Tests for URL-driven selection, filtering, and invalid-selection recovery are deliverables here (plan §12.2), not later. Read `skills/auth-check-patterns/SKILL.md` for the role-gated header controls.

## Answer

Built on branch `wave0-07` (from `committees-workspace`).

### What changed

- `apps/frontend/src/app/committees/page.tsx`: `COMMITTEES_WORKSPACE === "1"` (server env, never `actingPermissions`) returns `<CommitteeWorkspace termLabel initialScope />` in a `Suspense`, after the existing Leader jurisdiction filtering computes `initialScope` (`singleCommitteeScope`) and before any `CommitteeSelector` data loading. It is a top-level branch. Flag off: unchanged. The dev-only `?variant=` prototype branch still runs first. Now reads `getActiveTerm()` (for the label) instead of `getActiveTermId()`. Documented in `apps/frontend/.env.example`.
- `apps/frontend/src/app/committees/workspace/`:
  - `CommitteeWorkspace.tsx`: the orchestrator. Owns URL state (committee, tab, town, ld), local filters, selection, and grid loading/error. The open action is left to ticket 13, which defines `CommitteeAction`.
  - `CommitteeWorkspaceHeader.tsx` `{ termLabel, summary }`: `h1` **Committees**, scope-wide counts, and **Review pending** / **Generate report** links gated on `actingPermissions` ≥ Admin (client visibility only; the target pages enforce real privilege).
  - `CommitteeGridPane.tsx` `{ filters, groups, selectedCommitteeId, onSelectCommittee, status, error, onRetry }`: loading, error with **Retry**, empty, and "loading more" states.
  - `CommitteeFilters.tsx` `{ towns, legDistricts, value, onTownChange, onLegDistrictChange, onLocalChange }`: town and LD selects (URL), plus a search box and the Open seats / Pending / Missing weight toggles (local state).
  - `CommitteeGrid.tsx` `{ groups, selectedCommitteeId, onSelectCommittee }`: town sections that collapse (`aria-expanded`) and rows that are native buttons with `aria-current`. Status is spelled out for screen readers, not shown by color alone. No virtualization.
  - `CommitteeDetailPlaceholder.tsx` `{ committee, loading, tab, onTabChange, onBack }`: **the seam ticket 08 replaces** with `CommitteeDetailPane`. It renders the `h2` context from the grid row, the four-tab strip (`ui/tabs`), and the mobile **Back to committees**.
  - `workspaceUrlState.ts` (`WORKSPACE_TABS`, `parseWorkspaceUrlState`, `buildWorkspaceHref`), `gridModel.ts` (`filterRollups`, `groupRollupsByTown`, `legDistrictsForTown`, `reconcileUrlState`, `formatTownName`), `useCommitteeGridData.ts`, `useIsDesktop.ts`, `useHeightBelowNav.ts`.
- `apps/frontend/src/lib/summarizeEdRollups.ts`: the existing rollup fold, moved out of `api/committee/roster/buildSeatRosterRows.ts` (which re-exports it) so the client grid can fold per-town counts without a second copy.
- The grid renders no `isPetitioned` / `petitionedVacant` display (rollups don't carry it), so there is nothing to put behind the 09/11 helper yet.

### URL behavior

- `committee` changes by `router.push`. `tab`, `town`, and `ld` change by `router.replace`. Writes patch the current params (unrelated params such as `variant` survive) and build on the latest written params, so two writes in one commit don't clobber each other.
- A URL committee is kept while grid pages are still loading, because it may be on a later page. Once the grid is complete, it is kept only if it is visible under the current filters. Otherwise it is cleared with `replace`.
- With no valid URL committee, desktop (`md`+) selects the first visible row **without writing it to the URL**. Mobile shows the list, and the `committee` param alone switches list ↔ detail (CSS).
- A `town` not in the caller's scope is ignored and cleared, and so is an `ld` not offered for the effective town. An unknown `tab` reads as `roster`.
- Filter changes, including local search and toggles, that hide the selected committee clear it from the URL. The desktop fallback then picks the first visible row.
- Leader single-scope shortcut: on arrival with neither `town` nor `ld`, `initialScope` is written once as `town`/`ld` via `replace`.

### Tests (plan §12.2)

- `apps/frontend/src/__tests__/components/committees/CommitteeWorkspace.test.tsx` (27): URL restore and desktop/mobile fallback, push on selection, tab read/replace/unknown, town/LD/search/quick filters, section collapse, invalid-selection recovery (out-of-scope id, URL-filter-hidden id, filter change, quick filter, out-of-scope town+LD, mobile), cursor drain across pages with a gated second page, scope summary, error+retry, Leader shortcut on/off, and Admin vs Leader header controls via `actingPermissions`.
- `apps/frontend/src/__tests__/app/committees/workspace/workspaceModel.test.ts`: the pure URL and grid helpers.

## Comments

**Grid pagination and scale (open fog, settled at this gate).** Decision: the grid loads the caller's **whole scope** eagerly. It calls `GET /api/committee/roster?includeRows=false&limit=500` (`ROSTER_MAX_LIMIT`), follows `nextCursor` until null, and filters town/LD/search client-side.

- Why: town/LD changes are instant and need no refetch. Invalid-selection recovery and "first visible" are decided against the full scope rather than a page. The endpoint's own `cityTown` rule (Rochester requires an LD) never applies. Town grouping across page boundaries is a plain merge, because pages are in (town, LD, ED) order. The header uses the endpoint's scope-wide `summary`, so counts are correct from the first page. The first page renders immediately, a "Loading more committees…" footer shows while later pages drain, and a URL committee on a later page is held until loading completes.
- Limits:
  - Each page request re-runs the route's O(scope) lean rollup query, so Admin scope costs ceil(N/500) of those. That is about 2–3 for ~10³ EDs.
  - The client holds every rollup, which is small (no seat rows).
  - A failure on a later page shows the error over the partial grid, and **Retry** restarts from page 1.
  - If county scope grows by an order of magnitude, revisit with server-side `cityTown`/`legDistrict` narrowing plus "load more". That would also need a committee-id lookup, so URL restore doesn't depend on the id being on a loaded page (ticket 08's detail endpoint can serve that).
- No "auto-fetch on scroll": every page is fetched regardless of scroll.

**Gate (2026-10-09).**

- `test`: 113 suites / 1512 tests; 2 suites (9 tests) fail. They are `api/admin/committeeDiscrepancyMembershipType.test.ts` and `components/committees/CommitteeRequestForm.preflight.test.tsx`. Both are pre-existing on this branch, as recorded in ticket 05, and are unrelated to these files.
- `lint`: 0 errors, no warnings in touched files.
- `build`: passes. The worktree has no `.env`, so it ran with `SKIP_ENV_VALIDATION=1` and placeholder values for the env vars the build reads.
- `check:api-routes`: passed. No routes were added.
- Not eyeballed in a browser: this needs a DB and an auth session. Do that with ticket 08/15.
