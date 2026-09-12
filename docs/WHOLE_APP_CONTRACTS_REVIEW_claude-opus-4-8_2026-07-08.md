# Whole-App Contracts Review

## Basis
- **Branch:** `feat/srs-implementation` · **Commit:** `daaf2c7` · **Date:** 2026-07-08 · **Model:** `claude-opus-4-8`
- **Deliverable:** `docs/WHOLE_APP_CONTRACTS_REVIEW_claude-opus-4-8_2026-07-08.md`
- **Product files:** 356 · **checksum:** `c44a825f107e248477c02b2e8b26782dbd61aec1c8e9d4f8acf994ed38f3fd4c` · **algorithm:** sha256
- **Inventory:** `pnpm review:freeze contracts` ([Appendix A](./review/WHOLE_APP_REVIEW_METHODOLOGY.md#appendix-a-product-code-manifest)) · **Scan profile:** `contracts`
- **Methodology:** `docs/review/WHOLE_APP_CONTRACTS_REVIEW_METHODOLOGY.md`
- **Axis:** cross-boundary contract stability (API, hooks, packages, report-server) — *will a change in one layer break another **without a type error**?*

## At a glance
| # | Finding | Severity | Blast | Opportunity |
|---|---------|----------|-------|-------------|
| 1 | Ably report-status message has no shared contract; producer/consumer hand-duplicate shape | High | medium | Publish one shared Zod/type for the realtime payload |
| 2 | `generateReportResponseSchema` exists but neither producer nor consumer uses it | Medium | medium | Parse report-server reply with the shared schema |
| 3 | Discrepancy-undo UI branches on `reason` string codes with no shared union | Medium | small | Export a shared discriminated `reason` union |
| 4 | `isVoterImportMetadata` hand-rolls a guard duplicating `voterImportMetadataSchema` | Medium | small | Validate via `voterImportMetadataSchema.safeParse` |
| 5 | Presign response `{ uploadUrl, fileKey }` + `UploadRequest` duplicated across 2 routes + hook | Low | small | Single shared upload request/response schema |

**Counts:** 5 findings · 3 backlog-only notes

## Subsystem map
| Area | Defining files | Contract surface |
| --- | --- | --- |
| Report generation chain | `apps/frontend/src/app/api/generateReport/route.ts`, `apps/report-server/src/index.ts`, `packages/shared-validators/src/schemas/report.ts` | gzipped `enrichedReportDataSchema` request; `{ success, message, numJobs }` reply; webhook payload |
| Realtime status | `apps/frontend/src/app/api/reportComplete/route.ts`, `apps/frontend/src/app/components/ReportStatusTracker.tsx` | Ably `report-status-<id>` message |
| Report registry | `packages/shared-validators/src/scopeReportRegistry.ts`, `packages/shared-validators/src/reportTypeMapping.ts` | scope report descriptors, Prisma enum mapping |
| Shared hooks | `apps/frontend/src/hooks/useApiMutation.ts`, `apps/frontend/src/hooks/useApiQuery.ts`, `apps/frontend/src/hooks/useFileUpload.ts` | error-envelope field reads, upload response |
| Eligibility / discrepancy codes | `apps/frontend/src/lib/eligibilityMessages.ts`, `apps/frontend/src/app/admin/data/DiscrepancyUndoButton.tsx` | `reasons[]` / `reason` string codes across API→UI |

## Findings

### 1. Realtime report-status message has no shared contract
**Severity: High · Blast radius: medium**
**What & where.** The producer builds the Ably payload inline in `apps/frontend/src/app/api/reportComplete/route.ts` and the consumer independently re-declares its shape inline in `apps/frontend/src/app/components/ReportStatusTracker.tsx`. Neither references a shared type.
**Why it hurts.** This is the one report-pipeline hop the compiler cannot cross-check: the producer publishes over Ably and the subscriber casts `message.data` to a locally-written literal type. A rename of `url`, `error`, or `status` on the producer side leaves the subscriber silently reading `undefined`, so `onComplete`/`onError` never fire and the report UI hangs on "processing" with no error. The contract has already drifted: the producer only ever sends `status` `COMPLETED` or `FAILED` (`success ? JobStatus.COMPLETED : JobStatus.FAILED`), but the consumer's union also lists `"PROCESSING"`, a value that can never arrive — evidence the two ends are maintained independently rather than from one source.
**Opportunity.** Define one shared payload type/schema in `shared-validators` and have both the publish call and the subscriber cast use it.
**Evidence.** Producer object at `apps/frontend/src/app/api/reportComplete/route.ts` (the `ablyMessage` literal, `{ jobId, status, url|error, timestamp }`); consumer cast in `apps/frontend/src/app/components/ReportStatusTracker.tsx` (`message.data as { jobId; status: "PROCESSING"|"COMPLETED"|"FAILED"; url?; error? }`). No `report-status` payload type exists in `packages/shared-validators/src/schemas/report.ts`.

### 2. `generateReportResponseSchema` exists but the report-server reply is validated by cast on both ends
**Severity: Medium · Blast radius: medium**
**What & where.** `packages/shared-validators/src/schemas/report.ts` defines `generateReportResponseSchema` (`{ success, message, numJobs }`) and its `GenerateReportResponse` type, but nothing imports them. The report-server hand-builds the same object literal in `apps/report-server/src/index.ts`, and the frontend consumes it with an inline `as { success; message; numJobs }` cast in `apps/frontend/src/app/api/generateReport/route.ts`.
**Why it hurts.** The frontend branches on `responseData.success` to decide whether to mark the report `PROCESSING` or `FAILED`. Because the reply is cast rather than parsed, a report-server change to that envelope (e.g. renaming `numJobs`, or returning a different failure shape) passes typecheck and produces `undefined`/`NaN` `jobsAhead` and mis-branched status with no error surfaced. A shared schema already written for exactly this envelope sits unused.
**Opportunity.** Parse the report-server response with `generateReportResponseSchema.safeParse` and have the report-server construct it from the shared type.
**Evidence.** Schema + type at `packages/shared-validators/src/schemas/report.ts`; producer literal in `apps/report-server/src/index.ts` (`res.status(200).json({ success, message, numJobs })`); consumer cast in `apps/frontend/src/app/api/generateReport/route.ts`. `grep` for `generateReportResponseSchema` / `GenerateReportResponse` returns only the definition site.

### 3. Discrepancy-undo UI branches on `reason` string codes with no shared union
**Severity: Medium · Blast radius: small**
**What & where.** `apps/frontend/src/app/admin/data/DiscrepancyUndoButton.tsx` changes user-facing behavior based on `apiErrorBody?.reason === "membership_diverged"` and `=== "not_resolved"`. Those literal codes are emitted server-side in `apps/frontend/src/app/api/admin/handleCommitteeDiscrepancy/undo/route.ts` (and a sibling `already_resolved` in `apps/frontend/src/app/api/admin/handleCommitteeDiscrepancy/route.ts`) as bare inline strings. No shared union ties producer to consumer.
**Why it hurts.** This matches the vector's High trigger — a client branch on a value another layer sends — softened only by blast radius. Renaming `membership_diverged` on the route silently drops the client into the generic fallback branch, losing the tailored "membership diverged, cannot undo" guidance, with a clean typecheck.
**Opportunity.** Export a shared discriminated `reason` union (or const object) consumed by both route and button.
**Evidence.** Consumer branches in `apps/frontend/src/app/admin/data/DiscrepancyUndoButton.tsx`; producer literals in `apps/frontend/src/app/api/admin/handleCommitteeDiscrepancy/undo/route.ts` and `apps/frontend/src/app/api/admin/handleCommitteeDiscrepancy/route.ts`.

### 4. `isVoterImportMetadata` hand-rolls a guard that duplicates `voterImportMetadataSchema`
**Severity: Medium · Blast radius: small**
**What & where.** The report-server writes voter-import stats validated by `voterImportMetadataSchema` (`packages/shared-validators/src/schemas/report.ts`); the frontend re-validates the persisted JSON with a manual field-by-field type guard in `apps/frontend/src/types/reportMetadata.ts` that asserts `metadata is VoterImportMetadata`.
**Why it hurts.** The guard narrows to the *shared* type but checks membership with a hand-maintained list of `"x" in metadata && typeof … ===`. If the shared schema gains or renames a field, the guard keeps returning `true` for the stale shape and the `as VoterImportMetadata` assertion becomes a lie consumed by `ReportCard.tsx` (`metadata.recordsProcessed.toLocaleString()` etc.), rather than being caught at the boundary.
**Opportunity.** Back the guard with `voterImportMetadataSchema.safeParse(metadata).success` so the shared schema is the single source of truth.
**Evidence.** Guard in `apps/frontend/src/types/reportMetadata.ts`; schema in `packages/shared-validators/src/schemas/report.ts`; consumer in `apps/frontend/src/components/reports/ReportCard.tsx`.

### 5. Presign upload request/response contract duplicated across two routes and the hook
**Severity: Low · Blast radius: small**
**What & where.** `apps/frontend/src/app/api/getVoterFileUploadUrl/route.ts` and `apps/frontend/src/app/api/getCsvUploadUrl/route.ts` each define a private `UploadRequest` interface, hand-validate it, and return `{ uploadUrl, fileKey }`. The consumer `apps/frontend/src/hooks/useFileUpload.ts` re-declares `{ uploadUrl, fileKey }` via a third inline cast.
**Why it hurts.** Three independent declarations of the same request and response envelope with no shared schema; a field rename on one producer is invisible to the hook and the other route. Low today because both routes are in sync and the response is only two fields.
**Opportunity.** One shared upload request + `{ uploadUrl, fileKey }` response schema imported by both routes and the hook.
**Evidence.** `UploadRequest` + response literal in `apps/frontend/src/app/api/getVoterFileUploadUrl/route.ts` and `apps/frontend/src/app/api/getCsvUploadUrl/route.ts`; consumer cast in `apps/frontend/src/hooks/useFileUpload.ts`.

## Already good
- **Report type single-source-of-truth.** `packages/shared-validators/src/scopeReportRegistry.ts` drives filenames, formats, Prisma enum mapping, and jurisdiction labels for scope reports, and `packages/shared-validators/src/schemas/report.ts` carries compile-time exhaustiveness asserts (`_assertEnrichedExhaustive`, `_assertExhaustive`) that force new report variants into the enriched union and scope registry. This is the pattern the other findings should imitate.
- **Envelope-tolerant hooks.** `apps/frontend/src/hooks/useApiMutation.ts` and `apps/frontend/src/hooks/useApiQuery.ts` both read `errorBody.error ?? errorBody.message`, so the `{ error }` vs `{ message }` split does not break error display.
- **Shared search-query engine.** The report-server imports `buildPrismaWhereClause` / `normalizeSearchQuery` / `searchQueryFieldSchema` from `packages/shared-validators/src/schemas/report.ts` rather than re-deriving query shaping, keeping app and worker on one query contract.

## Backlog-only notes

### B1. Eligibility `reasons[]` codes emitted as inline string literals
**What & where.** `apps/frontend/src/app/api/committee/add/route.ts` and `apps/frontend/src/app/api/committee/handleRequest/route.ts` emit `reasons: ["ALREADY_IN_ANOTHER_COMMITTEE"]` / `["CAPACITY"]` as bare strings rather than referencing the `IneligibilityReason` Prisma enum that the eligibility service (`apps/frontend/src/lib/eligibility.ts`) and the client mapper (`apps/frontend/src/lib/eligibilityMessages.ts`) both key on.
**Why defer.** `getIneligibilityMessage` degrades unknown codes to a deterministic generic message, so drift is cosmetic, not a hang.
**Future direction.** Type the emitted literals against `IneligibilityReason` so an enum rename fails the build.

### B2. `ErrorResponse` type omits the `success: false` field `validateRequest` returns
**What & where.** `apps/frontend/src/app/api/lib/validateRequest.ts` returns `{ success: false, error }`, but the shared `errorResponseSchema` / `ErrorResponse` in `packages/shared-validators/src/schemas/report.ts` models only `{ error, message?, details?, issues? }`.
**Why defer.** Consumers read `error`; the extra `success` key is inert.
**Future direction.** Fold a canonical error envelope (with optional `success`) into `shared-validators` so all routes and the type agree.

### B3. Report-server `/start-job` 400 body shape is not shared
**What & where.** `apps/report-server/src/index.ts` returns `{ error, details }` on validation failure and `{ error }` on 500; the frontend caller in `apps/frontend/src/app/api/generateReport/route.ts` only checks `response.ok && responseData.success` and never reads the failure body.
**Why defer.** The caller discards the failure body today, so there is no active mismatch.
**Future direction.** If the frontend starts surfacing report-server validation errors, base both ends on `errorResponseSchema`.

## Not a finding
- **`{ error }` vs `{ message }` envelope split** — every consuming hook reads both keys (`error ?? message`); belongs to the architecture vector, not a runtime contract break.
- **`boeEligibilityFlagging` worker-only variant absent from `generateReportSchema`** — intentional worker-only job type, correctly excluded from the client-facing union and guarded by `_assertEnrichedExhaustive`.
- **`req.json() as unknown` casts in committee/admin routes** — immediately followed by `safeParse` against a shared/local Zod schema; the cast is to `unknown`, not a trusted shape.
- **`metadata as Prisma.InputJsonValue` in reportComplete** — a Prisma write-time JSON coercion, not a cross-layer read contract.
