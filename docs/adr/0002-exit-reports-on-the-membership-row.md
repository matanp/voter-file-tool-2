---
Status: accepted
---

# Exit Reports live on the outgoing member's row, and every exit goes through one helper

A Leader can report that a member resigned or should be removed (an **Exit Report**). The member stays `ACTIVE` and seated until an Admin confirms the report or rejects it (`.scratch/leader-feedback-2026-11/issues/01-leader-resignation-option.md`).

The report is stored on the outgoing member's `CommitteeMembership` row. Three report fields (`exitReportedAt`, `exitReportedById`, `exitReportedKind`) mark the row as reported. The four exit fields the row already has (`resignationDateReceived`, `resignationMethod`, `removalReason`, `removalNotes`) hold the Leader's *reported* exit while the row is `ACTIVE` with a report, and the *recorded* exit once it is `RESIGNED` or `REMOVED`. Confirming records the reported values as they are; the Admin confirms or rejects, never edits. Rejecting clears the report fields and the exit fields. A rejected report survives only in `AuditLog` (`MEMBER_EXIT_REPORT_REJECTED`), which is where Committee History comes from anyway.

Every write that moves a row out of `ACTIVE` into `RESIGNED` or `REMOVED` goes through `writeMembershipExit` (`apps/frontend/src/app/api/lib/membershipExit.ts`). It sets the status, the timestamp and all four exit fields explicitly (to the path's value or `null`), and clears the report fields in the same conditional update. A row that leaves `ACTIVE` for a status that isn't an exit (an incumbent losing a primary, a discrepancy undo restoring `SUBMITTED`) goes through `writeMembershipLeavingActive`, which clears the report the same way. A superseding exit (direct removal, flag confirm, replacement accept, bulk import sync, petition loss, discrepancy undo) records the report it cleared as `supersededExitReport` in its own audit metadata. Two CHECK constraints are the backstop: report fields may be set only while `status = 'ACTIVE'`, and `exitReportedKind` is set exactly when `exitReportedAt` is. A path that skips the helper and leaves a report behind fails loudly instead of leaving a stale report on a departed member.

## History

Before 2026-02-18, pending changes lived in `CommitteeRequest`, with optional `addVoterRecordId` and `removeVoterRecordId`. A request with only the remove side set meant "remove this person." Commit `275cbbf` replaced that table with `CommitteeMembership` (one row per person per committee per term, with a status). Add requests became `SUBMITTED` rows and replacements became `SUBMITTED` rows with `submissionMetadata.removeMemberId`. Remove-only requests had no equivalent and the backfill dropped them. That gap is why a Leader couldn't take someone off a committee without naming a replacement. `CommitteeRequest` is still in the schema, unused.

## Considered Options

- **A `PENDING_REMOVAL` status.** Rejected. It would be `ACTIVE` under another name: every check for an active member (the one-active-per-term partial unique index, seat counts, designation weights, roster reports, the eligibility rescan) would have to learn the new status, and any check that was missed would quietly drop the member from the committee.
- **A separate exit-report table.** Rejected. It would bring back a second place for pending Admin actions, which is what `CommitteeRequest` was and why it drifted.
- **Leaving each exit path to write its own fields.** Rejected. Before this change each path wrote only some of the exit fields, so a reported reason could survive an unrelated exit and read as a recorded fact.

## Consequences

- The member's seat, weight and roster presence don't change while a report is pending, so nothing that counts `ACTIVE` members needed to change.
- Report, confirm and reject are conditional updates (`status = 'ACTIVE'` plus the `exitReportedAt` the writer saw). A concurrent write returns 409, and a report rejected and filed again can't be confirmed by an Admin who was looking at the old one.
- Superseding exits only require `status = 'ACTIVE'`. If a Leader files a report between the exit's read and its write, the helper re-reads and supersedes it, so a bulk import isn't aborted by an ordinary report.
- A bulk import that re-lists an `ACTIVE` member with a pending report leaves the report alone: the import says the member is on the file, not that they haven't resigned.
- A replacement is a Submission paired with an Exit Report (ticket 09, below).

## Replacements: a Submission paired with an Exit Report

Ticket 09 (`.scratch/leader-feedback-2026-11/issues/09-replacements-use-exit-reports.md`) moved replacements onto the same rule: who is leaving lives on the leaving member's row. Before it, a replacement candidate's `submissionMetadata.removeMemberId` named the outgoing member, and accepting it always recorded `REMOVED` / `OTHER`.

Now **Replace member** files the candidate's Submission and an Exit Report on the outgoing member in one transaction. The outgoing ACTIVE row's `replacementMembershipId` points at the candidate's SUBMITTED row (unique: one outgoing member per candidate). If the member already has a pending report, the replacement pairs with it, conditional on the report the Leader saw, and can rewrite all of its fields with a new `exitReportedAt` (so an Admin looking at the old report can't confirm the new one).

- The pairing is part of the report. `CLEARED_EXIT_REPORT_FIELDS` includes it, so every write that clears a report (any exit, a reject, leaving ACTIVE) clears the pairing too. A third CHECK constraint is the backstop: `replacementMembershipId` may be set only while `status = 'ACTIVE'` and `exitReportedAt` is set.
- Accepting the candidate records the outgoing member's exit exactly as reported, through `writeMembershipExit` with the report's `exitReportedAt` (the same exact-match rule as the Admin's confirm), in the same transaction and with the same capacity math as before.
- Rejecting the candidate (by hand, at a meeting, or the capacity auto-reject) rejects the paired report by the reject rule: report, exit fields and pairing cleared, audited as `MEMBER_EXIT_REPORT_REJECTED` with `reason: "replacement_rejected"`.
- Confirming or rejecting the outgoing report on its own is allowed; it clears the pairing, and the candidate stays pending as an ordinary add.
- A candidate that leaves SUBMITTED some other way (an Admin's direct add, a discrepancy resolution, a bulk import) or whose old row is reused for a new submission is unpaired (`unpairReplacement`); the report stays pending.
- A replacement counts as one pending item (`pendingItemsWhere` skips paired reports), and the Pending tab shows it as one item: the candidate, with the outgoing member's report nested in it.
- Committee History still names the member a submission would replace. It reads `removeMemberId` from the `MEMBER_SUBMITTED` audit row's metadata now; the migration copied it there from `submissionMetadata` for existing submissions.
