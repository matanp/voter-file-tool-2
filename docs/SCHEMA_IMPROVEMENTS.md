# Prisma Schema Improvement Proposals

**Scope:** `apps/frontend/prisma/schema.prisma` (whole schema, not a diff).
**Relationship to other docs:** This expands **Finding 13** of
`docs/BRANCH_ARCHITECTURE_REVIEW.md` ("Schema modeling notes") from a six-bullet
appendix into a prioritized, actionable backlog. It also underpins Findings 5 and 10
of that review — the reason designation-weight occupancy is recomputed in application
code is a missing relation described here (§1).

**Axis:** data modeling, referential integrity, and single-source-of-truth — *not*
correctness or security. Each item states current state, the concrete failure it
enables, the proposed change, and an honest migration cost, because every schema change
here carries backfill/migration risk that must be weighed against the payoff.

**How to read the priorities.** Tier 1 items close real integrity gaps that application
code is currently papering over. Tier 2 are consolidations that reduce drift surface.
Tier 3 are hygiene/documentation items — cheap, low-risk, do-when-you-touch-the-file.

---

## Tier 1 — Integrity gaps worth a migration

### 1.1 `CommitteeMembership` → `Seat` is a by-convention integer, not a relation

**Current.** A membership's seat is stored as three loose, unrelated integers:

```prisma
model CommitteeMembership {
  seatNumber          Int?   // matched to Seat.seatNumber by convention only
  petitionSeatNumber  Int?   // ditto, for the petition workflow
  committeeListId     Int
  termId              String
}
model Seat {
  seatNumber      Int
  committeeListId Int
  termId          String
  @@unique([committeeListId, termId, seatNumber])
}
```

There is **no foreign key** from `CommitteeMembership.seatNumber` to `Seat`. The link
"this membership occupies that seat" exists only in code that joins on the tuple
`(committeeListId, termId, seatNumber)`.

**What it enables / costs today.**
- **Occupancy is recomputed everywhere.** `computeDesignationWeightFromData`
  (`lib/designationWeight.ts:61`) rebuilds a `seatNumber → occupant` map on every call,
  and `buildSeatRosterRows` builds a *second* such map over the same data
  (Review Findings 5 and 10). Because the DB can't express "seat X is occupied," every
  read path re-derives it.
- **No referential integrity.** Nothing stops a membership from carrying
  `seatNumber = 7` when only seats 1–4 exist, or two `ACTIVE` memberships from claiming
  the same seat. `computeDesignationWeightFromData` has to defend against exactly this
  at runtime (`throw new Error("Data integrity error: duplicate active memberships on
  seat …")`, `designationWeight.ts:74`) — a check the database should be enforcing.
- **`assignNextAvailableSeat` is a read-scan-in-app** (`seatUtils.ts:86`) that finds the
  lowest free integer instead of relying on a uniqueness constraint on the assignment.

**Proposed.** Introduce a real relation. Two shapes, in increasing order of fidelity:

- **(a) Direct FK.** Add `seatId String?` + `seat Seat? @relation(...)` to
  `CommitteeMembership`, keep `seatNumber` as a denormalized convenience or drop it.
  Add a partial unique index "one ACTIVE membership per seat" (`WHERE status='ACTIVE'`),
  mirroring the existing one-active-per-term index.
- **(b) Assignment join (`SeatAssignment`)** if history matters — a seat can be occupied
  by different members across a term as people resign/are replaced, and (a) loses that
  history on reassignment. A `SeatAssignment { seatId, membershipId, assignedAt,
  vacatedAt? }` records the timeline and lets `vacatedAt IS NULL` be the unique-occupant
  constraint.

**Recommendation.** Start with **(a)** — it removes the recompute-and-defend pattern and
gives the DB the occupancy uniqueness it currently lacks, at modest cost. Only reach for
(b) if seat-occupancy history becomes a product requirement.

**Migration cost:** Medium. Backfill `seatId` by joining existing rows on the
`(committeeListId, termId, seatNumber)` tuple; rows with a `seatNumber` that has no
matching `Seat` surface as data-quality issues to resolve (which is the point). This is
**the single highest-value schema change on the list** — it is called out as "the
strongest of these / worth a ticket" in the branch review.

---

### 1.2 Lifecycle has two sources of truth: `status` enum **and** timestamp columns

**Current.** `CommitteeMembership` encodes its lifecycle twice:

```prisma
status       MembershipStatus @default(SUBMITTED)
submittedAt  DateTime  @default(now())
confirmedAt  DateTime?
activatedAt  DateTime?
resignedAt   DateTime?
removedAt    DateTime?
rejectedAt   DateTime?
```

`status = ACTIVE` is supposed to imply `activatedAt IS NOT NULL`; `status = RESIGNED`
implies `resignedAt IS NOT NULL`; etc. Nothing enforces the correspondence. A route that
sets `status` but forgets a timestamp (or vice versa) produces a row that reports two
different lifecycle states depending on which column you read.

**What it enables.** Reports and warnings query on *both* representations —
`validateEligibility` filters `status: "RESIGNED", resignedAt: { gte: cutoff }`
(`eligibility.ts:107`) — so a mismatch silently changes who is counted. The confirm →
activate service duplication (Review Finding 2) makes drift *more* likely because three
code paths each set this pair by hand.

**Proposed.** Keep `status` as the queryable source of truth and treat the timestamps as
an event log, then add **CHECK constraints** (raw SQL migration; Prisma can't express
them) asserting the implications, e.g.:

```sql
ALTER TABLE "CommitteeMembership" ADD CONSTRAINT membership_active_has_ts
  CHECK (status <> 'ACTIVE' OR "activatedAt" IS NOT NULL);
-- …one per terminal/active state
```

A CHECK is far cheaper than restructuring and immediately stops the drift at write time.
A more thorough alternative is a `MembershipStatusHistory` table (one row per transition,
with actor + timestamp) with `status` as a cached "current" — but that is a larger change
and overlaps with the audit log (§2.3); the CHECK constraints capture most of the value.

**Migration cost:** Low for CHECKs (must first clean any existing violating rows — run a
detection query before adding the constraint). High for the history table; defer.

---

### 1.3 `termId` is denormalized onto three models with no agreement constraint

**Current.** `CommitteeMembership`, `Seat`, and `EligibilityFlag` each carry their own
`termId` *and* a `committeeListId`, while `CommitteeList` also has a `termId`. Nothing
guarantees `membership.termId == membership.committeeList.termId`.

```prisma
model CommitteeMembership { committeeListId Int  termId String }
model Seat                { committeeListId Int  termId String }
model CommitteeList       { termId String }   // @@unique([cityTown, legDistrict, electionDistrict, termId])
```

**What it enables.** A membership can point at a `CommitteeList` belonging to term A while
declaring `termId = B`. Every capacity/occupancy query filters by `committeeListId` **and**
`termId` together (`seatUtils.ts:94`, `designationWeight.ts:180`), so a divergence would
split one committee's members across two term-filtered result sets and under-count
capacity — directly weakening the capacity guard.

**Proposed.** The denormalized `termId` is a legitimate query convenience (it powers the
`[termId, status]` indexes). Keep it, but enforce agreement with a **composite FK**: make
`CommitteeList` expose a unique key on `(id, termId)` and have `CommitteeMembership` /
`Seat` reference `(committeeListId, termId)` against it, so Postgres rejects any row whose
two term references disagree.

**Migration cost:** Medium — requires adding the `@@unique([id, termId])` on
`CommitteeList` (id is already unique so this is free) and rewriting the child FKs. Verify
no existing rows violate agreement first.

---

### 1.4 Partial unique indexes live only in hand-written migrations, invisible to the schema

**Current.** At least **six** integrity constraints exist *only* as raw-SQL migrations and
are documented as `// NOTE:` comments in the schema because Prisma 5.15 can't express
partial indexes:

| Constraint | Migration |
|---|---|
| One `ACTIVE` membership per `(voterRecordId, termId)` | `20260704230000_committee_membership_one_active_per_term` |
| `Invite` pending-email uniqueness (`WHERE usedAt IS NULL AND deleted=false`) | `20260704180000_invite_pending_email_unique` |
| `UserJurisdiction` legDistrict-null uniqueness | `20260221120000_user_jurisdiction_partial_unique_legdistrict_null` |
| `InviteJurisdiction` legDistrict-null uniqueness | `20260621120000_add_invite_jurisdiction` |
| `EligibilityFlag` one-`PENDING`-per-`(membershipId, reason)` | `20260221103000_fix_eligibility_flag_pending_uniqueness` |
| `CommitteeGovernanceConfig` singleton (`ON ((true))`) | `20260218213513_committee_governance_config_singleton` |

**What it enables.** These are load-bearing constraints (the one-active-per-term index is
the last line of defense against the cross-route race that Review Finding 2 describes), but
they are invisible to anyone reading `schema.prisma`, absent from the generated Prisma
Client types, and at risk of being dropped by a future `prisma migrate` reset that doesn't
replay the manual SQL. `isActiveMembershipPerTermConflict` (`committeeValidation.ts:22`)
parses a P2002 error from an index the schema doesn't know exists.

**Proposed.** **Upgrade Prisma** to a version supporting partial indexes
(`@@unique(..., where: ...)` / preview feature), then express all six in-schema and delete
the migration-only shadow definitions. Until then, keep a single canonical list (this
table) so they aren't lost. This is tracked by the existing `// TODO: After upgrading
Prisma…` comment on `Invite`.

**Migration cost:** Low-risk but touches the toolchain (Prisma upgrade + regen). High
payoff for maintainability; do it as its own PR so the client regen is reviewable in
isolation.

---

## Tier 2 — Consolidations that shrink drift surface

### 2.1 Two overlapping eligibility-reason enums

**Current.**

```prisma
enum IneligibilityReason   { NOT_REGISTERED PARTY_MISMATCH ASSEMBLY_DISTRICT_MISMATCH CAPACITY ALREADY_IN_ANOTHER_COMMITTEE }
enum EligibilityFlagReason { PARTY_MISMATCH ASSEMBLY_DISTRICT_MISMATCH VOTER_NOT_FOUND POSSIBLY_INACTIVE }
```

`PARTY_MISMATCH` and `ASSEMBLY_DISTRICT_MISMATCH` appear in both. One is the admission gate
(`validateEligibility`), the other the standing-membership audit
(`detectFlagsForMembership`). This is the schema half of Review **Finding 3** — the two
enums encode the same concepts and can drift apart from the two code predicates that
produce them.

**Proposed.** Define one `EligibilityReason` enum that is the union, plus a code-level
classification of each reason as `hardStop | flag` (and `overridable | non-overridable`).
`NOT_REGISTERED`/`VOTER_NOT_FOUND` are the same fact under two names — collapse them.
Ties directly to unifying the two predicates in the shared package (Finding 3).

**Migration cost:** Medium — enum consolidation requires a value remap on
`EligibilityFlag.reason` and `CommitteeGovernanceConfig.nonOverridableIneligibilityReasons`.
Do it together with the Finding 3 predicate extraction so schema and code move as one.

---

### 2.2 `UserJurisdiction` and `InviteJurisdiction` are the same table twice

**Current.** The two models are field-for-field parallel (`cityTown`, `legDistrict?`,
`termId`, the same `@@unique([..., cityTown, legDistrict, termId])`, the same
legDistrict-null partial index). `InviteJurisdiction` is the pending copy of the scope that
becomes `UserJurisdiction` rows on invite acceptance (`lib/applyPendingInvite.ts`).

**Proposed.** This is acceptable denormalization (the invite copy has no user yet), so the
recommendation is **not** to merge the tables but to (a) share a single Zod/TS type for the
scope tuple so validation can't drift, and (b) add a schema comment on each pointing at the
other, so a change to one prompts a change to the other. If a third "pending scope" carrier
ever appears, revisit extracting a polymorphic `JurisdictionScope`.

**Migration cost:** None (documentation + shared type only).

---

### 2.3 `AuditLog` is polymorphic-by-string with untyped JSON payloads

**Current.**

```prisma
model AuditLog {
  entityType  String   // "CommitteeMembership", "MeetingRecord", …free text
  entityId    String   // no FK
  beforeValue Json?
  afterValue  Json?
  metadata    Json?
}
```

`entityType`/`entityId` are an untyped polymorphic reference with no FK, and the three JSON
columns have no schema-level shape. This is the schema half of Review **Finding 8**: the
audit *reader* switches on `metadata` keys that the *writers* set inconsistently
(`actorUserId` vs `reviewerUserId`), and nothing catches a typo'd key.

**Proposed (schema-side).** `entityType` and `action` should be *enums*, not free strings —
`AuditAction` already is an enum, so `entityType` being a raw `String` is the outlier;
constrain it to a `AuditEntityType` enum. The JSON columns can't be fully typed in Prisma,
but the drift is best fixed in code (typed `AuditMetadata` per action, per Finding 8);
the schema change is just tightening `entityType`.

**Migration cost:** Low (string → enum with a known finite value set; backfill is a
straight map). Pairs with Finding 8's code changes.

---

### 2.4 Two parallel sources of a user's privilege: `User.privilegeLevel` and `PrivilegedUser`

**Current.** `User.privilegeLevel` (per authenticated user) coexists with a separate
`PrivilegedUser { email, privilegeLevel }` table keyed by email. Both are live —
`auth.ts` and `lib/applyPendingInvite.ts` read `PrivilegedUser` to seed/override a user's
level at sign-in/invite time.

**What it enables.** Two records can disagree about a person's privilege (the `User` row
says `ReadAccess`, the `PrivilegedUser` row says `Admin`), and the effective answer depends
on which code path resolved it and when. Given the branch's careful server/client privilege
split (Review "what's already good"), a *data-model* fork in where privilege lives is the
weak point that split can't protect.

**Proposed.** Treat `PrivilegedUser` as what it functionally is — a *pre-provisioning /
allow-list* of emails that should receive a privilege on first sign-in — and make that role
explicit in a schema comment, OR fold it into the `Invite` mechanism (an invite already
carries `email + privilegeLevel`). If it must stay, document that `User.privilegeLevel` is
authoritative post-provisioning and `PrivilegedUser` is seed-only, so no code treats the
latter as a live override after account creation.

**Migration cost:** Low if kept + documented; Medium if unified with invites. **Verify with
the auth owner before changing** — this is privilege-bearing; per `CLAUDE.md` /
`skills/auth-check-patterns`, read that skill before touching it. Flagged here as a modeling
note, not a green-lit refactor.

---

### 2.5 `VoterRecord` and `VoterRecordArchive` duplicate ~40 columns

**Current.** The two models share ~40 identical field definitions (name, address, mailing
address, district, registration columns). `VoterRecordArchive` is the historical/version
table; `VoterRecord` is the live one plus committee relations and `hasDiscrepancy`.

**Proposed.** Keep both models; the split is correct. The hazard is silent drift when a
column is added to one model but not the other. The import path already encodes the
invariant — archive rows spread into `VoterRecord` after stripping
`(id, recordEntryYear, recordEntryNumber)` — but nothing fails when the two schemas
diverge. Minimal improvements (pick any subset; all are low cost):

1. **Schema comment.** Document on both models: shared columns must match; archive-only =
   `(id, recordEntryYear, recordEntryNumber)`; current-only =
   `(latestRecordEntryYear, latestRecordEntryNumber, committeeId, addressForCommittee,
   hasDiscrepancy)` plus relations.

2. **Compile-time key sync.** After `prisma generate`, a type-level assertion that
   `Exclude<keyof VoterRecordArchive, archive-only>` equals
   `Exclude<keyof VoterRecord, current-only>` (using `@prisma/client` types). Fails the
   build when a field is missing from either side.

3. **Schema parse test (optional).** Parse `schema.prisma` in CI and assert shared field
   names *and* types (`String?`, `Int?`, etc.) match pairwise. Catches type mismatches
   the key-only compile check can miss.

4. **Consolidate application field lists.** Drift also lives outside the schema:
   `voterRecordSchema`, `ExampleVoterRecord`, `STRING_FIELDS` / `DATE_FIELDS`, and
   `VOTER_RECORD_UPDATE_FIELDS` are separate hand-maintained lists. A single shared
   manifest (or deriving subsets from generated Prisma types) reduces day-to-day import,
   search, and bulk-update breakage when columns change.

**Migration cost:** None (comments + tests + optional TS consolidation). Listed for
awareness, not action.

---

## Tier 3 — Hygiene, documentation, and consistency

### 3.1 Inconsistent `onDelete` policies across relations

Relations use four different deletion policies with no stated rationale:
- `Cascade`: `Account`, `Session`, `Authenticator`, `VotingHistoryRecord`,
  `InviteJurisdiction`, `EligibilityFlag`, `CommitteeUploadDiscrepancy`, `CommitteeRequest`.
- `Restrict`: `CommitteeList.term`, `UserJurisdiction.term`, `InviteJurisdiction.term`,
  `UserJurisdiction.createdBy`.
- `SetNull`: `VoterRecord.committee`.
- **Unspecified (Prisma default = `Restrict` on required, `SetNull` on optional):**
  `Seat.committeeList`, `Seat.term`, `CommitteeMembership.{voterRecord,committeeList,term,
  meetingRecord,submittedBy}`, `MeetingRecord.createdBy`, `Report.generatedBy`,
  `AuditLog.user`.

The concerning ones are the **audit-relevant** relations left on the default: deleting a
`User` who wrote `AuditLog` rows or created a `MeetingRecord` will be *blocked* (default
Restrict on required FK) — which is probably correct for an immutable audit trail, but it
is implicit. Make the intent explicit (`onDelete: Restrict`) on `AuditLog.user`,
`MeetingRecord.createdBy`, and `CommitteeMembership.submittedBy` so "audit rows pin their
author" is a stated invariant, not an accident of defaults.

**Migration cost:** Low (FK policy change, no data movement).

### 3.2 Derived value stored twice: `CommitteeList.ltedWeight` and `Seat.weight`

`Seat.weight = ltedWeight / maxSeatsPerLted` (recomputed by
`recomputeSeatWeights`, `seatUtils.ts:121`). Storing the per-seat quotient is a deliberate
denormalization (seats can in principle carry independent weights later), but today it is
pure derivation and can go stale if `ltedWeight` or `maxSeatsPerLted` changes without a
recompute call. Document the invariant on `Seat.weight` ("cache of ltedWeight/maxSeats;
maintained by recomputeSeatWeights — do not set directly") or drop the column and compute on
read until per-seat independence is actually needed.

### 3.3 Deprecated relations still in the schema

`VoterRecord.committeeId` + `VoterRecord.committeeMemberList` +
`CommitteeList.committeeMemberList` are marked `// DEPRECATED (SRS 1.2) … removal deferred to
ticket 3.0`, replaced by `CommitteeMembership`. They are **not fully dead** — the
discrepancy/bulk-load legacy path still reads `committeeId`
(`bulkLoadUtils.ts`, `handleCommitteeDiscrepancy/route.ts`). Track ticket 3.0 explicitly:
the migration to remove them is gated on porting those two call sites off `committeeId`.
Leaving a deprecated-but-live FK invites new code from binding to the old model.

### 3.4 Untyped `Json` columns should carry documented shapes

`CommitteeMembership.submissionMetadata`, `CommitteeUploadDiscrepancy.{discrepancy,
resolutionMetadata}`, `EligibilityFlag.details`, `Report.metadata`, `AuditLog.{beforeValue,
afterValue,metadata}` are all bare `Json?`. Only `submissionMetadata` has an inline comment
(`// removeMemberId stores the intended replacement target`). Give each a companion Zod
schema in the code (parsed at read/write boundaries) and a `// shape: …` comment, so the
JSON contract is discoverable and validated rather than implied by whichever writer touched
it last.

### 3.5 Naming and style inconsistencies (cosmetic, batch when convenient)

- **Relation field casing** is mixed: PascalCase (`Report`, `Authenticator`,
  `CommitteeRequest`, `CommitteeDiscrepancyRecords`) alongside camelCase (`memberships`,
  `seats`, `jurisdictions`). Prisma convention is camelCase for fields.
- **`DropdownLists`** is the only pluralized model name.
- **Legacy screaming columns** on `VoterRecord`/`VoterRecordArchive` (`VRCNUM`, `L_T`,
  `DOB`, `CC_WD_Village`) reflect the source data format — fine to keep, but they defeat
  Prisma's `@map` convention and are worth a `@map` pass if the client field names are ever
  cleaned up.
- **`committeList`** — misspelled relation field on `CommitteeRequest`
  (`committeList CommitteeList`, missing the second "e"). Rename with `@map`-free client
  rename when touched.

These are all cosmetic; do them opportunistically when a model is already being edited, not
as a standalone churn PR.

---

## Suggested sequencing

1. **§1.4 Prisma upgrade + express partial indexes** — unblocks expressing everything else
   in-schema and is self-contained (its own PR: upgrade + regen + delete shadow SQL).
2. **§1.1 Membership→Seat relation** — highest product value; removes the recompute-and-
   defend pattern behind Review Findings 5 & 10.
3. **§1.2 lifecycle CHECK constraints** and **§1.3 composite term FK** — cheap integrity
   wins once you're already writing raw-SQL migrations.
4. **§2.1 enum consolidation** — do in lockstep with Review Finding 3's predicate extraction.
5. **§2.3 / §2.4 / §3.x** — fold into the code PRs that already touch audit (Finding 8) and
   auth, or batch as documentation.

**Do not** treat Tier 3 as a reason to rewrite the schema wholesale; the branch review's
standing guidance holds — schema changes carry migration cost that outweighs cosmetic
normalization, so each item above is justified by a concrete integrity failure or a
named drift it prevents.
