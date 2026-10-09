# 10 - Pending tab

Type: task
Status: resolved
Blocked by: 08
Parent: ../map.md

## Question

Execute plan §7.2: submitted candidates for the selected committee with submitted-by/date, eligibility status, warnings, Admin accept/reject via the existing `handleRequest` endpoint, and a link to `/committees/requests` for bulk review. Leaders see their jurisdiction's submissions read-only; the UI hides the controls, the detail endpoint (06) enforces scope.

Successful accept/reject refreshes the detail and the affected grid row and preserves filters, selection, and tab. Read `auth-check-patterns` before gating the controls.

## Answer

Built on branch `wave2-10` (from `committees-workspace` after 07, 08 and LPV-01).

### Pending tab (`apps/frontend/src/app/committees/workspace/tabs/`)

- `PendingTab.tsx`: an `h3` "Pending", then `detail.pending` in server order (oldest first) as a list labelled "Pending submissions". Every viewer sees the candidate (name and VRCNUM), the submitted date, "by you" for their own submission, and "Replaces …" for a replacement request.
- The Admin context is gated by `hasPermissionFor(actingPermissions, Admin)`, which is client visibility only:
  - the submitter's name;
  - request notes;
  - **eligibility status** ("no warnings at submission", or "N warnings at submission" with each warning's message, from the submission-time snapshot; the server re-runs eligibility on accept);
  - **Accept** / **Reject**;
  - the link **Review all pending requests** → `/committees/requests`. The link is Admin-only because that page refuses non-Admins.
- Leaders (and a Developer acting as Leader, even though the server sent Admin keys) see the list read-only, with a line that an Admin reviews it, and no controls, link, or Admin context. The detail endpoint (06) still decides what they receive.
- `pending/PendingSubmissionItem.tsx` calls the unchanged `POST /api/committee/handleRequest` through `useApiMutation`, with the same payloads as today's callers:
  - **Reject** is one click (as on `RequestCard`) and sends `{ membershipId, acceptOrReject: "reject" }`.
  - **Accept** opens an inline **Meeting** picker, because the endpoint requires `meetingRecordId` to accept. **Confirm accept** stays disabled until a meeting is chosen, then sends `{ membershipId, acceptOrReject: "accept", meetingRecordId }`.
  - No `forceAdd` override; that belongs to the drawer (13/14).
- `pending/useMeetingOptions.ts` lazily loads `GET /api/admin/meetings?limit=20` (Admin-only, newest first) the first time an Admin opens an accept, and shares the result across items. It has loading and error states with **Try again**. With no meetings, it links to Meetings.
- States:
  - In flight: that item's buttons are disabled, and they read "Rejecting…" / "Accepting…". Other items stay actionable.
  - Error: a `role=alert` in the item, either "Could not reject: <server message>" or, for `INELIGIBLE`, "Cannot accept: <reason copy>" via `getIneligibilityMessages`. The controls re-enable.
  - Success: the item swaps its controls for "Accepted/Rejected. Updating…" so it cannot be decided twice while the refetch is in flight. A tab-level `role=status` announces "Accepted Jane Doe.", then `onRefresh()` runs.

### Cross-pane refresh wiring (reuse this in 13)

`CommitteeTabProps` is unchanged. The workspace makes the detail pane's `reload` (which `CommitteeTabs` passes to every tab as `onRefresh`, and to **Retry**) refresh both panes:

```ts
// CommitteeWorkspace.tsx
const rawGrid = useCommitteeGridData();
const { grid, refresh: refreshGrid, keepSelectedVisible } = useGridRefresh(
  rawGrid,
  JSON.stringify([url.committeeId, url.town, url.ld, localFilters]), // "view key"
);
const visible = useMemo(() => keepSelectedVisible(filterRollups(grid.rollups, …)), …);
…
const loadedDetail = useCommitteeDetail(selectedCommitteeId);
const refreshDetailAndGrid = useCallback(() => {
  loadedDetail.reload();
  refreshGrid(selectedCommitteeId);
}, …);
const detail = { ...loadedDetail, reload: refreshDetailAndGrid };
```

`useGridRefresh` (new, `workspace/useGridRefresh.ts`) exists because a plain `grid.reload()` would disturb the view in two ways:

1. **Loading flash.** `reload` sets `status: "loading"`, then shows only page 1 while later pages drain. Rows from later pages vanish, `aria-busy` flips, and the URL-selection hold relaxes. During a refresh, the hook keeps returning the last *complete* grid as `ready` until the reload has drained every page, then swaps the new grid in at once. "Done" is detected without timers: the grid is `ready` again **and** its `rollups` array is no longer the snapshot's, because `reload` builds a new array per page. A failed reload falls through to the normal error UI (rows kept, Retry).
2. **Filter drop-out.** Suppose an Admin accepts the last pending submission while **Pending** is on. The row then no longer matches the filter, and 07's `reconcileUrlState` would clear the URL committee (or the desktop fallback would jump to another row). So `refresh(selectedCommitteeId)` pins the selected committee, and `keepSelectedVisible` re-inserts it in grid order while the view key is unchanged. Any selection or filter change drops the pin, and filters apply normally again.

Selection, tab and filters are never written by a refresh. They live in the URL and local state, and the detail pane stays keyed on the same committee, so the tab doesn't remount. Ticket 13 should call the tab's `onRefresh` (or the same `refreshDetailAndGrid`) after a drawer mutation and gets all of this for free.

Trade-off: the pane's **Retry** (after a failed detail) also refreshes the grid in the background, because `CommitteeDetailPane` passes one `detail.reload` to both. That is harmless, though it costs an extra roster drain. Splitting it needs a one-line `onRefresh` prop on `CommitteeDetailPane`, which was outside this ticket's file ownership. 13 may do it.

### Tests

- `__tests__/components/committees/PendingTab.test.tsx` (10):
  - Admin list content: order, submitter, date, replacement, notes, eligibility, warnings.
  - The bulk link and the empty state.
  - Reject in flight, disabled, then announced and refreshed.
  - Accept at a chosen meeting (exact POST body).
  - Failed reject: server message, controls re-enabled, no refresh.
  - `INELIGIBLE` accept.
  - Meetings load failure and retry.
  - Leader: read-only, no fetches.
  - A Developer acting as Leader sees no Admin context.
- `__tests__/components/committees/CommitteeWorkspace.pendingRefresh.test.tsx` (4):
  - A reject updates the grid row ("2 pending" → "1 pending") and the detail. Selection, Pending tab and town filter are kept, with no `push`/`replace`.
  - A multi-page refresh keeps the full grid on screen mid-drain (`aria-busy="false"`, later-page rows present, no loading text). The decided committee stays listed and selected under the **Pending** quick filter, and toggling a filter drops the pin.
  - Pure `keepRowVisible` cases.
  - Mutation-checked: disabling the snapshot or the pin each fails the multi-page test.
- The refresh tests live in their own file, with a copy of the workspace harness, so they don't collide with 09/12 edits to `CommitteeWorkspace.test.tsx`.

### Gate (2026-10-09)

- `test`: 117 suites / 1567 tests. Only the 9 known pre-existing failures fail (`committeeDiscrepancyMembershipType`, `CommitteeRequestForm.preflight`).
- `lint`: 0 errors. 12 warnings, all pre-existing and in untouched files.
- `build`: passes.
- `check:api-routes`: passed (70 methods / 60 files). No routes were added or changed.
- Not checked in a browser (needs a DB and an auth session).
