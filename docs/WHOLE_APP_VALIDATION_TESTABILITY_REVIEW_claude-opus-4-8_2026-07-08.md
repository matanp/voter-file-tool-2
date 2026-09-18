# Whole-App Validation & Testability Review

## Basis
- **Branch:** `feat/srs-implementation` · **Commit:** `daaf2c7` · **Date:** 2026-07-08 · **Model:** `claude-opus-4-8`
- **Deliverable:** `docs/WHOLE_APP_VALIDATION_TESTABILITY_REVIEW_claude-opus-4-8_2026-07-08.md`
- **Product files:** 356 · **checksum:** `c44a825f107e248477c02b2e8b26782dbd61aec1c8e9d4f8acf994ed38f3fd4c` · **algorithm:** sha256
- **Inventory:** `pnpm review:freeze validation` · **Scan profile:** `validation-testability`
- **Methodology:** `docs/review/WHOLE_APP_VALIDATION_TESTABILITY_REVIEW_METHODOLOGY.md`
- **Axis:** validation consistency, data-shape single source of truth, testability and coverage gaps

## At a glance

| # | Finding | Severity | Blast | Opportunity |
|---|---------|----------|-------|-------------|
| 1 | Invite-provisioning route: no test + local `.parse()` bypass | High | medium | Add negative-auth/validation route tests |
| 2 | Body validation forks into 400 vs 422 contracts | Medium | medium | Route raw `.parse()` through `validateRequest` |
| 3 | electionDates catch masks server errors as 400 | Medium | small | Special-case ZodError; let 500s surface |
| 4 | Presigned upload routes cast body, no Zod, duplicated | Medium | small | Shared upload-request Zod schema |
| 5 | Request schemas inline in `route.ts` hinder testing | Medium | medium | Move to `shared-validators`/`lib/validations` |
| 6 | Shared response-envelope schemas unused; envelopes ad-hoc | Low | medium | Adopt or delete envelope schemas |
| 7 | reportJobs status query parsed inline, not a schema | Low | small | Shared query schema + `validateRequest` |
| 8 | officeNames reference CRUD has no test mirror | Low | small | Add route test with shared matchers |

**Counts:** 8 findings · 1 backlog-only note

## Subsystem map

| Area | Defining product surfaces | Depth |
| --- | --- | --- |
| API request-validation infra | `apps/frontend/src/app/api/lib/validateRequest.ts`; `packages/shared-validators/src/schemas/api.ts` | high |
| Admin reference-data CRUD | `admin/officeNames`, `admin/electionDates`, `admin/terms` routes | high |
| Auth / invite provisioning | `apps/frontend/src/app/api/admin/invites/route.ts` | high |
| Presigned upload boundary | `getVoterFileUploadUrl`, `getCsvUploadUrl` | medium |
| Reports API | `reports/[id]/route.ts`, `reportJobs/route.ts` | medium |
| Shared validators | `packages/shared-validators/src/schemas/api.ts` | medium |

Adoption baseline: 22 API route files import `validateRequest`; validation is otherwise generally
schema-driven. Findings below concentrate on the routes that opt out of that spine and on the
mutation surfaces the mirror heuristic under-covers.

## Findings

### 1. Invite-provisioning mutation route has no test and bypasses the shared validator
**Severity: High · Blast radius: medium**
**What & where.** `apps/frontend/src/app/api/admin/invites/route.ts`
**Why it hurts.** `POST`/`DELETE /api/admin/invites` mints privileged invites (`privilegeLevel`,
`jurisdictions`, Leader term binding) and soft-deletes them — the account-provisioning trust
boundary. It validates with a route-local `createInviteSchema.parse(body)` (throwing) instead of the
shared `validateRequest`, and `pnpm review:test-map` plus a content grep of the __tests__ tree find **zero**
mirrored test file. A regression in privilege/jurisdiction parsing or the delete path would ship
unobserved. This is the rubric's High case: auth mutation route + no negative test + local validation
bypass.
**Opportunity.** Add route tests (unauthenticated, insufficient-privilege, malformed body, valid
create) and move the schema behind `validateRequest`.
**Evidence.** `.review/test-coverage-map.txt` (`admin/invites` absent from mirrors); `grep -rl invites apps/frontend/src/__tests__` → 0; route uses `createInviteSchema.parse` at line 67.

### 2. Request-body validation forks into two response contracts (400 vs 422)
**Severity: Medium · Blast radius: medium**
**What & where.** `apps/frontend/src/app/api/lib/validateRequest.ts`
**Why it hurts.** The shared `validateRequest` returns **422** `{ success:false, error:"Invalid request data" }`, but several mutation routes bypass it with raw `schema.parse(body)` and catch `ZodError` into **400** `{ error, issues }` — see `apps/frontend/src/app/api/admin/officeNames/route.ts`, `apps/frontend/src/app/api/reports/[id]/route.ts`, and `apps/frontend/src/app/api/admin/invites/route.ts`. Clients (and any future contract test) cannot rely on a single status code or envelope shape for "bad request body," and the `success` discriminator is present on some error bodies and absent on others.
**Opportunity.** Route the `.parse()` callers through `validateRequest` (or align its status/shape) so every body-validation failure returns one contract.
**Evidence.** `validateRequest` returns 422 (lines 29–35); `scan-validation.txt` shows `.parse(` at officeNames:34, reports/[id]:43, invites:67 vs `validateRequest(` across 22 routes.

### 3. electionDates catch collapses all errors (including server faults) into 400 "Invalid input"
**Severity: Medium · Blast radius: small**
**What & where.** `apps/frontend/src/app/api/admin/electionDates/route.ts`
**Why it hurts.** `createDateSchema.parse(body)` throws `ZodError`, but the catch block only
special-cases the Prisma `P2002` code and returns `{ error: "Invalid input" }, 400` for everything
else. A genuine DB/runtime fault is therefore reported to the client as a 400 client error with no
`issues`, and a validation failure carries no field detail — masking the difference between "your
input was bad" and "the server broke." That miscategorization also defeats any test that asserts on
status to distinguish the two.
**Opportunity.** Special-case `ZodError` → 400 with `issues` and let unexpected errors surface as 500,
matching `officeNames`.
**Evidence.** Route catch returns `{ error: "Invalid input" }, { status: 400 }` as the fallthrough (lines ~78) with no `instanceof ZodError` branch; contrast `officeNames/route.ts` which branches on `ZodError`, `SyntaxError`, `P2002`, then 500.

### 4. Presigned upload routes cast the body and hand-roll near-identical field checks
**Severity: Medium · Blast radius: small**
**What & where.** `apps/frontend/src/app/api/getVoterFileUploadUrl/route.ts`
**Why it hurts.** Both this route and `apps/frontend/src/app/api/getCsvUploadUrl/route.ts` do
`(await req.json()) as UploadRequest` — an unchecked cast — then repeat the same manual
`if (!fileName || !contentType || fileSize === undefined)` guard, extension check, and content-type
allow-list. There is no Zod schema, so the shape is asserted by the compiler only (erased at runtime)
and the duplicated validation can drift between the two Admin-only S3-presign routes.
**Opportunity.** Define one shared `uploadRequestSchema` (fileName/fileSize/contentType) in
`shared-validators` and validate both routes through `validateRequest`.
**Evidence.** `scan-parse-casts-params.txt` lines 190, 196 (`(await req.json()) as UploadRequest`); parallel manual guards at getVoterFileUploadUrl:38–48 and getCsvUploadUrl:40–48.

### 5. Request schemas defined inline in `route.ts` are hard to unit-test and drift-prone
**Severity: Medium · Blast radius: medium**
**What & where.** `apps/frontend/src/app/api/admin/terms/route.ts`
**Why it hurts.** `createTermSchema` here, plus `createDateSchema` in
`apps/frontend/src/app/api/admin/electionDates/route.ts`, `createOfficeSchema` in
`apps/frontend/src/app/api/admin/officeNames/route.ts`, `updateReportSchema` in
`apps/frontend/src/app/api/reports/[id]/route.ts`, and `createInviteSchema` in the invites route are
declared next to the handler. A schema-level unit test must import the route module, which transitively
pulls `withPrivilege`, `auth`, and Prisma — so the cheap test (validate boundary shapes, date refinements,
enum coverage) is never written, and the shape has no home outside the one route that consumes it.
**Opportunity.** Relocate these to `packages/shared-validators` or `apps/frontend/src/lib/validations`
so they can be exercised directly, matching `crosswalk.ts`/`committee.ts`.
**Evidence.** `grep -rln z.object apps/frontend/src/app/api --include=route.ts` → terms, electionDates, officeNames, reports/[id] (plus `createInviteSchema` inline at invites:20); contrast `lib/validations/crosswalk.ts`, `schemas/committeeDiscrepancy.ts`.

### 6. Shared response-envelope schemas exist but are unused; envelopes are hand-rolled
**Severity: Low · Blast radius: medium**
**What & where.** `packages/shared-validators/src/schemas/api.ts`
**Why it hurts.** `simpleSuccessResponseSchema`, `simpleErrorResponseSchema`, and
`simpleApiResponseSchema` are exported as the intended success/error envelope source of truth, but a
manifest-wide grep finds **no** product consumer. Meanwhile routes emit divergent shapes by hand —
`{ success:false, error }` (validateRequest), `{ error }`, `{ error, issues }`, `{ success:true, message }`
— so the "single source of truth" is aspirational and nothing enforces it.
**Opportunity.** Either adopt the envelope schemas at response construction (or in client parsing) or
delete them so they stop reading as an enforced contract.
**Evidence.** `grep -rn simpleSuccessResponseSchema|simpleErrorResponseSchema|simpleApiResponseSchema apps packages` (excluding definition) → 0 hits; varied envelopes across `scan-messages-envelopes.txt`.

### 7. reportJobs re-derives JobStatus query validation inline instead of a schema
**Severity: Low · Blast radius: small**
**What & where.** `apps/frontend/src/app/api/reportJobs/route.ts`
**Why it hurts.** The `status` query param is validated by building `new Set(Object.values(JobStatus))`,
splitting/upper-casing, filtering, then casting `s as JobStatus` — a bespoke parse where peer routes
(`audit`, `eligibility-flags`, `designationWeight`) assemble a query object and call `validateRequest`
with a Zod query schema. The inline path is untested at the schema level and casts rather than narrows,
so an out-of-enum value is filtered silently rather than reported per-field.
**Opportunity.** Express the status filter as a shared query schema (`z.enum` over `JobStatus`) and
validate through `validateRequest`.
**Evidence.** `scan-parse-casts-params.txt` lines 284–289 (`status as JobStatus`, `statusValues as JobStatus[]`); `JobStatus` is the Prisma enum (`schema.prisma:605`).

### 8. officeNames reference-data CRUD has no test mirror
**Severity: Low · Blast radius: small**
**What & where.** `apps/frontend/src/app/api/admin/officeNames/route.ts`
**Why it hurts.** `POST`/`DELETE` office-name management (feeds petition office pickers) has no
mirrored test — a content grep of the __tests__ tree returns zero references. Lower blast than invites since
it is reference data, but it is an unguarded mutation surface with the same illegible-bug checklist gap
(no unauthenticated / insufficient-privilege / duplicate-name cases).
**Opportunity.** Add a route test covering auth negatives and the `P2002` duplicate path.
**Evidence.** `.review/test-coverage-map.txt` lists `admin/officeNames` under `MISSING_TEST`; `grep -rl officeNames apps/frontend/src/__tests__` → 0.

## Already good

- **`validateRequest` is the dominant spine** — 22 API route files import it, giving most mutation
  boundaries a consistent 422 envelope and a single `safeParse` seam.
- **Committee mutation routes are well covered** — `add`, `remove`, `requestAdd`, `handleRequest`
  each have dedicated mirrors under __tests__/api/committee/ despite the mirror heuristic's flat-name
  false positives (see Not a finding).
- **Report contract shapes line up** — `report-contract-matrix.tsv` shows scoped report types present
  consistently across Prisma enum, generate schema, type mapping, scope registry, UI, and worker branch;
  non-scoped reports are legitimately outside the scoped registry.
- **Shared validator packages are the schema home** for search, voter records, designated petitions,
  discrepancies, and reports — the inline-schema findings are the exception, not the norm.

## Backlog-only notes

### B1. committeeDiscrepancy schema lacks a direct unit exercise
**What & where.** `packages/shared-validators/src/schemas/committeeDiscrepancy.ts`
**Why defer.** `handleCommitteeDiscrepancySchema`/`undoCommitteeDiscrepancySchema` are indirectly
exercised through the handleCommitteeDiscrepancy route tests, so behavior is covered even
though the schema basename is not referenced by a sibling test (the lone `SCHEMA_TEST_GAP` in the map).
**Future direction.** If the discrepancy metadata shape grows, add a focused schema test alongside the
other `shared-validators` schema suites.

## Not a finding

- **`test-map` HIGH_RISK_MISSING for committee/report routes** — `handleRequest`, `add`, `requestAdd`,
  `remove`, `generateReport`, `reportComplete` are flagged only because the heuristic expects a
  directory mirror (a folder under __tests__/api/committee/); the repo uses flat filenames
  (committee route tests named add.test.ts, handleRequest.test.ts, …), which exist and are
  substantive. **Tooling note:** `scripts/review/test-coverage-map.sh` has since been fixed to accept
  the flat naming, so this heuristic mismatch no longer produces false HIGH_RISK_MISSING verdicts.
- **Prisma `InputJsonValue` / `TransactionClient` casts** — audit metadata, seat-reconciliation `tx`,
  and `eligibilityWarnings` casts are intentional ORM-boundary adapters, not validation bypasses.
- **UI enum casts on select `onValueChange`** (`RemovalReason`, `MembershipType`, `PetitionOutcomeOption`)
  — narrowing a controlled select whose options derive from the same enum; display concern, not a
  data-shape source-of-truth break.
- **`getInvitesHandler` GET** — read-only listing; the coverage concern is scoped to the mutation verbs
  in Finding 1.
