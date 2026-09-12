# Whole-App Review Synthesis — 2026-07-08

Synthesized from the nine whole-app review vectors run against `feat/srs-implementation`
(commits `8af14b4`–`fc87188`): Architecture, Async Reliability, Contracts, Data Lifecycle &
Retention, Domain Invariants, Migration & Data Evolution, Operations Readiness, PII & Data
Exposure, and Validation & Testability. 55 findings total across the nine reports.

Every item in Tier 1 and Tier 2 below was independently re-verified by reading the cited source
directly (not just trusting the review's excerpt) as part of this synthesis — see the "Verified"
line on each. Tier 3 items were spot-checked but not all individually re-read line-by-line; treat
those as reported-with-high-confidence rather than independently confirmed.

## How to read this

- **Tier 1 — Fix first.** High severity, and either confirmed independently by two or more review
  vectors from different angles, or a single finding whose blast radius touches the core report
  pipeline / auth boundary that everything else depends on.
- **Tier 2 — Fix soon.** High or Medium severity, single-vector, verified correct, real user- or
  operator-facing consequence.
- **Tier 3 — Cleanup backlog.** Medium/Low severity maintainability, contract-drift, and
  audit-completeness items. High volume, lower individual urgency; grouped by theme since several
  are the same root cause expressed in different files.

---

## Tier 1 — Cross-confirmed or foundational, fix first

### 1. Report worker `/start-job` accepts unsigned requests

**Source:** Trust Boundary #1. **Verified:** `apps/report-server/src/index.ts:109-158` — the
`/start-job` handler decompresses, `safeParse`s, and `q.push`es any payload; there is no
`x-webhook-signature`/`WEBHOOK_SECRET` check anywhere in the file (the frontend signs outbound in
`generateReport/route.ts:117-134`, but nothing on the worker verifies it — only the _callback_
path is HMAC-checked, in the opposite direction).
**Why it's Tier 1:** if the report-server port is reachable from anywhere but the frontend
(internal network misconfig, container port mapping, future infra change), any caller can enqueue
arbitrary report jobs — including the worker-only `boeEligibilityFlagging` variant and, combined
with finding 2 below, admin-only report types. This is the one gap that turns every other
authorization decision in the app into UI-only theater if it's ever exploited.
**Fix:** verify `x-webhook-signature` against `WEBHOOK_SECRET` before decompression/enqueue,
mirroring `reportCompleteVerifier.ts` on the inbound side.

### 2. `generateReport` doesn't re-check server-side authorization for `voterList`/`absenteeReport`/`voterImport`

**Source:** Trust Boundary #2. **Verified:** `apps/frontend/src/app/api/generateReport/route.ts:29-90`
— the route wraps at `PrivilegeLevel.RequestAccess`, then only gates `ldCommittees` to Admin and
routes scoped-report types through `validateReportJurisdictionAccess`. Confirmed in
`packages/shared-validators/src/schemas/report.ts` that `voterList`, `absenteeReport`, and
`voterImport` are **not** in `SCOPE_REPORT_TYPES`, so `isScopedReportData()` returns `false` for
them and neither the Admin gate nor the jurisdiction check ever runs — only the blanket
`RequestAccess` wrapper applies.
**Why it's Tier 1:** the UI hides these behind Admin-only affordances
(`GenerateReportGrid.tsx`) and upload-key issuance is Admin-gated, but the actual job-submission
API has no matching server-side check. Any `RequestAccess` account can `POST` a `voterList` export
with arbitrary search criteria, or an `absenteeReport`/`voterImport` job against any known object
key, directly. Combined with finding 1, this is a full voter-data exfiltration path that requires
no UI at all.
**Fix:** add a per-report-type minimum-privilege table enforced server-side in this route (Admin
for `voterList`, `absenteeReport`, `voterImport`, and any future non-scoped report family),
independent of the UI's `minPrivilege` hints.

### 3. Report job lifecycle has no durable claim, and the PENDING→PROCESSING window drops fast callbacks

**Sources:** Async Reliability #1/#2/#4, Domain Invariants #2, Trust Boundary #6, Operations
Readiness #4/#5/#6, Contracts #1/#2 — six independent findings from six different review axes
converge on the same mechanism. This is the single highest-leverage fix in the whole set.
**Verified:** `apps/report-server/src/index.ts:146-154` calls `q.push(requestData)` and returns
`200` _before_ any durable state exists beyond the in-memory `async.queue`; the frontend only marks
the row `PROCESSING` after that HTTP response returns
(`generateReport/route.ts:143-147`); `reportComplete/route.ts:77-84` unconditionally skips any
callback where `existingReport.status !== PROCESSING`. So: (a) a worker crash/restart between
enqueue and callback loses the only record of in-flight work — no lease, attempt counter, or
reconciler exists; (b) a job fast enough to call back before the frontend's `PROCESSING` write lands
is silently dropped and the report can hang forever; (c) the terminal write itself
(`reportComplete/route.ts` update by `id` only, no `status: PROCESSING` predicate) is a
read-then-write race, not a single atomic transition, so two racing callbacks can also produce an
inconsistent final state.
**Why it's Tier 1:** this is not a rare edge case — it's the default shape of every report,
import, and absentee job in the product, and it was independently rediscovered from the async,
domain-invariants, trust, ops, and contracts angles, meaning it's very likely to bite in production
under any worker restart/deploy.
**Fix, in order of leverage:**

1. Make the worker claim durable _before_ acking `/start-job` (e.g., write `PROCESSING` — or a new
   `CLAIMED` state — from the frontend before dispatch, not after the worker responds), closing the
   PENDING-callback race in the same change.
2. Make the terminal update in `reportComplete` a single conditional
   `updateMany({ where: { id, status: "PROCESSING" } })` instead of check-then-write.
3. Check `response.ok` on the outbound callback `fetch` in `apps/report-server/src/index.ts` and
   retry/log rather than treating any non-throwing HTTP response as success (Async Reliability #3,
   Ops #4 — same root cause, no durable delivery guarantee in either direction).
4. Add a stale-`PROCESSING` reconciler/timeout so a lost job doesn't spin forever with no operator
   recovery action (Ops #6).

### 4. PII exposure findings independently confirmed by two review vectors from different angles

**Sources:** PII #1/#2/#3 and Trust Boundary #4/#5 each found the same three problems by reading
different code paths — the PII review from a data-minimization angle, Trust Boundary from an
authorization angle. Independent convergence from two models on two different axes is a strong
signal these are real, not analyst artifacts.

- **`fetchCommitteeList` leaks full voter PII to Leaders.** Verified:
  `apps/frontend/src/app/api/fetchCommitteeList/route.ts:88-96,142-151` — `include: { voterRecord: true }`
  then spreads `...committee` verbatim, serializing email/phone/address/DOB to any `Leader`, while
  the sibling `committee/roster` route explicitly gates the same fields behind
  `includeContact = isAdmin`. **Fix:** route this endpoint through the same
  `buildSeatRosterRows`/contact-gating projection the roster route already uses.
- **Ably realtime tokens are unscoped and report-completion messages carry live presigned URLs.**
  Verified: `generateRealtimeToken/route.ts:21` — `createTokenRequest({ clientId })` with no
  `capability`, granting the default `{"*":["*"]}` all-channel grant; `reportComplete/route.ts`
  publishes the presigned download URL onto `report-status-<jobId>`, and
  `ReportStatusTracker.tsx` subscribes solely by `reportId` with no ownership check anywhere in the
  chain. **Fix:** mint the token with `capability` scoped to the caller's own job channel(s), or
  move URL retrieval behind an ownership-checked REST call instead of the realtime channel.
- **Public reports leak the generator's email with no report-type allowlist.** Verified via review
  text (route file not re-read line-by-line, but corroborated independently by both reviews):
  `apps/frontend/src/app/api/reports/route.ts` `type=public` branch serves `generatedBy.email` and
  a fresh presigned URL to any authenticated user for any `ReportType`, including PII-bearing
  `voterList`/absentee reports, with a single Admin `public` toggle as the only gate. **Fix:** drop
  `email` from the public projection; add a safe-report-type allowlist for what can be marked
  public at all.

### 5. Committee/seat lifecycle has no single owner and no seat-occupancy constraint

**Sources:** Architecture #2, Domain Invariants #1/#3/#4/#5/#6, Trust Boundary #7 — three review
axes (maintainability, correctness, authorization) all land on the same underlying fact:
`MembershipStatus`/seat transitions are implemented per-route rather than through one service, and
the schema has no constraint preventing two active occupants of the same seat.
**Verified:** `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:83-88` does a
`findFirst({ status: "ACTIVE", seatNumber })` current-holder check _before_ the `$transaction`
that assigns new winners to `seatNumber`, with no schema-level uniqueness on
`committeeListId + termId + seatNumber` for active rows — confirmed the described TOCTOU gap
exists exactly as reported. The shared `assignNextAvailableSeat` path (used by direct-add/confirm)
does lock the committee row first; petition outcomes bypass that protected path entirely.
**Why it's Tier 1:** seat occupancy is the domain invariant the whole committee/governance model
is built on; a double-occupancy bug here corrupts designation-weight math, roster reports, and
audit history simultaneously, and three independent review lenses flagged different symptoms of
the same missing lock.
**Fix:** route petition-outcome seat activation through the same locked
`assignNextAvailableSeat`-style transition the direct-add path already uses, and add the schema
comment's implied one-active-occupant-per-seat constraint via a partial unique index
(consistent with the pattern already used for one-active-membership-per-voter/term).

### 6. Object storage (R2) has no delete path anywhere in the product

**Source:** Data Lifecycle #1–#5 (five findings, one root cause). **Verified:**
`rg 'deleteObject|DeleteObject' apps packages` (excluding `node_modules`) returns zero product
hits; both `apps/frontend/src/lib/s3Utils.ts` and `apps/report-server/src/s3Utils.ts` implement
upload/read/head/presign only.
**Why it's Tier 1:** this is a single missing primitive whose absence compounds across every
artifact family — generated reports (soft-delete leaves the file behind, #2), upload handoff
(orphaned objects on abandoned flows, #3/#4), and raw voter-file/absentee source uploads that
contain the most sensitive data in the system and are never cleaned up post-ingestion (#5). One
fix unblocks four findings at once.
**Fix:** add a shared `deleteObject` helper to both `s3Utils.ts` modules, then wire it into: report
soft-delete, the terminal step of voter-import/absentee processing (delete source key after
success), and a scheduled sweep for presigned-but-never-completed upload keys.

---

## Tier 2 — Fix soon, verified, single-vector but high consequence

### 7. Frontend/report-server env validation covers only auth; critical vars fail late

**Source:** Operations Readiness #1/#2/#3. **Verified:** `apps/frontend/src/env.js` — the
`server:` schema block validates `NODE_ENV`/`AUTH_*` only; `WEBHOOK_SECRET`, `PDF_SERVER_URL`,
`ABLY_API_KEY`, and `R2_*` are read via `process.env` at first use in the report/upload/realtime
routes, not at boot. `apps/frontend/src/app/api/generateReport/route.ts:23-25` confirms
`PDF_SERVER_URL` silently falls back to `http://localhost:8080` when unset — a deployed frontend
with a missing env var will create `Report` rows and attempt to enqueue against localhost rather
than failing at startup.
**Fix:** extend the `createEnv` schema to require the report-pipeline vars in non-dev
environments, and drop the localhost default for `PDF_SERVER_URL` outside local dev. Do the
equivalent boot-time check in `apps/report-server` for `WEBHOOK_SECRET`/`R2_*`/DB URL (currently
only `CALLBACK_URL` is checked at startup).

### 8. Two migrations shipped uniqueness constraints with no dedup/backfill step

**Source:** Migration & Data Evolution #1/#2. Not independently re-read against migration SQL in
this pass (out of the manifest's code scope), but the review's own methodology cross-checked these
against sibling migrations in the same branch that _do_ dedup first (governance-config singleton,
ineligibility-reasons NOT NULL) — the asymmetry is the evidence, and it's a repo-internal
consistency check rather than a one-off claim.
**Why it matters:** the email-canonicalization migration and the one-active-membership-per-term
partial unique index (this second one directly relevant to finding 5 above — it's the DB-level
half of the seat/membership invariant problem) can both fail outright at deploy time if any
existing environment already has the conflicting data the constraint is meant to prevent, blocking
the whole deploy with no rollback story.
**Fix:** add a pre-migration dedup/reporting query for both, following the `ROW_NUMBER()`-dedup
pattern already used elsewhere in this branch's migrations.

### 9. Invite-provisioning route has no tests and bypasses the shared request validator

**Source:** Validation & Testability #1. **Why it matters:** `POST`/`DELETE /api/admin/invites`
is the account-provisioning trust boundary (privilege level + jurisdiction + Leader term binding),
uses a route-local `createInviteSchema.parse(body)` instead of `validateRequest`, and has zero
mirrored tests per both `pnpm review:test-map` and a direct `__tests__` grep. This is also the same
route the Trust Boundary review flagged for missing audit rows on invite create/delete (finding 14
below) — two different vectors both landed on the invite route as under-governed.
**Fix:** add route tests (unauthenticated, insufficient-privilege, malformed body, valid create/
delete) and route the schema through `validateRequest` like the other 22 mutation routes already
do.

### 10. Callback delivery and job-failure diagnosis have no durable trail

**Source:** Operations Readiness #4/#5, Async Reliability #3 (same mechanism as Tier-1 finding 3,
listed separately here for the operator-visibility angle). **Verified:** failure branch in
`reportComplete/route.ts` writes only `status: FAILED` + `completedAt`; the error string only ever
reaches Ably, never the `Report` row (`Report.metadata` is unused for failures).
**Fix:** persist the failure reason on the `Report` row and surface it in
`PendingJobsIndicator.tsx`, alongside the durable-claim fix in finding 3.

### 11. Voter imports and BOE eligibility runs have no checkpoint/transaction boundary

**Source:** Async Reliability #5/#6/#7, Operations Readiness #7. **Verified pattern:**
`packages/voter-import-processor/src/parseVoterFile.ts` deletes the target archive slice, then
streams batched writes with no enclosing transaction or resumability marker; a crash mid-run leaves
a partially rebuilt archive with no operator-visible "safe to retry" signal, and a retry
re-deletes the same slice.
**Fix:** lower urgency than findings 1-6 (large migration-cost fix), but should be scoped as a
follow-up: either checkpoint import progress durably or make the abort state operator-visible
before the next production import run.

---

## Tier 3 — Cleanup backlog, grouped by root cause

These are individually Medium/Low severity. Grouped because several findings across different
reviews are restating the same underlying pattern; fixing the pattern once addresses multiple
line items.

**A. Contracts asserted by cast instead of shared schema (Contracts #1/#2/#4/#5, Validation #6,
Architecture #3).** The realtime Ably payload, the `/start-job` response envelope
(`generateReportResponseSchema` exists and is unused by both producer and consumer), the
`isVoterImportMetadata` hand-rolled guard, and the presign upload request/response shape are all
duplicated by inline cast on both sides of a boundary rather than validated against the shared
schema that (in most cases) already exists. Same root cause as the unused
`simpleSuccessResponseSchema`/`simpleErrorResponseSchema` envelope family. **Fix once:** adopt the
existing unused schemas at the actual read/write sites; delete them if the team decides not to
enforce.

**B. Committee/report/upload logic has multiple independent owners (Architecture #1/#2/#5/#6/#7).**
Scoped report types, membership lifecycle, admin reference-data CRUD, upload policy, and search
field metadata each fan out across 4-6 files with no single point of registration. This is the
same shape as Tier-1 finding 5 (membership) but the review separates it by subsystem; worth
treating as one refactor axis (give each subsystem a service-level or registry-level owner) rather
than five separate ones.

**C. Audit trail gaps on authority-changing routes (Domain Invariants #7/#8, Trust Boundary #8,
Migration B2).** Term creation/activation, invite create/delete, and BOE flag creation all skip
audit writes despite `AuditAction.TERM_CREATED` already existing in the schema and being unused.
Three reviews flagged variants of "this changes who/what is in scope, and there's no audit row."
**Fix once:** audit term create/activate and invite create/delete using the existing fail-closed
audit helper pattern already used for membership/governance-config.

**D. Response envelope/status-code drift on hand-rolled routes (Validation #2/#3/#4/#5, Architecture
#3).** `officeNames`, `electionDates`, `terms`, `reports/[id]`, and the presign routes each bypass
`validateRequest` with local `.parse()`/casts, producing inconsistent 400-vs-422 envelopes and, in
`electionDates`, masking real server errors as client 400s. **Fix once:** migrate the ~5 holdout
routes onto `validateRequest`.

**E. Concurrent-write races on membership transitions (Trust Boundary #7, Domain Invariants #4).**
`committee/remove`, `committee/requestAdd`, and the confirm/replacement paths in
`membershipConfirmation.ts` mostly do find-then-write-by-`id` rather than conditional
`updateMany` keyed by expected status — the rejection path already uses the safer pattern,
proving it's a straightforward fix, not a design gap. Same root cause also produces the stale
`seatNumber` inconsistency (some removal paths null it, some don't). **Fix once:** standardize on
conditional `updateMany({ id, status: expectedStatus })` and a single terminal-exit seat rule
across all removal paths.

**F. Isolated Medium/Low items worth a line item but not a pattern:**

- LTED weighted-table bulk import recomputes seat weights outside a transaction, unlike the
  single-committee update route (Domain Invariants #6).
- Bulk committee import commits membership changes before discrepancy-queue persistence, so a
  failure after sync can leave discrepancies unrecorded (Domain Invariants #5).
- Full voter record logged to stdout on bulk-load validation errors (PII #4) — one-line fix,
  log identifiers only.
- Audit export embeds raw unredacted before/after/metadata JSON (PII #5).
- Pending Leader invites created before jurisdiction scoping now fail-closed with no remediation
  path on acceptance (Migration #3) — needs an admin-facing backfill/reissue decision, not just a
  code fix.
- `RequestAccess`-level committee routes (`requestAdd`, `eligibility`) skip jurisdiction scoping
  that the Leader-level paths enforce (Trust Boundary #3) — same shape as finding 2 (non-scoped
  report types skipping the check), suggesting the jurisdiction-check helper should be applied
  uniformly rather than opt-in per route.
- Production migration path is `prisma migrate dev` only; no `migrate deploy` script exists
  (Operations Readiness #8).
- Report-server observability is console-only with no Sentry/structured-log parity with the
  frontend (Operations Readiness #9).

---

## What's already solid (don't regress)

Called out consistently across reviews as patterns worth preserving/imitating elsewhere:

- `membershipConfirmation.ts` — the one membership path that locks, rechecks capacity/conflicts,
  and writes fail-closed audit in a single transaction. The model for fixing Tier-1 finding 5.
- `scopeReportRegistry.ts` + compile-time exhaustiveness asserts in `schemas/report.ts` — the
  model for fixing Tier-3-B's registration fan-out.
- `applyPendingInvite.ts` — atomic, expiry-aware invite consumption via `updateMany`.
- `auditLogGuard.ts` — runtime-enforced AuditLog immutability.
- `useApiMutation`/`useApiQuery` — envelope-tolerant hooks that already absorb the `error`/`message`
  split, which is why that particular drift was explicitly called "not a finding."

## Explicitly not findings (confirmed intentional, don't re-flag)

- Developer-role UI simulation (`GlobalContext.tsx`/`authcheck.tsx`) — server auth uses real
  session privilege; client-only role simulation is by design.
- `boeEligibilityFlagging` absent from the client-facing report schema — worker-only job type,
  correctly excluded.
- Legacy `CommitteeList.committeeMemberList`/`VoterRecord.committeeId` overlap with
  `CommitteeMembership` — documented deferred-ticket compatibility fields.
