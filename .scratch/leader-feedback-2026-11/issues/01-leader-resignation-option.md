# 01 - Leader resignation option

Status: resolved

## Merge blockers

- [17 - Exit Report tests use typed Prisma mocks](17-exit-report-tests-use-typed-prisma-mocks.md)
- [18 - Reject Exit Report has complete negative-auth coverage](18-reject-exit-report-negative-auth-test.md)

## Ask (verbatim)

> 1. There doesn't seem to be a way to remove someone without replacing them. We need a resignation option on the leader side. Ideally, include a place for them to upload a resignation letter; at minimum, add a pop-up telling them to send it to Stephen and me, editable on the admin side so we can change the process if needed. The Leaders submission is still pending admin approval.

## What exists today

- Admins can **Record resignation** (date received, method, reason) and **Remove member** (reason, notes)
  from the roster row menu. Both go through `POST /api/committee/remove`, which is Admin-only
  (`apps/frontend/src/app/api/committee/remove/route.ts`, forms in `workspace/drawer/MemberExitForms.tsx`).
- Leaders and RequestAccess users only get **Replace member** (`workspace/tabs/roster/rowActions.ts`). It
  files a Submission with `submissionMetadata.removeMemberId`. When an Admin accepts it, the occupant is marked
  `REMOVED` / `OTHER` (`api/lib/membershipConfirmation.ts`).
- So a Leader can't take someone off a committee without naming a replacement.

### How the gap happened

Before 2026-02-18, pending changes lived in `CommitteeRequest`, which had optional `addVoterRecordId` and
`removeVoterRecordId` columns. A request with only `removeVoterRecordId` set meant "remove this person."
Commit `275cbbf` replaced that table with `CommitteeMembership`: one row per person per committee per term, with a
status that moves `SUBMITTED → ACTIVE → RESIGNED / REMOVED`. Add requests became `SUBMITTED` rows. Replacements
became `SUBMITTED` rows with `submissionMetadata.removeMemberId`. Remove-only requests had no equivalent, and the
backfill dropped them (`prisma/migrations/20260218000000_add_committee_membership/migration.sql:91`).
`CommitteeRequest` is still in the schema but nothing uses it.

## Decisions (triaged 2026-11-01)

1. **Pending, Admin confirms.** A Leader *reports* an exit. The member stays ACTIVE and seated until an Admin
   confirms it. This matches how Submissions work ("still pending admin approval").
2. **Any exit; only removals have a reason.** The Leader picks either *Resigned* or *Removed*. A resignation
   takes the date received and the method (Email / Mail), both required, and no reason. A removal takes a reason
   from the existing `RemovalReason` list (Party change, Moved out of district, Inactive registration, Deceased,
   Other with notes). Notes are optional otherwise. *(Revised 2026-11-02; see decision 18.)*
3. **Pop-up with admin-editable instructions.** Before the Leader submits, a dialog shows instructions such as
   "send the resignation letter to …". The text is one plain-text field the Admin edits on the governance settings
   page. Email addresses and URLs in it become links. No markdown.
4. **Letter upload is deferred** to [08](08-resignation-letter-upload.md).
5. **The exit report is stored on the outgoing member's row, not in a new table or a new status.**
   - A `PENDING_REMOVAL` status was rejected. It would be ACTIVE under another name: about 70 ACTIVE checks across
     14 files would need updating, including the one-ACTIVE-per-term partial unique index, seat counts, weights,
     reports, and the rescan. A missed one would quietly drop the member.
   - A separate exit-report table was rejected. It would bring back a second place for pending Admin actions,
     which is what `CommitteeRequest` was.
   - Instead the row stays `ACTIVE`, and the Leader's report fills the exit columns the row already has.
6. **Rejected reports live only in the audit log.** Rejecting clears the report columns. History for a membership
   comes from `AuditLog` anyway (`api/lib/membershipHistory.ts`).
7. **Replacements move to this model**, in [09](09-replacements-use-exit-reports.md). This ticket leaves the
   Replace member flow as it is.
8. **No Leader withdraw or edit.** A Leader who filed a report by mistake asks an Admin to reject it. Withdraw is
   deferred to [10](10-leader-withdraws-exit-report.md).

### Review decisions (2026-11-01)

From the ticket review. These close the gaps in "nothing is left dangling".

9. **Every exit write is complete.** Any write that moves a row out of ACTIVE sets all four exit fields
   (`resignationDateReceived`, `resignationMethod`, `removalReason`, `removalNotes`) explicitly, to that path's
   value or `null`, and clears all three report fields. A superseding exit records only what that path knows. The
   Leader's reported details never stay behind looking like recorded facts. Confirming writes the reported
   values as they are (decision 19).
10. **One shared exit helper.** Every RESIGNED / REMOVED write goes through one helper (name is the implementer's
    call, e.g. `writeMembershipExit(tx, membershipId, exit)`) that writes the status, timestamps, exit fields and
    report clearing. The DB check is the backstop: a path that skips the helper fails loudly instead of leaving
    data behind. See *Exit write paths* below for the call sites.
11. **Bulk import leaves pending reports alone.** `activateMember` (`bulkLoadUtils.ts`) currently nulls the exit
    fields even on rows that are already ACTIVE. On an already-ACTIVE row it must leave the exit and report fields
    untouched. Only reactivation from a non-ACTIVE status clears them. An import says the member is on the file,
    not that they haven't resigned.
12. **Discrepancy undo supersedes a pending report.** Both undo paths (the "created" undo → REMOVED, and the
    "reactivated" undo that writes back a saved RESIGNED / REMOVED state) go through the helper and clear the
    report. The saved state was captured before the report existed, so it's written back with the report fields
    nulled.
13. **The kind is stored.** Add a required `exitReportedKind` (RESIGNATION / REMOVAL). Both resignation fields
    are optional for Leaders, so the kind can't be derived from the filled fields.
14. **Concurrent writes get a 409.** Report, confirm and reject are conditional updates:
    - report: `WHERE id AND status = 'ACTIVE' AND exitReportedAt IS NULL`;
    - confirm / reject: `WHERE id AND status = 'ACTIVE' AND exitReportedAt = <the value the Admin saw>`, so a
      report filed again after a reject can't be confirmed by accident.

    Zero rows updated → 409 ("This member changed, refresh."). Direct exits through the helper only need
    `status = 'ACTIVE'`. Today's `/api/committee/remove` reads and then updates without that guard; the helper
    adds it.
15. **Audit actions.**
    - New `AuditAction` values `MEMBER_EXIT_REPORTED` and `MEMBER_EXIT_REPORT_REJECTED`. Both go in
      `MEMBERSHIP_HISTORY_ACTIONS` (`api/lib/membershipHistory.ts`) and are visible to non-Admins.
    - Confirm reuses `MEMBER_RESIGNED` / `MEMBER_REMOVED` with metadata
      `{ source: "exit_report", reportedById, reportedAt }`.
    - A superseding exit (direct removal, flag confirm, replacement accept, bulk sync, undo) adds
      `supersededExitReport: { reportedById, reportedAt, kind }` to its own audit metadata. There is no separate
      event.
16. **Leaders read the instructions through their own endpoint.** `/api/admin/governance-config` GET is
    Admin-only. Add `GET /api/committee/exit-instructions` (RequestAccess+) that returns only `{ text }`. The
    report form prefetches it when the drawer opens and caches the text for the session, so the dialog shows it
    at once. Each time the dialog opens it refetches in the background and swaps in an Admin's edit. A failed
    refresh keeps the cached text; with nothing cached, a failure blocks sending.
17. **Pending tab for Leaders is read-only; no meeting.** Leaders see their jurisdiction's exit reports read-only,
    the same way they see Submissions. The detail endpoint applies the same visibility rules. Confirming an exit
    isn't tied to a meeting, matching today's Record resignation / Remove member.

### Review decisions (2026-11-02)

18. **Resignations have no reason.** SRS §5 gives a reason only to *Removed*, and §6.5 requires only the date
    received and the method for a resignation. The `RemovalReason` list (Deceased, Inactive registration, …) is
    for removals. This applies to the Leader's report and to the Admin's Record resignation form, and supersedes
    the structured resignation reason from SRS ticket 4.5. Optional notes can say why the member left.
19. **Admins confirm or reject, never edit.** Confirming records the report as filed. A report with a mistake
    is rejected and the Leader files it again. Because nothing is filled in at confirm time, the Leader's
    resignation report must carry the date received and the method (SRS §6.5).

## Model

On `CommitteeMembership`:

- Reuse the existing `resignationDateReceived`, `resignationMethod`, `removalReason`, `removalNotes`.
- Add `exitReportedAt DateTime?`, `exitReportedById String?` (relation to `User`), and
  `exitReportedKind ExitReportKind?` (new enum: RESIGNATION / REMOVAL). These three are the *report fields*.
- Schema comment: while `status = ACTIVE` and `exitReportedAt` is set, the four exit fields hold the Leader's
  *reported* exit. Once `RESIGNED` / `REMOVED`, they hold the *recorded* exit.
- DB check constraints (raw SQL in the migration, with a schema comment like the partial-index NOTE):
  - `exitReportedAt` may be non-null only while `status = 'ACTIVE'`;
  - `exitReportedKind` is non-null exactly when `exitReportedAt` is non-null.
- Every write that leaves ACTIVE goes through the shared exit helper (decision 10): it sets the status and all
  four exit fields explicitly, and clears the three report fields in the same write. Confirming writes the
  reported values.
- Rejecting clears the three report fields and the four exit fields.

### Exit write paths

Every one of these must go through the helper. Today each writes only some of the exit fields.

| Path | File |
| ---- | ---- |
| Admin Record resignation / Remove member | `api/committee/remove/route.ts` |
| Exit report confirm (new) | `api/committee/exitReport/confirm/route.ts` |
| Rescan flag confirmed | `api/admin/eligibility-flags/[id]/review/route.ts` |
| Replacement accepted | `api/lib/membershipConfirmation.ts` |
| Bulk import sync removal and bulk move removal | `api/admin/bulkLoadCommittees/bulkLoadUtils.ts` |
| Discrepancy undo (created and reactivated) | `api/admin/handleCommitteeDiscrepancy/undo/route.ts`, `api/lib/committeeDiscrepancyResolution.ts` (`membershipBeforeToUpdateData`) |

Re-check with a search for `"RESIGNED"` / `"REMOVED"` writes before starting; this list is from 2026-11-01.
Also fix `activateMember` in `bulkLoadUtils.ts` per decision 11.

The `ExitReport` naming is the implementer's call. The approach isn't.

## Flows

### Leader reports an exit

- Roster row menu for an occupied seat (non-Admin, RequestAccess and above): add **Report resignation or removal**
  next to **Replace member**.
- Drawer form: kind, reason, notes (required for Other), and for resignations the optional date received and method.
- Submitting opens the instructions dialog first, with the admin text or nothing if it's empty. The Leader
  acknowledges it, then the report is sent.
- New endpoint (RequestAccess and above). It reuses `requestAdd`'s jurisdiction check: a Leader can only report
  members of committees in their jurisdictions for the active term. It rejects members who aren't ACTIVE and
  members who already have a pending report, using a conditional update (decision 14). It writes a
  `MEMBER_EXIT_REPORTED` audit entry.
- The roster shows the member as "Exit reported – pending" until it's resolved. Add the report fields (at least
  `exitReportedAt` and `exitReportedKind`) to the roster's row type (`SeatRosterRow`) and the roster route.
- The dialog's text comes from `GET /api/committee/exit-instructions` (decision 16).
- A Leader can't withdraw or edit a pending report (decision 8).

### Admin resolves

- The Pending tab lists ACTIVE rows with `exitReportedAt` set, next to Submissions, via the committee detail
  endpoint. Leaders see their jurisdiction's reports read-only (decision 17).
- **Confirm:** records the exit exactly as reported, after an inline "Record this … exactly as reported?" step
  (`POST /api/committee/exitReport/confirm`, body `{ membershipId, exitReportedAt }` only). The Admin can't edit
  the report or change its kind; a wrong report is rejected and filed again (decision 19). It goes through the
  shared exit helper. No meeting is picked. Audited as `MEMBER_RESIGNED` / `MEMBER_REMOVED` with
  `source: "exit_report"` (decision 15).
- **Reject:** optional note. Clears the report fields and the four exit fields, and writes
  `MEMBER_EXIT_REPORT_REJECTED`.
- Confirm and reject match the `exitReportedAt` the Admin saw, and return 409 if the row changed (decision 14).
- **The member leaves some other way** (every path in *Exit write paths*): the helper clears the report in the
  same write, and that exit's audit metadata records `supersededExitReport`. Nothing is left dangling.
- **Bulk import re-lists an ACTIVE member with a pending report:** the report and exit fields are left untouched
  (decision 11).

### Admin edits the instructions

- Governance settings page (`/admin/governance-config`): a textarea for the instructions, stored as a nullable
  text field on `CommitteeGovernanceConfig`, saved with the existing config and audited as `GOVERNANCE_CONFIG_UPDATED`.

## Domain docs

- Add to `CONTEXT.md` under Committee records: **Exit Report**: "A Leader's report that a member resigned or should
  be removed, waiting for an Admin to confirm or reject it. The member stays ACTIVE and seated until confirmed."
- Add an ADR recording decision 5 (exit report on the row, not a status or a table), the `CommitteeRequest`
  history, and the shared exit helper with its DB check backstop (decisions 9–10). Describe the cost of a new
  status qualitatively; don't quote the "about 70 checks" count as a fixed fact.

## Out of scope

- Moving replacements onto exit reports (ticket 09).
- Uploading or storing resignation letters (ticket 08).
- Letting Leaders exit members without Admin confirmation.
- Changing the Admin's direct Record resignation / Remove member forms or inputs, or adding Replace for Admins.
  (Their writes *do* move onto the shared exit helper.)
- Leader withdraw or edit of a pending report (ticket 10).
- Dropping the unused `CommitteeRequest` table (worth a small cleanup ticket of its own).

## Acceptance criteria

- [ ] A Leader can report a resignation or removal for an ACTIVE member in their jurisdiction without naming a replacement.
- [ ] A Leader can't report one for a committee outside their jurisdictions (403), for a non-ACTIVE member, or twice for the same member.
- [ ] The member stays `ACTIVE` throughout. The rescan, weight, seat-count and roster report tests pass unchanged with a pending exit report present.
- [ ] The instructions dialog shows the current admin-set text before a report is submitted. Emails and URLs are clickable. With no text set, the flow still works.
- [ ] An Admin can edit the instructions on the governance settings page. The change is audited.
- [ ] Confirming sets RESIGNED/REMOVED with exactly the reported values; the Admin can't edit them. Rejecting clears the report and exit fields and leaves the member ACTIVE.
- [ ] A resignation (reported or recorded by an Admin) has a date received and a method and no reason; a removal has a reason.
- [ ] Every path in *Exit write paths* goes through the shared helper, writes every exit field, and clears a pending report, recording `supersededExitReport` in its audit metadata.
- [ ] The DB constraints reject report fields on non-ACTIVE rows and an `exitReportedAt` without `exitReportedKind`.
- [ ] A bulk import that re-lists an ACTIVE member keeps their pending report intact.
- [ ] Discrepancy undo on a member with a pending report succeeds and clears the report.
- [ ] Concurrent report/confirm/reject return 409 instead of overwriting; confirming a report that was rejected and filed again is refused.
- [ ] Report, confirm, and reject appear in Committee History and the audit log, and are visible to Leaders.
- [ ] `GET /api/committee/exit-instructions` returns only the text and is RequestAccess+.
- [ ] Role gating follows `skills/auth-check-patterns`: the server uses actual privilege, the UI uses acting privilege.
- [ ] Tests cover the report endpoint (auth, jurisdiction, duplicate, non-ACTIVE), confirm/reject/supersede on every exit path, bulk re-import, undo, the 409 races, and the row menu per role.

## Comments

- 2026-11-01: Reviewed and grilled. Added review decisions 9–17, the exit write path list, the instructions endpoint, and tighter acceptance criteria. Withdraw split to ticket 10.
- 2026-11-02: Resolved. Shipped in PR #135 (merged); merge blockers 17 and 18 were resolved first.
