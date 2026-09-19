# 06 - Add `GET /api/committee/{committeeListId}/detail`

Type: task
Status: resolved
Blocked by: 04
Parent: ../map.md

## Question

Execute plan §5 "Detail": a `committeeListId`-keyed route composing what `fetchCommitteeList` computes today (memberships, seats, designation-weight summary, petition context) plus pending memberships, recent membership history (shaped by what ticket 04 found is recoverable), and the composite key for adapters.

- Extract shared builders from `fetchCommitteeList` rather than copying; `fetchCommitteeList` itself stays until ticket 16.
- Pending memberships are returned for Leaders in their jurisdiction (read-only is a UI concern; scope is enforced here).
- Zod-define and validate the response in `lib/validations/committee.ts`.

Read `skills/auth-check-patterns/SKILL.md` first. Tests per plan §12.1, including cross-user/cross-jurisdiction `committeeListId` and PII omission. Run the §12.3 commands and checklist before resolving.

## Answer

Resolved 2026-09-19 on `committees-workspace` (uncommitted; parent session commits).

### Files

New (all under `apps/frontend/src/`):

- `app/api/committee/[committeeListId]/detail/route.ts` — `GET`, `withPrivilege(PrivilegeLevel.Leader, …)`. Leader is the right floor: it matches `fetchCommitteeList`, `roster` and `designationWeight`, and the Leader-visible content (names at jurisdiction scope, seat/vacancy counts, pending candidates) is exactly what the Pending tab (plan §7.2) promises Leaders. ReadAccess/RequestAccess get 403 from the wrapper before any query.
- `app/api/lib/committeeRead.ts` — builders extracted from `fetchCommitteeList` and used by both routes: `activeCommitteeInclude(termId)` (ACTIVE memberships + voterRecord, seats in order), `canAccessCommittee(...)` (SRS 3.1 jurisdiction gate), `buildDesignationWeightSummary(committee, termId)`.
- `app/api/lib/petitionOutcomes.ts` — `petitionOutcomeWhere`, `PETITION_OUTCOME_VOTER_SELECT`, `PETITION_OUTCOME_ORDER`, `toPetitionOutcomeContext` extracted from `/api/admin/petition-outcomes`; both routes use them.
- `app/api/lib/membershipHistory.ts` — `buildHistoryEvents` (pure) + `loadMembershipHistory` (AuditLog by `entityType` + membership ids, `take limit+1`, MeetingRecord enrichment).
- `__tests__/api/committee/detail.test.ts` — 37 tests.

Modified:

- `lib/validations/committee.ts` — `committeeDetailParamsSchema`, `COMMITTEE_DETAIL_HISTORY_LIMIT` (50), `designationWeightSummarySchema`, `pendingMembershipSchema`, `petitionOutcomeContextSchema`, `historyActor/Member/Meeting/SourceSchema`, `historyEventSchema` (discriminated union on `kind`), `committeeDetailResponseSchema`; all TS types via `z.infer`. No casts in the route or helpers (the route context is narrowed with `in` checks and Zod, not `as RouteContext` like the older `[id]` routes).
- `app/api/fetchCommitteeList/route.ts` — now calls the three `committeeRead` builders. Behavior and the `findUnique` args asserted by its tests are unchanged; its 25 tests still pass. It still spreads raw memberships (incl. `submissionMetadata` email/phone and full `voterRecord`) to Leaders — left as-is per the ticket; retired in ticket 16.
- `app/api/admin/petition-outcomes/route.ts` — uses the shared where/select/order/mapper; JSON output is identical (the mapper emits `petitionPrimaryDate` as ISO, which is what `NextResponse.json` produced before). Its tests pass.

### Response shape (`CommitteeDetailResponse`)

```ts
{
  committee: { committeeListId, cityTown, legDistrict, electionDistrict, termId, ltedWeight: string | null },
  term: { id, label, startDate, endDate },            // ISO strings
  maxSeatsPerLted: number,
  rollup: EdRollup,                                   // ticket 05's buildEdRollup; pendingCount = SUBMITTED in term
  rows: SeatRosterRow[],                              // ticket 05's buildSeatRosterRows for this committee; contact iff Admin
  designationWeightSummary: { totalWeight, totalContributingSeats, seats[], missingWeightSeatNumbers },
  pending: Array<{
    membershipId, voterRecordId, firstName, lastName, submittedAt, isOwnSubmission,
    replacementFor: { voterRecordId, firstName, lastName } | null,
    submittedBy?: { id, name }, requestNotes?, eligibilityWarnings?, contact?   // Admin only
  }>,                                                 // oldest first
  petitionContext?: PetitionOutcomeContext[],         // Admin only; key absent for Leaders
  history: { events: HistoryEvent[], hasMore: boolean }   // newest first, max 50
}
```

`HistoryEvent = { id, at, actor: { role, name? }, member: { name, seatNumber, voterRecordId? }, source } & (` `submitted | rejected | confirmed | activated | resigned | removed | petition_outcome` `)` — field lists and Admin-only markers are in `historyEventSchema`'s JSDoc; they follow inventory §4 exactly except as noted below.

### Scope and PII rules

- Unknown id → 404. Id whose committee is not in the active term → 404 for everyone (plan §3.10: the workspace is fixed to the active term). Malformed id (non-numeric, 0, negative) → 400.
- Leader whose jurisdictions do not cover the committee → **403** `"You do not have access to this committee"`. That is the codebase convention for a hidden single resource (`fetchCommitteeList`, `designationWeight`); only the list-shaped roster uses 200+empty. Nothing beyond the committee row is read before the check (tests assert no membership/audit queries on 403).
- Admin/Developer skip the jurisdiction lookup entirely. Everything is decided from `session.user.privilegeLevel`; nothing reads client state.
- Admin-only (key omitted, never nulled, for Leaders): `rows[].contact`, `pending[].submittedBy/requestNotes/eligibilityWarnings/contact`, `petitionContext`, `history[].actor.name`, `member.voterRecordId`, `meeting.notes`, `requestNotes`, `replacementFor`, `rejectionNote`, `systemReason`, `overrideReason`, `eligibilityWarnings`, `resigned.method/reason/notes`, `removed.reason/notes`, `replacedBy`. The Leader PII test serializes the whole body and asserts none of the fixture's email, phone, note, meeting-note, or staff-name strings appear.
- Leader-visible: names + VRCNUM on `rows` and `pending` (existing roster policy), `pending[].replacementFor` (structural request data a Leader in the same jurisdiction already sees as a roster member; deliberately more open than history's Admin-only `replacementFor` — flip it in the route if that reads wrong), `pending[].isOwnSubmission`, history `kind/at/source/actor.role/member.name/seatNumber`, meeting id/date/type, petition `outcome/seatNumber/primaryDate/voteCount`, `membershipType`, `resigned.effectiveDate`.
- The petition query is not even issued for Leaders.

### Inventory §4: implemented vs deferred

Implemented as recommended: AuditLog as the only source, query shape 1 (`entityType`+`entityId` over the committee's membership ids), `metadata.subject` optional with fallback to the current voter record name, CONFIRMED+ACTIVATED collapsed to one `confirmed` keyed on the CONFIRMED row, petition-win ACTIVATED folded into `petition_outcome`, `reversed` from `source='discrepancy_undo'`, `hasMore` via `take limit+1`, `systemReason='capacity'`, `replacedBy` from `metadata.replacementMembershipId`, `replacementFor` from the row's `submissionMetadata.removeMemberId`, full privilege matrix (Leader sees `actor.role` only).

Deviations / not implemented:

1. **Seat-entity `PETITION_RECORDED` rows are not queried** (inventory said "ignore or use only to group"). One event per candidate comes from the membership-entity rows; ticket 12 can group by `seatNumber`.
2. **ACTIVATED sibling detection is by `meetingRecordId`**, not timestamp: only the accept path writes it onto the ACTIVATED snapshot, so it is deterministic. Edge: if the CONFIRMED row falls outside the 50-row window while its ACTIVATED is inside, that accept is not shown on that page.
3. `confirmed.meeting` is optional in the schema (inventory had it required) so a missing MeetingRecord cannot 500 the whole detail; it is always present in practice.
4. `petition_outcome.seatNumber` is nullable and `primaryDate` comes from the current row (`petitionPrimaryDate`; the audit row does not carry it). Undo-compensating rows derive `outcome` from `afterValue.status`; if neither is derivable the row is dropped rather than faked.
5. `source` gained an `"other"` value for unknown `metadata.source` strings, and `"meeting"` is set only when the event actually carries a meeting.
6. `submitted.requestNotes` comes from the current row's `submissionMetadata` (the audit row has none), so after a resubmit it is the latest note.
7. Not synthesized: an "active since" entry for memberships with no audit row at all (inventory's unverified pre-`AuditLog` case). Ticket 12 can fall back to `rows`/`activatedAt` if it surfaces.
8. No pagination in v1 (`hasMore` only), as recommended.

### §12.3 checklist

- **Trust boundary:** `GET` is `withPrivilege(PrivilegeLevel.Leader, …)`; `pnpm check:api-routes` passes (70 methods / 60 files).
- **Negative auth:** tests cover unauthenticated (401, no DB), ReadAccess + RequestAccess + Developer-without-permission (403, no DB), Leader cross-jurisdiction (town, and same town / other LD), Leader with no jurisdictions, nonexistent id, out-of-term id for Admin.
- **State race:** n/a — read-only route, no writes.
- **Validation:** route params via `committeeDetailParamsSchema`; every JSON column read (`metadata`, `afterValue`, `submissionMetadata`) is parsed with lenient per-field Zod readers; response typed as `CommitteeDetailResponse` (`z.infer`) and every 200 in tests is parsed with `committeeDetailResponseSchema`. No `as` casts in route or helpers.
- **Data scope:** committee, ACTIVE memberships, pending, petition, and history queries all carry `termId = active term`; Leader access proven by jurisdiction before any secondary query; PII proven Admin-only by serialized-body assertions.
- **Audit/state invariants:** n/a — no mutations, no audit writes.

### Test / lint / build status

- `pnpm --filter voter-file-tool test`: 109 suites / 1457 tests pass; the only failures are the two known pre-existing suites (`api/admin/committeeDiscrepancyMembershipType.test.ts`, `components/committees/CommitteeRequestForm.preflight.test.tsx`, 9 tests), untouched.
- `pnpm --filter voter-file-tool lint`: 0 errors, 12 warnings — all in pre-existing files not touched by this ticket.
- `pnpm --filter voter-file-tool build`: passes (only the pre-existing `keyv` critical-dependency warning); `/api/committee/[committeeListId]/detail` appears in the route table.
- `pnpm check:api-routes`: passes.
- `tsc --noEmit`: clean.
