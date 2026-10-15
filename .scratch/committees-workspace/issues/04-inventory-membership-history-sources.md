# 04 - Inventory what membership history is recoverable today

Type: task
Status: resolved
Parent: ../map.md

## Question

For the detail endpoint (ticket 06) and the History tab (ticket 12): which of "additions, replacements, resignations, removals with actor, date, reason, and meeting context" (plan §5, §7.4) can actually be assembled from existing data, and from where?

Known sources: `CommitteeMembership` (`status`, `resignedAt`, `removedAt`, `submissionMetadata.removeMemberId`), `AuditLog` (`action`, `metadata`), `MeetingRecord`, and the petition-outcome context `fetchCommitteeList` already returns. Produce, as a short committed artifact under `.scratch/committees-workspace/`:

- For each history event kind, the table(s) and columns it comes from, and which of actor / date / reason / meeting context are present, derivable, or absent.
- Whether `AuditLog` is queryable per committee (what its target/scope columns are) and whether it is PII-bearing for non-Admin readers.
- Any event kind that cannot be reconstructed at all, so ticket 12 can drop it honestly rather than fake it.

AFK. This decides nothing itself; it is the fact base for 06 and 12.

## Answer

Full inventory: [history-inventory.md](../history-inventory.md).

- **`AuditLog` is the only complete source.** `CommitteeMembership` is one row per (voter, committee, term) and re-add/resubmit null out every prior lifecycle column (`add/route.ts:229-249`, `requestAdd/route.ts:265-292`), so earlier cycles, all actors except `submittedById`, and removal provenance (`bulk_import_sync` / `boe_flagging` / `discrepancy_undo` all degrade to `removalReason='OTHER'` on the row) survive only in `AuditLog.metadata`.
- **Per-committee query works but not by column.** `AuditLog` has only `entityType`+`entityId` (indexed). Query shape: collect the committee's `CommitteeMembership.id`s (and `Seat.id`s for petition rows), then `auditLog.findMany({ entityType, entityId: { in } })`. `metadata.subject.committeeListId` exists only for rows since 2026-06-20 (no backfill); do not filter on it.
- **Meeting context exists only for accept/reject of a SUBMITTED membership** (`meetingRecordId` set at `membershipConfirmation.ts:254,353`); never for resignations, removals, petition outcomes, or direct adds. `handleRequest` reject sets no meeting, so it is optional even for rejections.
- **Plan §5 is wrong that `fetchCommitteeList` returns petition context.** It returns raw ACTIVE memberships with full `voterRecord` (PII leak to Leaders). Petition context is the separate Admin-only `GET /api/admin/petition-outcomes?committeeListId&termId`, a plain `CommitteeMembership` query on `membershipType='PETITIONED'`.
- **Cannot reconstruct, drop honestly:** Admin replacement as one event (remove-then-add, no cross-ref; only leader-request replacements pair via `metadata.replacementMembershipId`); reason for a plain Admin add; actor on any row event except submission; pre-June-2026 point-in-time names/seats.
- **PII for Leaders:** free-text notes (`removalNotes`, `rejectionNote`, `requestNotes`), `removalReason`/`resignationMethod`, override reasons, eligibility warnings, voter ids, actor names, meeting notes are Admin-only in the proposed shape; member name + seat + date + kind + actor role + meeting date are Leader-visible, matching the roster's existing name-but-not-contact policy.
- Proposed `history` event union with per-field privilege matrix is in §4 of the inventory; it collapses the `MEMBER_CONFIRMED`+`MEMBER_ACTIVATED` pair into one `confirmed` event and keys petition outcomes off the per-candidate `PETITION_RECORDED` rows.
