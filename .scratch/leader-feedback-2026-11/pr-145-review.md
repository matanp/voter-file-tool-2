# Review: PR #145 — Pair replacements with an Exit Report on the outgoing member

- PR: https://github.com/matanp/voter-file-tool-2/pull/145 (branch `replacements-use-exit-reports`, head `376bb398`)
- Merge-base with main: `5efb2e6e`
- Spec: `.scratch/leader-feedback-2026-11/issues/09-replacements-use-exit-reports.md` (blocker: `01-leader-resignation-option.md`)
- Reviewed: 2026-11-18, against the documented standards (AGENTS.md, `skills/auth-check-patterns`, `skills/test-type-safety`, CONTEXT.md, ADR 0002) and against the ticket.
- Method: the code was read, not run. No tests, `tsc` or pg integration tests were run during this review; the passing test counts in the PR description were not reproduced. The only check reported on GitHub is the Vercel preview (success), so there is no CI test run on record.
- Note: ticket 01 (`01-leader-resignation-option.md`) is not on the PR branch; it was read from main's working tree.

## Overall

Nothing in the core logic blocks merging. Every flow behaves as ticket 09 asks, and no race was found that leaves a pairing stale. Two things need doing before merge:

- **Conflict with main.** The PR shows as conflicting; main is 47 commits ahead of the merge-base. The only conflict is the imports at the top of `apps/frontend/src/app/api/lib/pendingExitReports.ts`, where main added `countPendingItems` (commit `e1dec050`). Resolving it is mechanical. Main's new Admin sidebar count goes through `pendingItemsWhere`, so it will count a replacement once with no extra work. Nothing new on main reads `submissionMetadata.removeMemberId`.
- **Migration order.** `20261108000000_replacements_use_exit_reports` is older than main's `20261116000000_add_missing_committees_created_audit_action`, which is probably already in prod. `prisma migrate deploy` will still apply it, but consider renaming it to a later timestamp so the history stays in order.

## Standards

### Breaches of documented rules

1. **No out-of-jurisdiction test for `requestAdd` (AGENTS.md, "Negative auth").** The route turns away an out-of-jurisdiction Leader with a 403 at `requestAdd/route.ts:180-200`, but `requestAdd.test.ts` has no test for it. The gap predates this PR, but the route can now write an Exit Report on a *different* member (`fileOutgoingExit`), so a test is now needed. The standalone exitReport route already has one (`exitReport.test.ts:188`).
2. **Some unpairs leave nothing in the audit log (AGENTS.md, "Audit/state invariants").** `writeMembershipLeavingSubmitted` (`membershipExit.ts:447-455`) returns `unpairedReport`, but these callers throw it away, so no audit row records the unpair:
   - direct add (`add/route.ts:233`)
   - bulk load (`bulkLoadUtils.ts:901`)
   - discrepancy accept (`handleCommitteeDiscrepancy/route.ts:222`)
   - petition outcome (`petition-outcomes/record/route.ts:261`)

   The capacity auto-reject does record it (`membershipConfirmation.ts:234`, `unpairedExitReportMembershipId`). A standalone confirm (`confirm/route.ts:113-140`) also doesn't say a pairing was cleared.
3. **Untyped `resolvesTo` in tests (test-type-safety: "`resolvesTo(x)` with an inferred generic is `as never` with extra steps").** The new `resolvesTo({ count: … })` calls are at `meetings.test.ts:470`, `handleRequest.test.ts:123` and `membershipConfirmation.test.ts:487`. Each needs `<Prisma.BatchPayload>`.
4. **Local `NextRequest` cast (test-type-safety: centralize `NextRequest` mocks).** `replacementPetitionAndDecisions.pg.integration.test.ts:74-76` casts `as unknown as NextRequest`, while `createMockRequest` already exists in `testUtils.ts:716`. Other pg tests do the same, so this is a judgement call.
5. **Wording (CONTEXT.md, Submission: "_Avoid_: request").** The text `'Replacement request'` is stored in `removalNotes`, where Admins see it. It is written by the migration and by `CommitteeRequestForm.tsx:89`. There's also a new type named `OutgoingExitRequest` (`replacementExitReport.ts:37`).

### Design concerns (judgement calls)

6. **`writeMembershipLeavingSubmitted` is misnamed.** It is also called on rows that aren't SUBMITTED:
   - re-activating a REJECTED, RESIGNED or REMOVED row (`add/route.ts:233`)
   - bulk ACTIVE→ACTIVE writes (`bulkLoadUtils.ts:897-901`)
   - re-recorded petition results

   Its own docblock admits this (`membershipExit.ts:405-407`). Something like `writeMembershipStatusAndUnpair` would say what it does.
7. **Three different rules for "is this paired?"**
   - `pendingItemsWhere` checks `replacementMembershipId: null` (`pendingExitReports.ts:43`).
   - `toPendingExitReport` (`:82-85`) and the detail route (`detail/route.ts:234`) also require the candidate to be SUBMITTED.
   - `PendingTab` filters by submission ids (`PendingTab.tsx:76-83`).

   If a write ever bypasses the helper, the grid and detail counts would disagree.
8. **The confirm audit is written twice.** The MEMBER_RESIGNED/REMOVED audit appears in both `membershipConfirmation.ts:252-290` and `confirm/route.ts:113-140`. Rejection got a shared helper (`rejectExitReport`); confirmation didn't.
9. **Repeated date code.** `toISOString().slice(0, 10)` is written out at `exitReportInput.ts:52-54`, `exitReportInput.ts:84` and `membershipExit.ts:568`. `formatCalendarDateForForm` (`dateUtils.ts:53`) already does this.
10. **The same name means different things in different files.**
    - `PendingExitReportRow` is exported from both `membershipExit.ts:481` and `pendingExitReports.ts:65`, with different shapes.
    - `ExitReportFields` is both a Zod type (`validations/committee.ts:418`) and a React component (`ExitReportForms.tsx:260`).
    - `ExitReportInput` is both a server type (`membershipExit.ts:292`) and a client type (`adapters.ts:485`).
    - `personName` is in `lib/personName.ts:18` and is also re-exported, with a different fallback, from `PendingSubmissionItem.tsx:61`.
11. **Smaller items:**
    - The meetings route writes its own not-found / not-submitted messages (`decisions/route.ts:115-133`) next to the shared decision-error mapping.
    - `replacementExitReport.ts:99-102` re-checks `replacementCarriesOutgoingExit` "for callers that skip it", but the only caller always validates.
    - Some types are written by hand next to their sources: `PendingExitReportsResponse` (`CommitteeRequestForm.tsx:55-57`) and `EXIT_KIND_LABELS` (`AddMemberFlow.tsx:73-76`).
    - `CandidateChanged` (`requestAdd/route.ts:50`) doesn't set `name`, unlike the other two sentinel error classes.
    - `membershipExit.ts` now has many unrelated jobs: exit writes, writes out of SUBMITTED, pairing, audit and confirm logic.
    - `replaceOutgoing` (`requestAdd/route.ts:366-378`) mostly just passes through to `fileOutgoingExit`.

The tests otherwise improve: about 83 `getMembershipMock` calls are gone and none were added. Casts in the new tests are limited to the fetch, NextRequest and TemplateStringsArray edges.

### Route checklist (AGENTS.md)

Every route touched keeps its `withPrivilege` wrapper. New body fields are validated with Zod (`replacementExitReportSchema`, `exitReportedAtToken`). Find-then-write flows use conditional `updateMany`, P2002 mapping (`CandidateChanged`), roll back by throwing (`PairedExitReportChanged`), and run meeting batch items in savepoints.

## Spec

1. **The PR description is wrong in four places.** Edit the PR body before merge.
   - It says the capacity auto-reject rejects the paired report. The code only unpairs (`membershipConfirmation.ts:211-222`).
   - It says the migration files the report with "no notes". The SQL sets `removalNotes = 'Replacement request'` (`migration.sql:67`).
   - It says the backfill goes onto the "latest `MEMBER_SUBMITTED` audit row". The SQL writes every such row (`migration.sql:86-96`), which is what the ticket asks.
   - It says "Resubmitting a reused row also unpairs it first". Commit `376bb398` removed that (`requestAdd/route.ts:413-416`).
2. **The capacity auto-reject differs from what the ticket says.** The ticket says: "Reject the candidate: clears the linked exit report too… (Default…)". On the capacity path the code keeps the report pending on its own instead, and audits it as `unpairedExitReportMembershipId` (`membershipConfirmation.ts:214-236`). The choice is reasonable and is written up in the ticket's Comments and the ADR, but it should be an explicit owner decision.
3. **The legacy `CommitteeRequestForm` only partly meets AC1.** AC1 says Replace member "records the outgoing member's exit (kind, reason, optional resignation details)… and shows the instructions dialog". The legacy form always sends REMOVAL / OTHER and shows no dialog; only the missing reason is documented. It also has a **real bug**:
   - The form looks up the member's pending report through `/api/committee/[id]/detail`, which is `withPrivilege(PrivilegeLevel.Leader)` (`detail/route.ts:342`).
   - `requestAdd` accepts `PrivilegeLevel.RequestAccess` (`requestAdd/route.ts:506-509`).
   - For a RequestAccess user the lookup fails without any error, so the form files a new report.
   - If the outgoing member already has a report, the server answers 409 ("already reported… Refresh"), and refreshing can't fix it.

   Impact is low, since prod runs with `COMMITTEES_WORKSPACE=1`.
4. **A full committee still can't take a replacement (older problem, not from this PR).** `validateEligibility` stops with `CAPACITY` when `activeCount >= maxSeats` (`eligibility.ts:171-183`). That check runs in `requestAdd:203`, `handleRequest:89` and the meeting decisions route at line 136, before `confirmSubmittedMembership` subtracts one for the outgoing member. So a full committee can't take a replacement without `forceAdd`. The PR keeps today's behaviour, as the ticket asks, but this is worth a follow-up ticket: a full committee is the main case for a replacement.
5. **Migrated and legacy replacements record a different note.** Accepting one now stores `removalNotes = "Replacement request"` instead of the old "Replacement request accepted" (old `membershipConfirmation.ts:204`). That slightly breaks "Committee History shows replacements the same way before and after migration". The pg test checks REMOVED / Other but not the notes.
6. **Small UX gaps.**
   - "Update the report" in `AddMemberFlow.tsx` starts from `EMPTY_EXIT_REPORT` instead of the existing report's values.
   - Retrying an identical request (`requestAdd:254-260`) returns 200 but quietly drops a changed `exitReport` in the retried body.
7. **Behaviour the ticket didn't ask for.** Most of it is reasonable and documented.
   - Every way a candidate can leave SUBMITTED now unpairs, through `writeMembershipLeavingSubmitted`: direct add, discrepancy, bulk load, petition win, loss or tie. This is needed to keep the pairing valid.
   - Resignations now show "Replaced by" in History (`membershipHistory.ts:369-389`).
   - Each meeting decision runs in its own savepoint (`savepoint.ts`).
   - The shared error mapping changes some messages ("Membership not found" becomes "Committee membership request not found").
   - `requestAdd` has four new rejections:
     - replacing yourself (422)
     - outgoing member not ACTIVE at submit (422)
     - a SUBMITTED candidate that doesn't match the request (409)
     - a duplicate on create (P2002 → 409)
   - Smaller refactors: `personName` / `VOTER_NAME_SELECT`, and new toast and RequestCard text.

### Traced and verified correct

- **Submission:** the candidate and the outgoing exit are written in one transaction. The outgoing member is looked up in the candidate's committee and active term (`replacementExitReport.ts:45-68`), so a pairing can't cross committees or terms.
- **Pairing with an existing report:** the write only succeeds if the member is ACTIVE, the `exitReportedAt` matches what the Leader saw, and the member isn't already paired (`membershipExit.ts:342-372`). A rewrite writes every field, gets a new `exitReportedAt`, and is audited with the old fields as `beforeValue`.
- **Double-pairing:** blocked by the route check, the conditional writes and the unique index. Two submissions at once end with one rolling back with a 409.
- **Accept:** finds the outgoing member by `replacementMembershipId` and writes the reported exit through `writeMembershipExit` with `expectedExitReportedAt`. If the report changed, it throws and the whole transaction rolls back. Capacity is counted minus one under the committee lock.
- **Reject (by hand or at a meeting):** unpairs, then `rejectExitReport` clears the report and exit fields together (01's reject rule). If the report changed in between, it returns 409 and rolls back. Confirming or rejecting the outgoing report on its own clears the pairing through `CLEARED_EXIT_REPORT_FIELDS`.
- **Races:** accepting or rejecting the candidate while someone confirms or rejects the outgoing report either fails the conditional write (409 or rollback) or deadlocks and aborts. No race was found that leaves a pairing stale.
- **Invariant:** a test that scans the source confines membership updates to `membershipExit.ts`, plus two documented exceptions. The CHECK constraint and `ON DELETE SET NULL` back this up.
- **Pending counts:** `pendingItemsWhere`, the detail route and the Pending tab each count a replacement once, with the report nested under its candidate.
- **History:** reads `removeMemberId` from the `MEMBER_SUBMITTED` audit row, and new submissions write it there.
- **Migration SQL:**
  - The schema changes come first, so the data updates satisfy the CHECK.
  - Pairing matches the same committee and term and an ACTIVE status, guarded by `jsonb_typeof` and `btrim`.
  - `DISTINCT ON (outgoing.id) … ORDER BY submittedAt, id` makes the earliest submission win.
  - A member who is no longer ACTIVE is left unpaired.
  - An existing report is paired without changing its fields.
  - The audit backfill runs before the metadata cleanup, and `COALESCE` handles NULL metadata.
  - `removeMemberId` is removed only from SUBMITTED rows, and `requestNotes` is kept.
  - No code reads `submissionMetadata.removeMemberId` any more.
- **Docs:** `CONTEXT.md` (Submission) and ADR 0002 are updated as the ticket asks.

## Summary

- **Standards:** 14 findings. Worst: the missing out-of-jurisdiction test on `requestAdd`, now that the route can write an Exit Report on another member.
- **Spec:** 7 findings. Worst: the PR description contradicts the code in four places, and the capacity auto-reject choice needs an owner decision. The one real behaviour bug is the legacy form's 409 dead end for RequestAccess users.
- **Before merge:** resolve the import conflict in `pendingExitReports.ts`, and consider renaming the migration to a later timestamp.
