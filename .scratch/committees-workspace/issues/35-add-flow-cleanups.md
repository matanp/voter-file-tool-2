# 35 - Add-flow cleanups from the PR #183 review

Type: task
Status: ready-for-agent
Parent: ../map.md
Tier: 3 (polish) · Priority: P3
Source: Standards review of PR #183 ([26](26-duplicate-submission-silent-success.md), [27](27-roster-lags-after-add.md))

Code-shape leftovers. None of them is a user-visible bug.

## 1. "Already pending" text is duplicated

`drawer/CandidateSearchStep.tsx` and `drawer/AddMemberFlow.tsx` each spell the label. Share one constant.

## 2. `seatedMemberId` is threaded through five layers

`AddMemberFlow` → `useActionSubmit` wrapper → `CommitteeActionDrawer.handleSuccess` → `onComplete` →
`CommitteeWorkspace.completeAction`. Widening `onSuccess` to `void | Promise<void>` also touched
`ExitReportForms.tsx` and `MemberExitForms.tsx`. Look for a narrower seam, e.g. the success outcome carrying the
seated voter, or the workspace finding the new occupant by diffing rows.

## 3. `completeAction` hand-rolls its wait

`CommitteeWorkspace.completeAction` builds a promise, a `settled` flag and a timer inline. Extract a small
"wait for the next settled detail, with a timeout" helper. While there, clear the timer and resolve the pending
promise on unmount (today an unmounted workspace's timer still fires and resolves into the drawer).

## 4. Smaller smells

- `pendingCandidateIds` is derived from the `pendingSubmittedAt` Map only to get a Set; pass the Map, or
  `has` on it.
- `canSelectPending={isAdd}`: a boolean flag prop. Consider passing the mode.
- `RosterTab.tsx` imports `rosterRowKey as rowKey`; use the exported name.
- The focus fallback order is written twice: the workspace's completion effect (filled seat, trigger, same row's
  control, heading) and the drawer's `onCloseAutoFocus` (completed target, trigger, `fallbackFocus`). Give it one
  owner.
- `onComplete`'s return type `Promise<HTMLElement | null> | void` keeps `| void` only for the tests' `jest.fn()`
  mocks; the one production caller always returns a Promise.
- `requestAdd`: two simultaneous first submits both pass the duplicate check, and the unique key turns the second
  into a 500, not the 409 (documented in the route as accepted). Catching the unique-key error (P2002) and
  answering 409 would close it.

## 5. Browser QA findings (2026-11-22)

- **409 alert title.** A duplicate submit shows "Something went wrong" above "Already pending for this
  committee…". The title should say what happened, e.g. "Already pending". Fits [30](30-leader-facing-jargon.md)'s
  wording pass if that lands first.
- **Stale counts after a 409.** A 409 means the committee changed under the drawer (someone else submitted), but
  the drawer doesn't refresh, so the list and header kept "2 pending" when there were 3. Refresh the detail and
  grid on a 409 as well.
- **Admin search row wraps.** With both "Already pending" and Select, the pair drops below the voter line in
  `CandidateSearchStep` instead of sitting at the right like "Already on this committee" does. Keep the row on one
  line (`shrink-0` on the action group, or the label under the name).

## Acceptance criteria

- [ ] Items 1–5 done or each explicitly declined in this ticket.
- [ ] Existing drawer and workspace tests still pass; item 3's unmount case has a test.
