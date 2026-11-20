# 22 - Bring /committees/requests into the committees workspace

Type: task
Status: needs-triage
Parent: ../map.md

Raised 2026-11-02 while fixing the page so it lists pending Exit Reports (branch `leader-exit-report`).

## Problem

`/committees/requests` (`apps/frontend/src/app/committees/requests/page.tsx`) is the Admin's cross-committee
pending queue. The workspace links to it ("Review pending" in `CommitteeWorkspaceHeader.tsx`, "Review all pending
requests" in `PendingTab.tsx`), but it is a standalone page that doesn't look or work like the workspace:

- **No way back to a committee.** Each committee is an accordion group with a text label. Nothing links to that
  committee in the workspace, where the Admin would see the roster, seats and history before deciding.
- **Two submission UIs.** Submissions render with the old `RequestCard` (reject only, "Confirm in Meetings").
  The workspace Pending tab uses `PendingSubmissionItem`, which shows submitter, eligibility, contact and offers
  one-off accept with a meeting picker. An Admin gets different controls and context for the same submission
  depending on where they look. (Exit Reports already reuse `PendingExitReportItem` on both.)
- **No filtering or sorting.** No filter by town / LD / kind, no oldest-first ordering across committees, no counts
  up top. The workspace grid already has the filter and URL-state machinery.
- **Counts disagree.** *(Done on `leader-exit-report`: every "N pending" count — roster grid, workspace header, committee rollup, legacy `/committees` banner — now uses `pendingItemsWhere`, SUBMITTED plus pending Exit Reports.)* The legacy `/committees/page.tsx` banner ("There are N pending committee requests") counts
  only SUBMITTED rows, not pending Exit Reports. Check the workspace header's `summary.pendingCount` for the same gap.

## Options to triage

1. **Light touch.** Keep the page; link each committee group to its workspace selection URL; swap `RequestCard`
   for `PendingSubmissionItem`; fix the counts.
2. **Fold into the workspace.** An "All pending" view: a grid filter for committees with pending items, with the
   Pending tab as the place to decide. Retire `/committees/requests` and `RequestCard`. Ticket
   [16](16-cutover-and-cleanup.md) currently says "keep `/committees/requests`", so this reverses that decision.
3. **Hybrid.** A cross-committee pending list rendered inside the workspace shell (same header, same item
   components), each row linking to the committee.

## Acceptance (once an option is chosen)

- An Admin reaches every pending Submission and Exit Report from the workspace and can open the committee each
  belongs to in one click.
- Submissions use the same item component and controls everywhere.
- [x] Every "pending" count includes Exit Reports, or says it doesn't.

## Comments

### 2026-11-19 — QA sweep additions (findings I2, I3; Tier 2, P2)

From the [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md):

- **I2.** Admin → Pending review jumps to `/committees/requests`: the admin sidebar disappears, the top nav highlights
  Committee List, content sits in a 240 px column on a 1500 px screen, and there's no way back. Prod shows the same
  narrow layout. Either render it inside the admin shell, or link to it only from the workspace's "Review pending".
- **I3.** The page says "Confirmations are processed via a meeting record", yet every card has a working Confirm.
  Group headers read "ROCHESTER, 17, 1" instead of the workspace's "Rochester · LD 17 · ED 1".

Acceptance additions:

- [ ] The admin entry point keeps the user in a shell with a way back.
- [ ] The copy matches what the buttons do; group headers use the workspace's committee label.
