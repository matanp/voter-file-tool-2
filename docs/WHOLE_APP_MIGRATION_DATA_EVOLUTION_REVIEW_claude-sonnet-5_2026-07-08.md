# Whole-App Migration & Data Evolution Review

## Basis
- **Branch:** `feat/srs-implementation` · **Commit:** `daaf2c7` · **Date:** 2026-07-08 · **Model:** `claude-sonnet-5`
- **Deliverable:** `docs/WHOLE_APP_MIGRATION_DATA_EVOLUTION_REVIEW_claude-sonnet-5_2026-07-08.md`
- **Product files:** 356 · **checksum:** `c44a825f107e248477c02b2e8b26782dbd61aec1c8e9d4f8acf994ed38f3fd4c` · **algorithm:** sha256
- **Inventory:** `pnpm review:freeze migration`  · **Scan profile:** `migration-data-evolution`
- **Methodology:** `docs/review/WHOLE_APP_MIGRATION_DATA_EVOLUTION_REVIEW_METHODOLOGY.md`
- **Axis:** Existing-data breakage likelihood × rollback/backfill cost

## At a glance
| # | Finding | Severity | Blast | Opportunity |
|---|---------|----------|-------|-------------|
| 1 | Email-canonicalization migration has no dedup step | High | medium | Pre-check/merge case-variant collisions before deploy |
| 2 | One-active-membership-per-term index shipped with no dedup/backfill | High | large | Add dedup step before the partial unique index |
| 3 | Pending Leader invites predating jurisdiction scope fail-closed on acceptance | High | medium | Backfill or fallback UX for zero-jurisdiction Leader invites |
| 4 | Seat backfill leaves every legacy committee at zero designation weight | Medium | medium | Confirm rollout plan for manual seat petitioned/weight pass |
| 5 | BOE auto-resolve audit trail hard-depends on unseeded SYSTEM user | Medium | medium | Enforce SYSTEM user existence via migration, not seed script |
| 6 | Seat reconciliation reads active term outside its transaction | Low | small | Re-read/lock active term inside the reconciliation transaction |

**Counts:** 6 findings · 4 backlog-only notes

## Subsystem map
| Subsystem | Defining surfaces | Depth |
| --- | --- | --- |
| Prisma domain model & migrations | `apps/frontend/prisma/schema.prisma`, migration SQL (boundary context, out of manifest) | high |
| Auth, invites, jurisdictions | `apps/frontend/src/lib/applyPendingInvite.ts`, invite creation/apply routes | high |
| Committee membership & seats | membership add/remove/replace/requestAdd/handleRequest routes, seat/roster utilities, `packages/shared-prisma/src/committeeDesignationWeight.ts` | high |
| Governance config & terms | governance-config and terms admin routes, seat reconciliation | medium |
| Eligibility flagging | `packages/shared-prisma/src/boeEligibilityFlagging.ts`, eligibility-flags run route, `apps/frontend/prisma/seed.ts` | medium |
| Reports & report-server | `.review/report-contract-matrix.tsv`-verified registries/mappings, `apps/report-server/src/reportProcessors/index.ts`, `apps/report-server/src/index.ts` | medium |

## Findings

### 1. Email-canonicalization migration has no dedup step for case-variant collisions
**Severity: High · Blast radius: medium**
**What & where.** `apps/frontend/prisma/schema.prisma` — `User.email` and `PrivilegedUser.email` both carry `@unique`; the schema comment above `model User` documents that historical data was normalized by the `canonicalize_auth_emails` migration.
**Why it hurts.** That migration runs a bare case/whitespace-normalizing `UPDATE` against `User`, `PrivilegedUser`, and `Invite`, with no dedup/merge step. If two existing rows differ only by case or surrounding whitespace (plausible for hand-entered admin/privileged-user rows or old invites), the update violates the unique constraint on `User.email`/`PrivilegedUser.email` or the pre-existing partial unique index on `Invite`, aborting the migration mid-deploy with no rollback story beyond a manual data fix.
**Opportunity.** Have the migration detect/merge or explicitly pre-check for collisions instead of relying on the unique constraint to surface them at deploy time.
**Evidence.** `apps/frontend/prisma/schema.prisma` comment above `User.email` and `PrivilegedUser.email`; cross-checked against the `canonicalize_auth_emails` and `invite_pending_email_unique` migration SQL (out-of-manifest boundary context).

### 2. One-active-membership-per-term uniqueness index shipped with no dedup/backfill step
**Severity: High · Blast radius: large**
**What & where.** `apps/frontend/prisma/schema.prisma` — the `CommitteeMembership` model's NOTE documents a partial unique index (`WHERE status = 'ACTIVE'` on `(voterRecordId, termId)`), enforced at the app level by `apps/frontend/src/app/api/lib/committeeValidation.ts` and consumed by `apps/frontend/src/app/api/lib/membershipConfirmation.ts`.
**Why it hurts.** The migration's purpose is explicitly to close a race that could leave a voter ACTIVE in two committees for the same term — meaning the exact condition the index prevents could already exist in production data. Unlike the governance-config singleton migration (explicit `ROW_NUMBER()` dedup before its partial unique index) or the ineligibility-reasons NOT NULL migration (explicit NULL backfill before the constraint), this migration only issues `CREATE UNIQUE INDEX ... WHERE status = 'ACTIVE'` with no preceding cleanup. If any environment already has a conflicting pair of ACTIVE rows, the migration fails outright at deploy time and blocks all further schema deploys.
**Opportunity.** Add a pre-index dedup/reporting step consistent with the pattern already used elsewhere in this branch's migrations.
**Evidence.** `apps/frontend/prisma/schema.prisma` `CommitteeMembership` NOTE comment; migration SQL for the one-active-per-term index (index-only) versus the governance-config singleton and ineligibility-reasons migrations (explicit dedup/backfill), read as boundary context.

### 3. Pending Leader invites created before jurisdiction scope shipped now fail-closed on acceptance
**Severity: High · Blast radius: medium**
**What & where.** `apps/frontend/src/lib/applyPendingInvite.ts` (`grantInvite`) throws `InviteGrantError` whenever an `Invite` with `privilegeLevel === Leader` has zero rows on its `jurisdictions` relation. `apps/frontend/src/app/api/admin/invites/route.ts` only started requiring at least one jurisdiction at creation time once jurisdiction-scoped invites shipped.
**Why it hurts.** Any Leader `Invite` row created before that validation existed has no `InviteJurisdiction` children — the relation is new, so old rows simply have an empty list rather than violating a DB constraint. Invite expiry is admin-configurable up to 365 days, so such a pending invite can still be outstanding well past the schema change. When that invitee accepts, `grantInvite` throws and the acceptance is permanently blocked, with no admin remediation flow (reissue/backfill-jurisdiction) found in the codebase.
**Opportunity.** Decide on a migration-time backfill or fallback UX for zero-jurisdiction pending Leader invites.
**Evidence.** `apps/frontend/src/lib/applyPendingInvite.ts` (`grantInvite`, `checkAlreadyApplied`); `apps/frontend/src/app/api/admin/invites/route.ts` creation validation; `InviteJurisdiction` table migration (boundary context) shows no backfill for existing `Invite` rows; grep for `InviteGrantError` found no remediation path.

### 4. Seat backfill leaves every legacy committee at zero designation weight
**Severity: Medium · Blast radius: medium**
**What & where.** `apps/frontend/prisma/schema.prisma` — `Seat.isPetitioned Boolean @default(false)` and `Seat.weight Decimal?`, consumed by `packages/shared-prisma/src/committeeDesignationWeight.ts`.
**Why it hurts.** The `Seat` model's introducing migration backfills one `Seat` row per existing `CommitteeList` slot with `isPetitioned = false` and `weight = NULL`. `computeDesignationWeight`'s rules exclude non-petitioned seats from weight entirely and flag petitioned seats with null weight via `missingWeightSeatNumbers`. Every pre-existing committee therefore starts at zero designation weight until an operator manually marks seats petitioned/weighted — a real but likely intentional gap, since the schema comment marks `isPetitioned` as "set by petition workflow (future)."
**Opportunity.** Confirm the rollout plan accounts for a manual one-time pass to mark existing petitioned seats before designation-weight reports are trusted for the current term.
**Evidence.** `apps/frontend/prisma/schema.prisma` `Seat` model and comment; `Seat`-introducing migration backfill INSERT (boundary context); `packages/shared-prisma/src/committeeDesignationWeight.ts` non-petitioned/null-weight exclusion logic.

### 5. BOE auto-resolve audit trail hard-depends on a seeded SYSTEM user with no migration-time guarantee
**Severity: Medium · Blast radius: medium**
**What & where.** `packages/shared-prisma/src/boeEligibilityFlagging.ts` (`runBoeEligibilityFlagging`) writes `AuditLog` rows and sets `EligibilityFlag.reviewedById` to a fixed `SYSTEM_USER_ID`. `AuditLog.userId` is a required foreign key to `User.id` in `apps/frontend/prisma/schema.prisma`. The `"system"` user is created only by `apps/frontend/prisma/seed.ts`.
**Why it hurts.** Prisma seed scripts are not applied automatically by `prisma migrate deploy` — they need a separate, often manual, `prisma db seed` run. Any environment migrated without re-running that seed will fail with a foreign-key violation the moment the auto-resolve path in `runBoeEligibilityFlagging` runs (invoked from the eligibility-flags run route), because `User.id = "system"` won't exist yet.
**Opportunity.** Make the SYSTEM user's existence enforced by migration (e.g. an idempotent data-migration insert) rather than relying solely on the seed script.
**Evidence.** `packages/shared-prisma/src/boeEligibilityFlagging.ts` SYSTEM_USER_ID usage; `apps/frontend/prisma/seed.ts` SYSTEM user upsert; `apps/frontend/prisma/schema.prisma` `AuditLog.userId` required relation.

### 6. Seat reconciliation reads the active term outside the governance-config transaction
**Severity: Low · Blast radius: small**
**What & where.** `apps/frontend/src/app/api/admin/governance-config/route.ts` resolves the active term before opening its `prisma.$transaction`, then passes that term id into seat reconciliation inside the transaction without re-validating it's still active at commit time.
**Why it hurts.** If an admin flips the active term via `apps/frontend/src/app/api/admin/terms/[id]/route.ts` between the pre-transaction read and the reconciliation transaction, seat creation/deletion could apply against a term that's no longer active, silently mis-reconciling seat counts with no surfaced error. Low likelihood (requires two concurrent admin actions) but no guardrail exists today.
**Opportunity.** Re-read/lock the active term inside the transaction before reconciling.
**Evidence.** `apps/frontend/src/app/api/admin/governance-config/route.ts` active-term read placement relative to `$transaction`; `apps/frontend/src/app/api/admin/terms/[id]/route.ts` has no locking/version check on active-term flips.

## Already good
- **`CommitteeList.termId` FK rollout** — `apps/frontend/prisma/schema.prisma`'s `CommitteeList` model added a required `termId` FK and re-scoped its unique constraint, but the introducing migration follows the correct nullable-add → backfill → set-NOT-NULL → index-swap sequence, backfilling every existing row to a default term first. A model for how to add a required relation onto an existing table.
- **`MembershipStatus.PETITIONED_WON` enum removal** — the removing migration canonicalizes historical rows to `ACTIVE` via a rename-recreate-cast pattern before dropping the old value, and every app consumer (`apps/frontend/src/app/committees/CommitteeSelector.tsx`, `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts`, `apps/frontend/src/app/api/lib/committeeDiscrepancyResolution.ts`, `apps/frontend/src/lib/validations/committee.ts`) was updated in lockstep.
- **`CommitteeGovernanceConfig.nonOverridableIneligibilityReasons` NOT NULL tightening** — the introducing migration explicitly backfills NULLs to an empty array before adding the constraint.

## Backlog-only notes

### B1. `CommitteeList.committeeId` legacy column still live alongside `CommitteeMembership`
**What & where.** `apps/frontend/prisma/schema.prisma` still carries `VoterRecord.committeeId Int?` marked deprecated alongside the newer `CommitteeMembership` relation.
**Why defer.** Deferred by design pending a later cutover ticket; not a current breakage.
**Future direction.** Any future migration touching `VoterRecord` must keep both sources of truth in sync until the deprecated column is removed.

### B2. `TERM_CREATED` audit action defined but never emitted
**What & where.** `apps/frontend/prisma/schema.prisma` defines `AuditAction.TERM_CREATED` and `apps/frontend/src/app/admin/audit/auditUtils.ts` has a label for it, but neither `apps/frontend/src/app/api/admin/terms/route.ts` nor `apps/frontend/src/app/api/admin/terms/[id]/route.ts` call the audit logger.
**Why defer.** Audit-completeness gap, not a data-shape or backfill risk.
**Future direction.** Add audit logging to term create/activate to match the pattern used in governance-config and petition-outcomes.

### B3. `Report.ReportType` enum can't distinguish `ldCommittees` from `committeeRoster` after persistence
**What & where.** `apps/frontend/prisma/schema.prisma`'s `Report.ReportType` enum stores only `CommitteeReport` for both the legacy `ldCommittees` type and the newer scoped `committeeRoster` type.
**Why defer.** No current consumer reads the persisted enum back to gate access or re-derive behavior; purely latent.
**Future direction.** If a future feature needs to disambiguate, capture the originating literal in `Report.metadata` at creation time.

### B4. `apps/report-server/src/reportProcessors/index.ts` only exports the absentee processor
**What & where.** The barrel file re-exports just the absentee processor; every other report type is still dispatched inline in an if/else chain in `apps/report-server/src/index.ts`.
**Why defer.** All Prisma `ReportType` enum values have a working worker branch today (verified against the report contract matrix); this is a partial-refactor signal, not a migration-evolution bug.
**Future direction.** Finish extracting remaining processors into `reportProcessors/` so the barrel file is the authoritative dispatch surface.

## Not a finding
- **`PrivilegeLevel.Leader` enum insertion mid-type** — app-level privilege comparisons use an explicit `PRIVILEGE_ORDER` array rather than DB enum ordinal, so insertion position doesn't affect authorization logic.
- **`ReportType` enum additions** (`SignInSheet`, `DesignationWeightSummary`, `VacancyReport`, `ChangesReport`, `PetitionOutcomesReport`) — pure additive values; the report contract matrix shows full coverage across schema, mappings, registries, and worker branches.
- **`EligibilityFlag` partial-unique reshape to `pending`-only uniqueness** — only narrows an existing constraint, which can only make previously-illegal states legal, not the reverse.
- **`UserJurisdiction`/`InviteJurisdiction` partial unique indexes not expressible in `schema.prisma`** — a known, documented Prisma limitation with a matching comment and runtime check in app code; drift is tracked, not a surprise.
- **`shared-prisma/src/index.ts` re-export completeness** for newer SRS models/enums — real gap but a package-boundary/API-surface completeness issue, not an existing-data breakage or backfill-cost issue; belongs to the architecture vector.
- **`ensureSeatsExist`/`assignNextAvailableSeat` ordering** — every call site guarantees seat rows exist immediately before assigning a seat number; no path assigns without first ensuring existence.
- **`bulkLoadCommittees` re-deriving seat numbers for legacy rows with `seatNumber: null`** — a deliberate repair path, not a gap.
- **`CommitteeMembership.membershipType` nullable field read in report-server label logic** — every write path coalesces `membershipType ?? "APPOINTED"` before/at write time, and a historical backfill migration already fixed pre-existing ACTIVE rows.
- **Non-petitioned seats selectable in petition-outcomes UI** — already tracked as `docs/SRS/tickets/P1-petition-outcomes-non-petitioned-seat-picker.md`; not a fresh migration-lane finding.
- **`CommitteeUploadDiscrepancy.resolvedAt`/`resolution` nullable columns** — the undo route null-checks both before proceeding, and no legacy row can be in a "resolved but resolvedAt is null" state given the prior delete-on-resolve behavior.
- **`report-contract-matrix.tsv` blank `type_mapping` cells** for several report types — a tool-parsing artifact (the matrix generator misses keys nested inside a spread object); confirmed all mappings are actually present by reading the source directly.
- **`boeEligibilityFlagging` missing from the Prisma `ReportType` enum** — intentional; it's a worker-only follow-up job never persisted to the `Report` table, documented in `skills/adding-reports/SKILL.md`.
- **Seat rows missing for committees created before the `Seat` model** — the roster builder synthesizes virtual vacant seats in-memory rather than crashing when a committee has zero seat rows.
