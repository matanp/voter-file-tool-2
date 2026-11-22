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

## Acceptance criteria

- [ ] Items 1–4 done or each explicitly declined in this ticket.
- [ ] Existing drawer and workspace tests still pass; item 3's unmount case has a test.
