# Membership history inventory

Fact base for ticket 06 (detail endpoint `history` array) and ticket 12 (History tab). Written 2026-09-18 against branch `committees-workspace`. Paths are relative to `apps/frontend/` unless noted.

## 0. The three sources, in one paragraph each

**`CommitteeMembership`** (`prisma/schema.prisma:435-488`) is one row per `(voterRecordId, committeeListId, termId)` (`:479`), never deleted, status-transition only. It carries the *current* lifecycle columns: `status`, `submittedAt`, `confirmedAt`, `activatedAt`, `resignedAt`, `removedAt`, `rejectedAt`, `rejectionNote`, `submittedById`, `submissionMetadata` (Json), `meetingRecordId`, `resignationDateReceived`, `resignationMethod`, `removalReason`, `removalNotes`, `petitionVoteCount`, `petitionPrimaryDate`, `petitionSeatNumber`. The only actor column is `submittedById` (`:459-460`). There is no removedBy / resignedBy / activatedBy column. Crucially, **re-activation and re-submission null out every prior lifecycle column on the same row** (`app/api/committee/add/route.ts:229-249`, `app/api/committee/requestAdd/route.ts:265-292`, `app/api/admin/handleCommitteeDiscrepancy/route.ts:225-237`), so the row is a snapshot of the *latest* cycle only. Any earlier cycle for the same voter in the same committee+term survives only in `AuditLog`.

**`AuditLog`** (`prisma/schema.prisma:516-533`) is write-once: `userId` (FK to `User`), `userRole`, `action` (enum `:58-84`), `entityType` (string, e.g. `"CommitteeMembership"`, `"Seat"`, `"MeetingRecord"`), `entityId`, `timestamp`, `beforeValue`/`afterValue`/`metadata` (Json). Indexes: `[entityType, entityId]`, `[userId]`, `[timestamp]`, `[action]`. Every membership-mutating route writes through `logAuditEventOrThrow` (`lib/auditLog.ts:99-122`) inside the same transaction; meeting creation uses best-effort `logAuditEvent` (`lib/auditLog.ts:73-96`). Since commit `6818cde` (2026-06-20) every `CommitteeMembership` entry also carries `metadata.subject` = `{ memberName, voterRecordId, committeeListId, termId, termLabel, cityTown, legDistrict, electionDistrict, seatNumber?, membershipType? }` (`lib/auditMembershipSubject.ts:12-24`, merged by `mergeAuditMetadata` `:122-131`). There is **no backfill migration** for rows written before that commit (checked `prisma/migrations/`; nothing matches `subject`/`backfill`), so `metadata.subject` must be treated as optional.

**`MeetingRecord`** (`prisma/schema.prisma:408-417`): `meetingDate`, `meetingType` (`EXECUTIVE_COMMITTEE | OTHER`), `notes`, `createdById`, `createdAt`, and a reverse relation `memberships`. It is linked to a membership **only** via `CommitteeMembership.meetingRecordId`, and that column is set by exactly two paths: accept via `confirmSubmittedMembership` (`app/api/lib/membershipConfirmation.ts:248-262`) and reject via the meeting-decisions route (`membershipConfirmation.ts:348-356` when `meetingRecordId` is passed; `app/api/admin/meetings/[meetingId]/decisions/route.ts:178-183`). `MeetingRecord` has no link to petition outcomes, resignations, or removals.

**Petition context**: contrary to plan §5's wording, `/api/fetchCommitteeList` returns **no** petition context. It returns the `CommitteeList` row spread with `ACTIVE` memberships (`include: { voterRecord: true }`) and seats (`app/api/fetchCommitteeList/route.ts:88-97,142-151`, gated `Leader` at `:177`). The "Petition outcomes" panel in `CommitteeSelector` is a separate, Admin-only client call to `GET /api/admin/petition-outcomes?committeeListId&termId` (`app/committees/CommitteeSelector.tsx:678-700`; route `app/api/admin/petition-outcomes/route.ts:25-83`, `withPrivilege(Admin)` at `:93`). That route is a plain `CommitteeMembership` query: `membershipType = PETITIONED AND petitionSeatNumber IS NOT NULL`, projecting `voter {VRCNUM, firstName, lastName}`, `status`, `seatNumber`, `petitionSeatNumber`, `petitionPrimaryDate`, `petitionVoteCount`.

## 1. Event-kind table

Legend: **P** = present as a column; **D** = derivable (how in the cell); **A** = absent.

| Event kind | Primary source rows | Actor | Date | Reason | Meeting context | Notes |
|---|---|---|---|---|---|---|
| **Petition outcome** (won / lost / tie per candidate, per seat) | `CommitteeMembership` where `membershipType='PETITIONED' AND petitionSeatNumber IS NOT NULL` (`admin/petition-outcomes/route.ts:25-32`); columns `status` (`ACTIVE`/`PETITIONED_LOST`/`PETITIONED_TIE`), `petitionSeatNumber`, `petitionPrimaryDate`, `petitionVoteCount`. Also `AuditLog action='PETITION_RECORDED'` twice per recording: one per candidate (`entityType='CommitteeMembership'`, `admin/petition-outcomes/record/route.ts:240-262,293-315`) and one per seat (`entityType='Seat'`, `:360-380`) whose `metadata.candidateOutcomes[]` lists every candidate with `outcome`, `voteCount`, `resultingStatus`, `activated`, `exclusionReason`. | **D** from `AuditLog.userId` (join `User.name`); **A** on the membership row | **P**: `petitionPrimaryDate` (the primary, not the recording date); recording date **D** from `AuditLog.timestamp` | **P**: `status` is the outcome; `metadata.exclusionReason` (`lost_primary`/`tie_primary`) on the audit row | **A** (petitions are not meeting-linked; `meetingRecordId` is never set on this path) | Undo of a discrepancy accept can write a compensating `PETITION_RECORDED` with `metadata.source='discrepancy_undo'` (`app/api/lib/committeeDiscrepancyResolution.ts:142-161`, `handleCommitteeDiscrepancy/undo/route.ts:147-186`); ticket 12 must not label that as a fresh election result. |
| **Addition — Admin direct add** | `AuditLog action='MEMBER_ACTIVATED'`, `entityType='CommitteeMembership'`, `afterValue={status:'ACTIVE', seatNumber}`, `beforeValue=null` (new) or `{status:<prior>}` (re-activation) (`committee/add/route.ts:260-270,291-303`). Membership row: `activatedAt`, `membershipType`, `seatNumber`. | **D**: `AuditLog.userId`. **A** on row (no `activatedById`). | **P**: `activatedAt`; also `AuditLog.timestamp` | **D**: `metadata.overrideReason` + `metadata.bypassedReasons` when Admin force-added (`add/route.ts:136-142`); `metadata.eligibilityWarnings`. Otherwise no reason (none is collected). | **A** (direct add has no meeting) | The same `MEMBER_ACTIVATED` action is also written by: meeting/handleRequest accept (`membershipConfirmation.ts:304-314`, paired with `MEMBER_CONFIRMED`), petition win (`petition-outcomes/record/route.ts:273-290,339-356`, `metadata.source='petition_outcome'`), bulk import (`bulkLoadCommittees/bulkLoadUtils.ts:909-927,961-978`, `metadata.source='bulk_import_sync'`), discrepancy accept (`handleCommitteeDiscrepancy/route.ts:243-268,293-312`, `metadata.source='discrepancy_accept'`). **Disambiguate by `metadata.source` (absent = manual add) or by the presence of a sibling `MEMBER_CONFIRMED` row.** |
| **Addition — Leader submission accepted** (appointment via meeting) | `AuditLog action='MEMBER_CONFIRMED'` then `'MEMBER_ACTIVATED'` in one tx (`membershipConfirmation.ts:292-314`), `afterValue={status, membershipType, seatNumber, confirmedAt, activatedAt, meetingRecordId}`, `metadata.meetingRecordId` (`decisions/route.ts:148`, `handleRequest/route.ts:124-127`). Row: `confirmedAt`, `activatedAt`, `meetingRecordId`, `submittedById`, `submittedAt`. | **P** for the submitter (`submittedById`); **D** for the confirmer (`AuditLog.userId` on the `MEMBER_CONFIRMED` row) | **P**: `submittedAt`, `confirmedAt`, `activatedAt` | **D**: `submissionMetadata.requestNotes` (leader's note, `requestAdd/route.ts:176-190`); `metadata.overrideReason` if force-accepted | **P**: `meetingRecordId` → `MeetingRecord.meetingDate/meetingType/notes` | `meetingRecordId` is required on accept (`handleRequest/route.ts:70-75`), so meeting context is always present for this kind. |
| **Replacement** (leader-requested add with `removeMemberId`) | Intent: `submissionMetadata.removeMemberId` on the *incoming* row (`requestAdd/route.ts:177`, read by `getRemoveMemberIdFromMetadata` `membershipConfirmation.ts:65-76`). Execution on accept: outgoing row set `status='REMOVED', removalReason='OTHER', removalNotes='Replacement request accepted', seatNumber=null` (`membershipConfirmation.ts:194-204`) + `AuditLog action='MEMBER_REMOVED'` with `metadata.reason='replacement'` and `metadata.replacementMembershipId=<incoming id>` (`:205-226`), followed by the `MEMBER_CONFIRMED`/`MEMBER_ACTIVATED` pair for the incoming row. | **D**: `AuditLog.userId` on the `MEMBER_REMOVED` row (the confirming Admin); requester is `submittedById` on the incoming row | **P**: `removedAt` on outgoing, `activatedAt` on incoming; both share the tx timestamp | **P** in effect: `metadata.reason='replacement'` on the audit row; on the membership row it degrades to `removalReason='OTHER'` + the fixed note string | **D**: incoming row's `meetingRecordId` (the outgoing row's `meetingRecordId` is not touched) | **Admin "replace" is remove-then-add** (map Out of scope): two independent `MEMBER_REMOVED` + `MEMBER_ACTIVATED` rows with no cross-reference. Cannot be reconstructed as a single replacement event; only the leader-request path is pairable (via `metadata.replacementMembershipId`). |
| **Resignation** | Row: `status='RESIGNED'`, `resignedAt` (server now), `resignationDateReceived` (user-entered), `resignationMethod` (`EMAIL|MAIL`), `removalReason` (the form's `resignationReason`, same `RemovalReason` enum), `removalNotes` (optional free text) (`committee/remove/route.ts:133-144`). `AuditLog action='MEMBER_RESIGNED'`, `afterValue` mirrors those fields (`:146-168`). | **D**: `AuditLog.userId` (the Admin who recorded it). **A** on row. | **P**: `resignedAt` (recorded) and `resignationDateReceived` (received) | **P**: `removalReason` enum + `removalNotes` free text; `resignationMethod` | **A** | Only Admin can resign a member (`remove/route.ts:225`). Bulk import and discrepancy flows never write `MEMBER_RESIGNED` directly; the discrepancy-undo compensating path *can* (`committeeDiscrepancyResolution.ts:149`) with `metadata.source='discrepancy_undo'`. |
| **Removal** | Row: `status='REMOVED'`, `removedAt`, `removalReason` (`PARTY_CHANGE|MOVED_OUT_OF_DISTRICT|INACTIVE_REGISTRATION|DECEASED|OTHER`), `removalNotes`. `AuditLog action='MEMBER_REMOVED'`, `afterValue={status, removalReason, removalNotes?}`, `metadata.source` ∈ {`'manual'` (`remove/route.ts:207`), `'bulk_import_sync'` + `reason:'not_in_import_file'` (`bulkLoadUtils.ts:717-734`), `'boe_flagging'` + `flagId`, `reason`, `reviewerUserId` (`eligibility-flags/[id]/review/route.ts:232-259`), `'discrepancy_undo'` (`undo/route.ts:128-146`)}, or `metadata.reason='replacement'` (see Replacement). | **D**: `AuditLog.userId`. **A** on row. | **P**: `removedAt` | **P**: `removalReason` + `removalNotes`. "Other" free text lives in `removalNotes`; the manual remove schema requires it when `removalReason === 'OTHER'` and otherwise makes it optional (`lib/validations/committee.ts:217-229`); the resign schema never requires it (`:280-285`). Provenance (`source`) is **audit-only**. | **A** (the meeting-decisions route never touches active members) | System-originated removals (bulk sync, BOE flag, undo) write the same enum `OTHER` with a fixed note; the *honest* reason is only in `AuditLog.metadata.source`. |
| **Pending submission — created** | Row: `status='SUBMITTED'`, `submittedAt`, `submittedById`, `submissionMetadata {removeMemberId?, requestNotes?, email?, phone?, eligibilityWarnings?}` (`requestAdd/route.ts:176-190,315-334`). `AuditLog action='MEMBER_SUBMITTED'`, `afterValue={status:'SUBMITTED'}`, `metadata.eligibilityWarnings?`, `overrideReason?`. | **P**: `submittedById` (only membership-row actor column in the schema) | **P**: `submittedAt` | **D**: `submissionMetadata.requestNotes` | **A** (not yet meeting-linked) | Resubmission after REJECTED/REMOVED reuses the row and resets `submittedAt`/`submittedById` (`requestAdd/route.ts:265-292`); the prior cycle is then audit-only. |
| **Pending submission — rejected** | Row: `status='REJECTED'`, `rejectedAt`, `rejectionNote`, `meetingRecordId` (only when rejected through the meeting route). `AuditLog action='MEMBER_REJECTED'`, `afterValue={status, rejectedAt, rejectionNote, meetingRecordId}` (`membershipConfirmation.ts:369-384`); capacity auto-reject writes `rejectionNote='Committee already full'` + `metadata.reason='capacity'` (`:165-183`). | **D**: `AuditLog.userId` | **P**: `rejectedAt` | **P**: `rejectionNote` (free text or the fixed capacity string); `metadata.reason='capacity'` distinguishes system rejection | **P** via meeting route (`decisions/route.ts:178-183`); **A** via `/api/committee/handleRequest` reject, which passes no `meetingRecordId` (`handleRequest/route.ts:186-190`) | Meeting context is therefore *optional* for rejections. |
| **Pending submission — accepted** | Same as "Addition — Leader submission accepted" above. | | | | | Not a separate kind. |

## 2. Is `AuditLog` queryable per committee, and is it PII-bearing?

### Queryability

There is **no** `committeeListId`, `termId`, or `voterRecordId` column on `AuditLog` (`schema.prisma:516-533`). The only scope columns are `entityType` + `entityId`, indexed together (`:529`). Two query shapes work:

1. **Join through membership ids (recommended; index-backed, works for all rows including pre-2026-06-20).**
   ```ts
   const membershipIds = await prisma.committeeMembership.findMany({
     where: { committeeListId, termId },
     select: { id: true },
   });
   const seatIds = await prisma.seat.findMany({
     where: { committeeListId, termId }, select: { id: true },
   });
   const entries = await prisma.auditLog.findMany({
     where: {
       OR: [
         { entityType: "CommitteeMembership", entityId: { in: membershipIds.map(m => m.id) } },
         { entityType: "Seat", entityId: { in: seatIds.map(s => s.id) } },
       ],
       action: { in: ["MEMBER_SUBMITTED","MEMBER_REJECTED","MEMBER_CONFIRMED","MEMBER_ACTIVATED","MEMBER_RESIGNED","MEMBER_REMOVED","PETITION_RECORDED"] },
     },
     orderBy: { timestamp: "desc" },
     take: N,
     include: { user: { select: { name: true } } },
   });
   ```
   Because a membership row is unique per `(voter, committee, term)`, this pulls every cycle for every voter ever attached to the committee in that term, including rows the membership table has since overwritten.

2. **JSON path on `metadata.subject.committeeListId`** (Prisma `metadata: { path: ["subject","committeeListId"], equals: committeeListId }`). Not index-backed, and **misses every row written before commit `6818cde` (2026-06-20)** because there is no backfill. Not used anywhere in the codebase today (grep for `path: ["subject"` finds nothing). Do not rely on it.

The existing admin reader (`app/api/admin/audit/buildAuditWhere.ts:4-28`) filters only by `action`, `entityType`, `userId`, and date; it has no per-committee filter to reuse.

Per-voter: same shape 1 with `where: { voterRecordId }` on the membership lookup, or `metadata.subject.voterRecordId` with the same pre-June caveat.

### PII for non-Admin readers

Today `AuditLog` is read only by Admin-gated routes (`app/api/admin/audit/route.ts:78`, `/export`, `/users`, `/crosswalk`); no Leader-visible surface reads it. If ticket 06 surfaces it to Leaders, these fields carry PII or sensitive content:

- `metadata.subject.memberName` and `metadata.subject.voterRecordId` on every post-June membership row (`auditMembershipSubject.ts:13-14`). Names at jurisdiction scope are already shown to Leaders by the roster (`app/api/committee/roster/route.ts:57-61`), so **name is Leader-visible by existing policy**; contact is not.
- `afterValue.removalNotes` / `afterValue.rejectionNote` / `submissionMetadata.requestNotes`: free-text entered by Admins or Leaders. May contain anything (health, address, personal circumstances). Not currently classified. Treat as **Admin-only** until someone decides otherwise.
- `afterValue.resignationDateReceived`, `resignationMethod`, `removalReason` enum: not PII per se, but `DECEASED`, `INACTIVE_REGISTRATION`, `PARTY_CHANGE` are sensitive facts about a named person. Recommend Admin-only for the enum, Leader-visible only as a coarse "removed"/"resigned".
- `metadata.eligibilityWarnings`, `metadata.bypassedReasons`, `metadata.overrideReason`: reveal registration-status and Admin override rationale. Admin-only.
- `metadata.subject.email/phone` do **not** exist (the subject is name + location only), but `CommitteeMembership.submissionMetadata.email/phone` do; `fetchCommitteeList` currently leaks them to Leaders by spreading the raw membership (`fetchCommitteeList/route.ts:88-97,144`), which the detail endpoint must not copy.
- Actor identity: `AuditLog.userId` → `User.name/email`. Staff, not voters; whether Leaders may see *which Admin* acted is a policy call not made anywhere today. Suggest Leader sees role (`userRole`) only, Admin sees name.
- `metadata.discrepancyVrcnum`, `metadata.candidateVoterRecordId`, `metadata.flagId`, `metadata.reviewerUserId`: internal ids. Admin-only by default.

## 3. Event kinds that cannot be reconstructed (drop them, do not fake them)

1. **Admin-path replacement as a single event.** Admin replace is remove-then-add with no cross-reference in either the rows or the audit metadata. Only leader-requested replacements are pairable (`metadata.replacementMembershipId`). Ticket 12 should show these as two separate events.
2. **Reason for a plain Admin addition.** No reason is collected on `/api/committee/add` unless `forceAdd` was used. Nothing to show; do not invent "appointed".
3. **Meeting context for resignations, removals, petition outcomes, and direct adds.** `meetingRecordId` is written only on accept/reject of a SUBMITTED membership. No other event can be tied to a meeting.
4. **Actor on the membership row for anything except submission.** Actor is audit-only. If the detail endpoint reads only `CommitteeMembership`, every event except "submitted" has no actor.
5. **Prior lifecycle cycles on the membership row.** Re-add / resubmit wipe `resignedAt`, `removedAt`, `removalReason`, `rejectionNote`, etc. A voter who resigned and was re-added shows only the re-add on the row. History of the earlier cycle is audit-only.
6. **Pre-2026-06-20 audit rows lack `metadata.subject`** (name/location snapshot). Their `entityId` still joins to the membership row, so name can be re-derived from the *current* `voterRecord` relation, but the point-in-time name and seat are gone. Query shape 1 in §2 handles this; JSON-path queries do not.
7. **Petition outcome recording actor on the membership row**, and any petition event that happened before `AuditLog` existed (migration `20260219061109_audit_log_schema`). Only `petitionPrimaryDate` survives on the row.
8. **Meeting-level "what happened at this meeting"** for a committee: `MeetingRecord` has no committee scope; you can list memberships confirmed/rejected at meeting X but not, e.g., "meeting X discussed committee Y" unless a membership links them.
9. **Bulk-import / BOE-flag / discrepancy provenance from the row alone.** Row shows `removalReason='OTHER'` + a canned note; only `AuditLog.metadata.source` distinguishes them. If the endpoint reads only rows, these will look like manual "Other" removals. Prefer the audit `source`.

Unverified (would need to check before relying on it): whether production has any `CommitteeMembership` rows created by the pre-1.5b path without a matching `AuditLog` row at all (i.e. memberships older than migration `20260219061109`). If so, those memberships have `activatedAt` but no audit event; the endpoint should synthesize a minimal "active since" entry from the row rather than show nothing.

## 4. Recommended shape for the detail endpoint's `history` array

Source of truth: `AuditLog` via query shape 1 (§2), enriched from the current `CommitteeMembership` row for the member's display name when `metadata.subject` is missing, and from `MeetingRecord` when `afterValue.meetingRecordId` / `metadata.meetingRecordId` is present. Do not build history from membership columns alone (gaps 4, 5, 9 above). Cap with `take` and expose `hasMore`; do not paginate in v1.

```ts
type HistoryActor = {
  role: PrivilegeLevel;          // AuditLog.userRole — all readers
  name?: string;                 // User.name — Admin only
};

type HistoryMember = {
  voterRecordId: string;         // Admin only (Leaders get name, not id)
  name: string;                  // metadata.subject.memberName ?? current voterRecord name — Leader+ (jurisdiction scope, matches roster policy)
  seatNumber?: number | null;    // afterValue.seatNumber ?? metadata.subject.seatNumber
};

type HistoryMeeting = {          // present only when meetingRecordId resolved
  id: string;
  meetingDate: string;           // ISO
  meetingType: MeetingType;
  notes?: string | null;         // Admin only
};

type HistoryEventBase = {
  id: string;                    // AuditLog.id
  at: string;                    // AuditLog.timestamp, ISO
  actor: HistoryActor;
  member: HistoryMember;
  source?: "manual" | "meeting" | "petition_outcome" | "bulk_import_sync"
         | "boe_flagging" | "discrepancy_accept" | "discrepancy_undo";
                                 // from metadata.source; "meeting" when metadata.meetingRecordId present; default "manual"
};

type HistoryEvent = HistoryEventBase & (
  | { kind: "submitted"; requestNotes?: string /* Admin */; replacementFor?: HistoryMember /* Admin; from submissionMetadata.removeMemberId */ }
  | { kind: "rejected"; meeting?: HistoryMeeting; rejectionNote?: string /* Admin */; systemReason?: "capacity" }
  | { kind: "confirmed"; meeting: HistoryMeeting; membershipType: MembershipType }
      // collapse the MEMBER_CONFIRMED + MEMBER_ACTIVATED pair into one "confirmed" event; key on the CONFIRMED row
  | { kind: "activated"; membershipType?: MembershipType; overrideReason?: string /* Admin */; eligibilityWarnings?: unknown[] /* Admin */ }
      // MEMBER_ACTIVATED with no sibling CONFIRMED and metadata.source !== 'petition_outcome'
  | { kind: "resigned"; effectiveDate?: string /* resignationDateReceived */; method?: ResignationMethod /* Admin */; reason?: RemovalReason /* Admin */; notes?: string /* Admin */ }
  | { kind: "removed"; reason?: RemovalReason /* Admin */; notes?: string /* Admin */; replacedBy?: HistoryMember /* from metadata.replacementMembershipId */ }
  | { kind: "petition_outcome"; outcome: "won" | "lost" | "tie"; seatNumber: number; primaryDate?: string; voteCount?: number | null; reversed?: true /* metadata.source === 'discrepancy_undo' */ }
      // one event per candidate from the CommitteeMembership-entity PETITION_RECORDED rows; ignore the Seat-entity summary row (or use it only to group)
);
```

Privilege matrix (server decides from `session.user.privilegeLevel`, never `actingPermissions`):

| Field group | ReadAccess | Leader (in jurisdiction) | Admin / Developer |
|---|---|---|---|
| `kind`, `at`, `source`, `actor.role`, `member.name`, `member.seatNumber`, `meeting.id/meetingDate/meetingType`, `petition_outcome.outcome/seatNumber/primaryDate/voteCount`, `membershipType`, `resigned.effectiveDate` | no (endpoint is Leader+ like `fetchCommitteeList:177`) | yes | yes |
| `actor.name`, `member.voterRecordId`, `meeting.notes`, `requestNotes`, `rejectionNote`, `resigned.method/reason/notes`, `removed.reason/notes`, `overrideReason`, `eligibilityWarnings`, `replacementFor`, `replacedBy`, `systemReason` | no | no (omit the key, do not null it) | yes |

Two decisions this leaves to tickets 06/12, both of which the map already lists as open: (a) whether the History tab is one merged timeline or sectioned into **Committee history** (`submitted`…`removed`) and **Election outcomes** (`petition_outcome`) — the data supports either; (b) whether Leaders may see `actor.name`; the table above defaults to no because nothing in the repo grants it today.
