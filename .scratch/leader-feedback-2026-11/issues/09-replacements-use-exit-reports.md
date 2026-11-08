# 09 - Replacements use exit reports

Status: resolved

Blocked by: 01

## Why

Split from [01](01-leader-resignation-option.md) on 2026-11-01. Ticket 01 adds the **Exit Report**: a Leader's
reported resignation or removal, stored on the outgoing member's ACTIVE `CommitteeMembership` row. A replacement
currently records who is leaving in the *candidate's* `submissionMetadata.removeMemberId`. When an Admin accepts
it, the occupant is always marked `REMOVED` / `OTHER`.

Decision: "who is leaving" should always live on the leaving member's row. A replacement becomes an ordinary
Submission for the candidate, paired with an Exit Report on the member being replaced.

## Model

- Add `replacementMembershipId String?` to `CommitteeMembership`, pointing at the candidate's `SUBMITTED` row.
  It's set on the outgoing member's row alongside the exit-report fields from 01.
- Extend 01's DB check constraint: `replacementMembershipId` may be non-null only while `status = 'ACTIVE'` and
  `exitReportedAt` is set.

## Flows

### Leader replaces a member

- **Replace member** keeps its candidate search. It also asks for the outgoing member's exit (same fields as 01's
  report form), so it no longer always records `REMOVED` / `OTHER`. It shows the same instructions dialog.
- One transaction creates the candidate's `SUBMITTED` row and sets the exit report on the outgoing ACTIVE row,
  with `replacementMembershipId` pointing at the candidate.
- If the outgoing member already has a pending standalone report, link the replacement to it. The Leader can
  update its fields, and nothing is duplicated. Ticket 01 has no Leader update path, so this ticket adds one.
  It's a conditional update like 01's decision 14, it writes every exit field (01's decision 9), and it's
  audited.
- The candidate row no longer gets `submissionMetadata.removeMemberId`. The submission's *audit* metadata should
  keep recording the outgoing member so Committee History reads the same as today.

### Admin resolves

- The Pending tab shows a replacement as one item: candidate in, outgoing member out.
- **Accept the candidate:** `membershipConfirmation` finds the outgoing member by
  `replacementMembershipId = <candidate id>`, not from `submissionMetadata`. It applies the *reported* exit
  (RESIGNED or REMOVED with the reported reason), not a hard-coded `REMOVED` / `OTHER`, all in the same
  transaction as today, with the same capacity math.
- **Reject the candidate:** clears the linked exit report too, which matches today's "reject leaves the member"
  behavior. *(Default. The alternative is to keep the exit as a standalone pending report.)*
- **Confirm the outgoing exit alone, while the candidate is pending:** allowed. The candidate becomes an ordinary
  pending add. Clear `replacementMembershipId` as part of the exit.
- **Reject the outgoing exit alone:** clears the report and the link. The candidate becomes an ordinary pending add.

## Migration of existing data

- For each `SUBMITTED` row whose `submissionMetadata.removeMemberId` names an ACTIVE member of the same committee
  and term, set that member's `exitReportedAt` (use the submission's `submittedAt`), `exitReportedById` (the
  submission's `submittedById`), `removalReason = OTHER` (what acceptance records today), and
  `replacementMembershipId`.
- If that member already has a standalone exit report from 01, link to it rather than overwriting it.
- If `removeMemberId` names a member who is no longer ACTIVE, leave the submission as a plain add. Acceptance
  already rejects an invalid replacement target.
- Clear `removeMemberId` from `submissionMetadata` on migrated rows. Before removing that read path, check whether
  any other key (`requestNotes` from the 2026-02 backfill) is still read.
- Remove `getRemoveMemberIdFromMetadata` and the other `submissionMetadata.removeMemberId` readers once migrated:
  `api/committee/[committeeListId]/detail/route.ts`, `committees/requests/RequestCard.tsx`, `CommitteeRequestForm.tsx`,
  `api/committee/requestAdd/route.ts`. `membershipHistory.ts` keeps reading `removeMemberId` from *audit* metadata,
  because past audit entries still carry it.

## Domain docs

- Update **Submission** in `CONTEXT.md`: "A replacement submission also names the member the candidate would
  replace" becomes "A replacement is a Submission paired with an Exit Report on the member being replaced."
- Add the replacement pairing to 01's ADR.

## Notes from ticket 01's review (2026-11-01)

- Accepting the candidate must apply the exit through 01's shared exit helper, not its own write.
- Rejecting the candidate clears the linked report through the same "clear all report and exit fields" rule
  as 01's reject.

## Notes from ticket 08 (2026-11-02)

- Ticket 08 adds an optional resignation letter upload, but not on replacements. When a replacement's outgoing
  exit is a resignation, consider reusing 08's upload form field and `writeMembershipExit`'s `letter` option
  instead of building a second upload path. Accepting the candidate should `keep` the letter; rejecting should
  `detach` it.

## Out of scope

- Adding Replace for Admins (still waiting on an atomic replace command).
- Dropping the unused `CommitteeRequest` table.
- Leader withdraw of an exit report, including a linked one (ticket 10).

## Acceptance criteria

- [x] Replace member records the outgoing member's exit (kind, reason, optional resignation details) on that member's row, and shows the instructions dialog.
- [x] Accepting the candidate applies the reported exit atomically, with today's capacity behavior.
- [x] Rejecting the candidate clears the linked exit. Confirming or rejecting the exit alone turns the candidate into a plain pending add.
- [x] A replacement on a member with a pending standalone report links to it without duplicating it.
- [x] Existing pending replacements are migrated, including the edge cases above. After migration, no code reads `submissionMetadata.removeMemberId`.
- [x] Committee History shows replacements the same way before and after migration.
- [x] Tests cover replacement submit, accept, reject, partial confirm/reject, linking to an existing report, and the migration.

## Comments

### 2026-11-08: built (branch `replacements-use-exit-reports`)

Decisions made while building, beyond the ticket text:

- **Defaults kept.** Rejecting the candidate rejects the paired report (`MEMBER_EXIT_REPORT_REJECTED`, `reason: "replacement_rejected"`). The capacity auto-reject does the same.
- **Pairing is unique** (one outgoing member per candidate) and is a self-FK with `ON DELETE SET NULL`. It lives in `CLEARED_EXIT_REPORT_FIELDS`, so every path that clears a report clears it.
- **Updating a pending report bumps `exitReportedAt`**, so an Admin who saw the old report can't confirm the new fields (decision 14's rule). It's audited as `MEMBER_EXIT_REPORTED` with the old fields in `beforeValue` and `updatedReport: true`. Pairing with a report as it is writes no extra audit row; the Submission's audit names the outgoing member.
- **One pending item.** `pendingItemsWhere` and the detail rollup count a replacement once, by its candidate. The workspace Pending tab nests the paired report in the candidate's item and leaves it out of Reported exits. The Admin requests page keeps both lists, and each one names the other.
- **Other paths that take a candidate out of SUBMITTED** (Admin direct add, discrepancy accept, bulk import) unpair it and leave the report pending. Resubmitting a reused row also unpairs it first.
- **Migration.** Migrated reports get `removalNotes = NULL`, so acceptance records the same thing as before (REMOVED, Other, no notes). When two pending candidates name the same member, the earlier one is paired. `removeMemberId` is copied onto each membership's *latest* `MEMBER_SUBMITTED` audit row (any status), because History now reads it there. It is cleared from `submissionMetadata` only on SUBMITTED rows; decided rows keep it, and nothing reads it. `requestNotes` is still read and stays.
- **History.** A resignation that was the outgoing half of an accepted replacement now shows "Replaced by", like a removal.
- **Legacy `CommitteeRequestForm`** (shown when `COMMITTEES_WORKSPACE` is off) doesn't ask why the member is leaving. It sends REMOVAL / OTHER, which is what acceptance recorded before.
- **Ticket 08's letter upload isn't reused.** 08 isn't built yet (`ready-for-human`).

