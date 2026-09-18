# Whole-App Domain Invariants Review

## Basis
- **Branch:** `feat/srs-implementation` · **Commit:** `daaf2c7` · **Date:** 2026-07-08 · **Model:** `gpt-5-codex`
- **Deliverable:** `docs/WHOLE_APP_DOMAIN_INVARIANTS_REVIEW_gpt-5-codex_2026-07-08.md`
- **Product files:** 356 · **checksum:** `c44a825f107e248477c02b2e8b26782dbd61aec1c8e9d4f8acf994ed38f3fd4c` · **algorithm:** sha256
- **Inventory:** `pnpm review:freeze domain-invariants` · **Scan profile:** `domain-invariants`
- **Methodology:** `docs/review/WHOLE_APP_DOMAIN_INVARIANTS_REVIEW_METHODOLOGY.md`
- **Axis:** domain state validity, transition integrity, audit completeness

## At a glance
| # | Finding | Severity | Blast | Opportunity |
|---|---------|----------|-------|-------------|
| 1 | Petition outcomes can double-occupy a seat | High | medium | Centralize seat activation |
| 2 | Fast report callbacks can leave jobs stuck in PROCESSING | Medium | medium | Mark processing before enqueue |
| 3 | Concurrent term activation can leave multiple active terms | Medium | large | Enforce singleton activation |
| 4 | Removal paths leave stale seat numbers on inactive memberships | Medium | medium | Clear seats on terminal exit |
| 5 | Bulk committee import commits membership changes before discrepancy persistence | Medium | medium | Commit sync and discrepancies together |
| 6 | LTED weighted import can persist stale seat weights | Medium | medium | Recompute in one transaction |
| 7 | Term lifecycle mutations are not audited | Medium | medium | Audit create and activation |
| 8 | BOE flag creation has no audit trail | Low | medium | Audit pending flag creation |

**Counts:** 8 findings · 2 backlog-only notes

## Subsystem map
- **Membership state machine:** high depth. Core transitions live in `apps/frontend/src/app/api/lib/membershipConfirmation.ts`, `apps/frontend/src/app/api/committee/add/route.ts`, `apps/frontend/src/app/api/committee/requestAdd/route.ts`, `apps/frontend/src/app/api/committee/handleRequest/route.ts`, `apps/frontend/src/app/api/committee/remove/route.ts`, `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts`, and `apps/frontend/src/app/api/admin/eligibility-flags/[id]/review/route.ts`.
- **Seat and designation-weight invariants:** high depth. Seat creation, assignment, reconciliation, and reporting run through `apps/frontend/src/app/api/lib/seatUtils.ts`, `apps/frontend/src/app/api/lib/seatReconciliation.ts`, `packages/shared-prisma/src/committeeDesignationWeight.ts`, and `apps/report-server/src/committeeMappingHelpers.ts`.
- **Report job lifecycle:** medium depth. Frontend job rows and callbacks are in `apps/frontend/src/app/api/generateReport/route.ts` and `apps/frontend/src/app/api/reportComplete/route.ts`; worker queue and callbacks are in `apps/report-server/src/index.ts`.
- **Import and discrepancy flows:** medium depth. Bulk sync and discrepancy decisions run through `apps/frontend/src/app/api/admin/bulkLoadCommittees/bulkLoadUtils.ts`, `apps/frontend/src/app/api/admin/bulkLoadCommittees/route.ts`, `apps/frontend/src/app/api/admin/handleCommitteeDiscrepancy/route.ts`, `apps/frontend/src/app/api/admin/handleCommitteeDiscrepancy/undo/route.ts`, and `apps/frontend/src/app/api/lib/committeeDiscrepancyResolution.ts`.
- **Schema and audit surface:** high depth. Persisted invariants and audit actions are in `apps/frontend/prisma/schema.prisma`; audit writers are in `apps/frontend/src/lib/auditLog.ts`.

## Findings

### 1. Petition outcomes can double-occupy a seat
**Severity: High · Blast radius: medium**

**What & where.** Petition outcomes check the current seat holder before the transaction, then directly set each winner to `status: ACTIVE` and `seatNumber` inside the transaction in `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts`. The schema has uniqueness for `Seat` rows and for one active membership per voter/term, but no active occupant uniqueness for `committeeListId + termId + seatNumber` in `apps/frontend/prisma/schema.prisma`. The shared appointment path does lock the committee row and route through `assignNextAvailableSeat` in `apps/frontend/src/app/api/lib/membershipConfirmation.ts` and `apps/frontend/src/app/api/lib/seatUtils.ts`, but petition outcomes bypass that protection.

**Why it hurts.** Two concurrent petition outcome requests for the same vacant seat and different winners can both pass the pre-transaction holder check, then commit two active memberships with the same seat number. The database will not reject it because the existing partial unique index only covers one active membership per voter/term, not one active occupant per seat.

**Opportunity.** Treat petition winner activation as a locked seat transition.

**Evidence.** Mechanical scan `scan-prisma-writes.txt` highlighted the route. Deep read showed `findFirst` holder check before `$transaction`, direct `seatNumber` assignment in the loop, and no schema constraint matching active seat occupancy.

### 2. Fast report callbacks can leave jobs stuck in PROCESSING
**Severity: Medium · Blast radius: medium**

**What & where.** `apps/frontend/src/app/api/generateReport/route.ts` creates a `Report` as `PENDING`, calls the report server, and updates it to `PROCESSING` only after `/start-job` returns. `apps/report-server/src/index.ts` queues the job before responding and later sends the completion callback. `apps/frontend/src/app/api/reportComplete/route.ts` ignores every callback unless the row is already `PROCESSING`.

**Why it hurts.** A quick worker path can finish and call back while the row is still `PENDING`. The callback endpoint returns `received: true, skipped: true`, then the generator marks the row `PROCESSING`; no second callback is guaranteed, so the report can remain non-terminal indefinitely.

**Opportunity.** Move the state transition before job enqueue is observable.

**Evidence.** The relevant order is `Report.create(PENDING)` -> `fetch(PDF_API_URL)` -> `report.update(PROCESSING)` in the frontend, while the server executes `q.push(requestData)` before sending the success response, and the callback handler drops non-`PROCESSING` rows.

### 3. Concurrent term activation can leave multiple active terms
**Severity: Medium · Blast radius: large**

**What & where.** `CommitteeTerm.isActive` is documented as "Only one term active at a time" in `apps/frontend/prisma/schema.prisma`, but there is no unique constraint for the singleton. `apps/frontend/src/app/api/admin/terms/[id]/route.ts` performs `updateMany({ isActive: false })` and then `update({ isActive: true })` as a transaction array without locking a singleton row or conditionally guarding concurrent activations.

**Why it hurts.** Two admins can activate different terms at the same time. If both deactivate the old active row before either writes its new active row, both final updates can commit, leaving two active terms. `getActiveTerm` uses `findFirst`, so subsequent membership, import, and report flows can silently pick whichever active row the database happens to return.

**Opportunity.** Make active-term selection a serialized singleton transition.

**Evidence.** Deep read of the schema and activation route found the convention-only singleton and the non-serialized deactivate-then-activate sequence.

### 4. Removal paths leave stale seat numbers on inactive memberships
**Severity: Medium · Blast radius: medium**

**What & where.** Manual resignation/removal updates in `apps/frontend/src/app/api/committee/remove/route.ts` change the status to `RESIGNED` or `REMOVED` but do not null `seatNumber`. Confirmed eligibility-flag removal in `apps/frontend/src/app/api/admin/eligibility-flags/[id]/review/route.ts` also changes the membership to `REMOVED` without clearing `seatNumber`. Other removal paths, including replacement confirmation and discrepancy undo-created removal, explicitly clear `seatNumber` in `apps/frontend/src/app/api/lib/membershipConfirmation.ts` and `apps/frontend/src/app/api/admin/handleCommitteeDiscrepancy/undo/route.ts`.

**Why it hurts.** The same terminal membership state can either retain or release a seat depending on which route produced it. Current occupancy readers mostly filter to `ACTIVE`, but the persisted row still claims a seat number with no FK to `Seat`; later max-seat decreases can delete the corresponding `Seat` row and leave historical memberships with out-of-range seat values.

**Opportunity.** Apply one terminal-exit seat rule everywhere.

**Evidence.** `scan-prisma-writes.txt` showed the removal writes. Comparing the terminal transitions found direct `status` changes without `seatNumber: null` in two routes and explicit clearing in the shared confirmation/discrepancy paths.

### 5. Bulk committee import commits membership changes before discrepancy persistence
**Severity: Medium · Blast radius: medium**

**What & where.** `apps/frontend/src/app/api/admin/bulkLoadCommittees/route.ts` calls `loadCommitteeLists` first, then opens a separate transaction to delete unresolved discrepancies and upsert the new discrepancy rows. `apps/frontend/src/app/api/admin/bulkLoadCommittees/bulkLoadUtils.ts` performs membership removals, reactivations, creates, seat assignment, and fail-closed audit writes during `loadCommitteeLists`.

**Why it hurts.** If discrepancy persistence fails after `loadCommitteeLists` has committed, committee memberships and seats have already changed but the review queue can be missing or stale. The route can return a generic import failure while leaving durable membership state synchronized to an import whose discrepancies were not durably recorded.

**Opportunity.** Persist import decisions and discrepancy queue atomically.

**Evidence.** Deep read showed `loadCommitteeLists` commits per-committee membership transactions before the route starts the discrepancy cleanup/upsert transaction.

### 6. LTED weighted import can persist stale seat weights
**Severity: Medium · Blast radius: medium**

**What & where.** The single-committee LTED update route keeps `CommitteeList.ltedWeight` and `Seat.weight` recompute in one transaction in `apps/frontend/src/app/api/committee/updateLtedWeight/route.ts`. The bulk weighted-table import in `apps/frontend/src/app/api/admin/weightedTable/import/route.ts` updates `CommitteeList.ltedWeight`, then calls `recomputeSeatWeights` outside a transaction for each matched row.

**Why it hurts.** If recompute fails after the committee update, the persisted LTED weight and cached seat weights diverge. Designation-weight reports depend on `Seat.weight`, so the row can display the new source LTED value while contribution math still uses the old seat cache.

**Opportunity.** Use the same atomic LTED+seat recompute contract in bulk import.

**Evidence.** Side-by-side route read showed the direct route's explicit transaction comment and transactional recompute, while the import loop performs two independent writes.

### 7. Term lifecycle mutations are not audited
**Severity: Medium · Blast radius: medium**

**What & where.** `AuditAction` includes `TERM_CREATED` in `apps/frontend/prisma/schema.prisma`, but `apps/frontend/src/app/api/admin/terms/route.ts` creates terms without any audit write. `apps/frontend/src/app/api/admin/terms/[id]/route.ts` changes which term is active without any audit write or activation-specific audit action.

**Why it hurts.** Active term selection controls which memberships, seats, jurisdictions, invitations, imports, and reports are in scope. Without an audit row, an administrator can create or activate the term that redirects the whole domain state machine with no durable trail.

**Opportunity.** Audit term creation and activation as domain state changes.

**Evidence.** Audit-action scan showed `TERM_CREATED` in the enum and no corresponding production audit call; route deep read confirmed both create and activation return success after writes only.

### 8. BOE flag creation has no audit trail
**Severity: Low · Blast radius: medium**

**What & where.** `packages/shared-prisma/src/boeEligibilityFlagging.ts` collects new `EligibilityFlag` rows and inserts them with `createMany(skipDuplicates: true)`, but only writes audit rows when stale flags are auto-resolved. Human review of a flag is audited later in `apps/frontend/src/app/api/admin/eligibility-flags/[id]/review/route.ts`.

**Why it hurts.** The queue of pending eligibility flags can drive membership removal decisions, but the initial detection event has no durable audit record with the scan source, details, or source report. Later review audit proves the outcome, not the origin of the domain state that prompted the review.

**Opportunity.** Record creation provenance for new pending flags.

**Evidence.** Deep read found `flagsToCreate` and `eligibilityFlag.createMany` with no audit companion, while the stale-resolution branch immediately below writes `auditLog.create`.

## Already good
- Membership confirmation via `apps/frontend/src/app/api/lib/membershipConfirmation.ts` is the strongest state-machine path: it locks the committee, rechecks active conflicts and capacity, handles replacement removal, assigns a seat, and writes fail-closed audit rows in one transaction.
- `apps/frontend/src/app/api/admin/handleCommitteeDiscrepancy/undo/route.ts` stores and checks membership before/after snapshots before undoing, which prevents stale undo operations from overwriting later membership changes.
- The designation-weight engine in `packages/shared-prisma/src/committeeDesignationWeight.ts` throws on duplicate active occupants per seat, giving read paths a clear integrity alarm even though the write-side constraint is incomplete.
- `apps/frontend/src/lib/auditLog.ts` cleanly separates best-effort audit from fail-closed audit, and high-risk membership mutation paths mostly use the fail-closed variant.

## Backlog-only notes

### B1. Seat-number FK modeling remains deferred
**What & where.** `CommitteeMembership.seatNumber` is an integer convention in `apps/frontend/prisma/schema.prisma`, while `Seat` has the real composite identity.  
**Why defer.** The code has several runtime guards and read-side duplicate detection; converting historical membership seat references into a relational model is a schema migration, not a narrow branch-tip bug.  
**Future direction.** Revisit when modeling seat occupancy as a first-class relation.

### B2. Fail-open audit for reference data is explicit but uneven
**What & where.** Reference/config routes such as `apps/frontend/src/app/api/admin/meetings/route.ts`, `apps/frontend/src/app/api/admin/jurisdictions/route.ts`, `apps/frontend/src/app/api/admin/jurisdictions/[id]/route.ts`, and `apps/frontend/src/app/api/admin/crosswalk/import/route.ts` intentionally use best-effort audit.  
**Why defer.** The current helper naming and comments make the behavior explicit, and the highest-risk membership paths use fail-closed audit.  
**Future direction.** Decide which reference data changes are compliance-critical enough to graduate to fail-closed audit.

## Not a finding
- **Admin direct add bypasses confirmation status** - `apps/frontend/src/app/api/committee/add/route.ts` intentionally writes `ACTIVE` for admin direct-add and logs `MEMBER_ACTIVATED`; this is a domain decision, not a transition bug by itself.
- **Rejected capacity confirmation mutates to REJECTED** - `apps/frontend/src/app/api/lib/membershipConfirmation.ts` converts at-capacity confirmation attempts into a rejected membership with fail-closed audit; that is explicit and terminal.
- **Discrepancy undo skips address restore after divergence** - `apps/frontend/src/app/api/admin/handleCommitteeDiscrepancy/undo/route.ts` reports `addressRestoreSkipped` rather than overwriting newer data; that preserves state integrity.
- **Report-complete duplicate callbacks after terminal state** - `apps/frontend/src/app/api/reportComplete/route.ts` skips non-`PROCESSING` rows, which is acceptable after a terminal state; the finding is specifically the `PENDING` callback race before `PROCESSING`.

