# 08 - Workspace shell, part 2: detail loading, responsive navigation, tests

Type: task
Status: resolved
Blocked by: 06, 07
Parent: ../map.md

## Question

Finish plan §6 and the shell-level parts of §10:

- `CommitteeDetailPane` (`CommitteeContextHeader`, `CommitteeSummary`, `CommitteeTabs` with the four tab shells, roster default) loading from the detail endpoint; loading and failed-detail states; empty-term and empty-jurisdiction states.
- Cancel or ignore stale detail requests when selection changes quickly.
- Responsive: desktop ~35–40/60–65 split with a collapsible (toggle, not drag) grid pane and sticky detail header/tabs; mobile/tablet list-to-detail navigation states with **Back to committees**, starting on the list unless a valid committee id is in the URL; no horizontal overflow at 375px.
- Accessibility baseline: one `h1` **Committees**, `h2` for selected-committee context, semantic keyboard-navigable tabs, keyboard-selectable rows.

Tests (plan §12.2): loading/failed detail, switching committees during a pending request, role-specific controls via `actingPermissions`. Tab *contents* are tickets 09–12.

## Acceptance addendum (from plan.md)

- `CommitteeTabs` renders a registered stub component per tab (Roster, Pending, Seats & Weight, History), each in its own file under `committees/workspace/tabs/`, taking the detail response as a prop. Tickets 09–12 then replace only their own file and must not edit the tab registry, so they can run in parallel without conflicts.
- Port Variant B's below-`md` list↔detail navigation from `_prototype/VariantB.tsx` (the `committee` URL param toggles the view); do not import from `_prototype/`, which is deleted in ticket 16.
- Leave the `CommitteeAction` union and the drawer mount point to ticket 13; do not stub them here.

## Answer

Built on branch `wave1-08` (from `committees-workspace` after the 07 and LPV-01 merges).

### What changed (`apps/frontend/src/app/committees/workspace/`)

- `useCommitteeDetail.ts`: `useCommitteeDetail(committeeId: number | null): CommitteeDetailData`. It loads `GET /api/committee/{id}/detail` and parses it with `committeeDetailResponseSchema`. The state is `idle | loading | ready { detail, refreshing } | error { error }`, plus `reload()`. `CommitteeWorkspace` calls it (the workspace owns loading/error coordination; the pane never sees a URL).
- `CommitteeDetailPane.tsx` `{ committeeId, committee (grid row | null), detail, tab, onTabChange, onBack, focusHeadingOnMount? }`. It replaces the deleted `CommitteeDetailPlaceholder` and is keyed on `selectedCommitteeId`. The header renders from the detail, or from the grid row while the detail loads. If neither is available, it shows "Loading committee…". With nothing selected (desktop), it shows "Select a committee."
- `CommitteeContextHeader.tsx` `{ committee: { cityTown, legDistrict, electionDistrict } | null, onBack, headingRef? }`: the `h2` (`Town · ED n`, focusable by script), the LD line, and **Back to committees** below `md`.
- `CommitteeSummary.tsx` `{ rollup, ltedWeight }`: seats filled/open (or "full"), unassigned, pending, LTED weight (or "not set"), and missing-weight seats. Every state is in text.
- `CommitteeTabs.tsx` `{ committeeId, detail, tab, onTabChange, header, onRetry, onRefresh }`: Radix tabs (`tablist`/`tab`/`tabpanel`, arrow keys, automatic activation, labelled "Committee sections"). It is the pane's scroll container. A `sticky top-0` block holds `header` (context header + summary) and the tab strip, so they stay visible while the panel scrolls. The tab strip scrolls horizontally inside itself rather than widening the page. Loading ("Loading committee details…", `role=status`) and failed detail (`role=alert`, server message, **Retry**) are rendered here once, for every tab. Only the active panel mounts.
- `tabs/`: `types.ts` (`CommitteeTabProps`), `registry.ts` (`COMMITTEE_TABS`), and four stubs: `RosterTab.tsx`, `PendingTab.tsx`, `SeatsWeightTab.tsx`, `HistoryTab.tsx`. See the contract below.
- `CommitteeEmptyScope.tsx` `{ termLabel }`: replaces the split pane when the whole scope has zero committees, once the grid is complete. Admin wording (by `actingPermissions`): "The {term} term has no committees yet." Leader and below: "You have no committees assigned for the {term} term. An Admin can assign you a jurisdiction." This covers both the empty-term and the empty-jurisdiction case. No detail request is made, and a URL committee is cleared by 07's recovery.
- `CommitteeWorkspace.tsx`:
  - Desktop collapse is a toggle, not a drag. **Hide committee list** (in the filter row, `md`+ only) collapses the list to a 48px rail with **Show committee list**. Both toggles carry `aria-expanded`/`aria-controls="committee-list-pane"`, and focus moves to whichever toggle is visible. Collapse is local state and never touches the URL.
  - Mobile **Back** writes `committee: null` by `replace` (as in 07) and returns focus to the row it came from. Opening a committee below `md` focuses its `h2`.
  - The split stays 38% / rest with `min-w-[320px] max-w-[460px]`, from 07.
- `CommitteeFilters.tsx`: optional `onCollapse` / `collapseButtonId` props for the toggle.

### Stale detail requests

Both mechanisms are used:

1. **Abort.** The effect for `(committeeId, generation)` creates an `AbortController`, passes the signal to `fetch`, and aborts it on cleanup, i.e. on any selection change or reload. Results that arrive after an abort are dropped.
2. **Request tag.** Each stored result is tagged with the `committeeId` and `generation` it was requested for, and the state is derived at render. A result for another committee reads as `loading`. So even a response that wins the race against the abort cannot appear under a different committee.

On `reload()` (Retry, or a tab's `onRefresh`), a successful detail stays on screen with `refreshing: true` until the new one lands. A failed one goes back to `loading`. Because the pane is keyed on the committee id, tab-local state never leaks between committees either.

### Tests

`apps/frontend/src/__tests__/components/committees/CommitteeWorkspace.test.tsx`: 43 tests, of which 16 are new. The harness's fetch mock now also serves the detail endpoint (`detailFor`, `detailsFrom`, `deferred` gates).

- Loading and summary: the detail renders.
- The header comes from the grid row while the detail is pending.
- Failed detail (403 message) with **Retry**, and a malformed body treated as a failure.
- Switching committees during a pending request, in both orders. The first request's signal is aborted, and its late response (resolved after the abort) never shows. Mutation-checked: removing the tag guard fails both tests.
- Every tab renders its registered component in a labelled `tabpanel`, and arrow-key tab navigation writes `tab` with `replace`.
- A keyboard Enter on a row selects it.
- One `h1`, and one `h2` for the committee.
- The collapse toggle and its focus.
- Mobile: select focuses the `h2`, and Back returns focus to the row.
- Empty term (Admin) and empty jurisdiction (Leader), plus a URL committee in an empty scope.
- Role-specific controls via `actingPermissions` (Leader vs Developer). The header controls follow the acting role, and the detail request is identical for both (no acting role reaches the server).
- 07's tests were updated only where the detail fetch changes them: drain counts roster calls only, and the later-page deep link now shows the heading from the detail before its grid page arrives.

## Comments

**Tab contract for tickets 09–12 (binding).**

- Files:
  - `apps/frontend/src/app/committees/workspace/tabs/RosterTab.tsx` → `export function RosterTab` (09)
  - `tabs/PendingTab.tsx` → `PendingTab` (10)
  - `tabs/SeatsWeightTab.tsx` → `SeatsWeightTab` (11)
  - `tabs/HistoryTab.tsx` → `HistoryTab` (12)

  Replace only your file's contents and keep the export name. Add any helper/child files beside it, e.g. `tabs/roster/…`. Do **not** edit `tabs/registry.ts`, `tabs/types.ts`, or `CommitteeTabs.tsx`.
- Props are `CommitteeTabProps` from `tabs/types.ts`:
  ```ts
  { committeeId: number;               // = detail.committee.committeeListId
    detail: CommitteeDetailResponse;   // validated; only rendered once loaded
    onRefresh: () => void }            // refetch detail after a mutation; old detail stays shown meanwhile
  ```
  The committee's composite key for adapters is `detail.committee.{cityTown, legDistrict, electionDistrict}`.
- A tab never handles loading/failed detail; `CommitteeTabs` does. The tab mounts only while it is active, and remounts per committee.
- Role-gated controls inside a tab: `useContext(GlobalContext).actingPermissions` + `hasPermissionFor` (client visibility only), tested via `actingPermissions` as in the workspace test's `renderWorkspace({ role })`. Admin-only data is already absent from `detail` for Leaders. Treat optional keys (`petitionContext`, `pending[].submittedBy`, `rows[].contact`, …) as absent, never as empty. Leaders receive no `petition_outcome` history events (LPV-01); do not reintroduce petition data for Leaders.
- Section headings inside a tab are `h3`; the committee context is the `h2`. The tab sits inside the pane's vertical scroll container below a sticky header, so anything sticky inside a tab (e.g. a table `thead`) sticks under the pane's sticky block, not at the pane top. Wide content should scroll inside the tab (`overflow-x-auto`) so the page never overflows at 375px.
- Opening an action (drawer) is ticket 13. It will add a callback to `CommitteeTabProps` and wire it in `CommitteeTabs`. 09–12 should not invent one; row action menus can be left as non-functional placeholders until 13.

**Notes for 09/10/12.**

- 09 (Roster): `detail.rows` is ticket 05's `SeatRosterRow[]`. `isPetitioned`/`petitionedVacant` stay as-is behind one helper until group C is answered (plan watch-outs).
- 10 (Pending): `detail.pending` is oldest first. `onRefresh` after accept/reject refreshes the pane; the grid's pending counts come from `useCommitteeGridData().reload` in the workspace. If 10 needs that, it is a workspace change, so coordinate with 13, which owns cross-pane refresh.
- 12 (History): `detail.history.events` is newest first, with `hasMore`. Admin-only fields are absent for Leaders.
- The test harness in `CommitteeWorkspace.test.tsx` (`serveRoster(pages, detailHandler)`, `detailFor(rollup, overrides)`) can drive a tab end to end. Tab-level unit tests can also render the tab component directly with a `detailFor`-style fixture.

**Gate (2026-10-09).**

- `test`: 115 suites / 1553 tests. 2 suites (9 tests) fail: the known pre-existing `api/admin/committeeDiscrepancyMembershipType.test.ts` and `components/committees/CommitteeRequestForm.preflight.test.tsx`. Nothing else fails.
- `lint`: 0 errors. The 12 warnings are all in files this ticket does not touch.
- `build`: passes, with the env copied from the main checkout.
- `check:api-routes`: passed (70 methods / 60 files). No routes were added.
- Not checked in a browser (needs a DB and an auth session): the 375px no-overflow check, sticky behavior, and the collapse rail. The CSS is in place: `overflow-hidden` on the root, `min-w-0` on the panes, a truncating `h2`, a wrapping summary, and a tab strip that scrolls on its own. Ticket 15 verifies it by hand.
