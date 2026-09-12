# Whole-App Operations Readiness Review

## Basis
- **Branch:** `feat/srs-implementation` · **Commit:** `daaf2c7` · **Date:** 2026-07-08 · **Model:** `grok-4.5`
- **Deliverable:** `docs/WHOLE_APP_OPERATIONS_READINESS_REVIEW_grok-4.5_2026-07-08.md`
- **Product files:** 356 · **checksum:** `c44a825f107e248477c02b2e8b26782dbd61aec1c8e9d4f8acf994ed38f3fd4c` · **algorithm:** sha256
- **Inventory:** `pnpm review:freeze operations` · **Scan profile:** `operations-readiness`
- **Methodology:** `docs/review/WHOLE_APP_OPERATIONS_READINESS_REVIEW_METHODOLOGY.md`
- **Axis:** environment hygiene, observability, deploy assumptions, and recovery paths

## At a glance
| # | Finding | Severity | Blast | Opportunity |
|---|---------|----------|-------|-------------|
| 1 | Frontend env validation covers auth only | High | large | Validate report-pipeline env at boot |
| 2 | Report-server boots without R2/webhook/DB checks | High | large | Fail fast on worker-critical env |
| 3 | `PDF_SERVER_URL` silently defaults to localhost | High | large | Require worker URL outside local dev |
| 4 | Callback delivery is fire-and-forget | High | large | Check/retry terminal callbacks |
| 5 | Job failure reasons are not persisted | High | medium | Store and surface terminal errors |
| 6 | In-memory queue leaves orphan PROCESSING jobs | High | large | Add stale-job recovery path |
| 7 | Voter import destroys archives without recoverable unit | High | large | Make import abort state operator-visible |
| 8 | Production migrate path is `migrate dev` only | Medium | large | Add deploy-safe migrate command |
| 9 | Report-server observability is console-only | Medium | medium | Structured logs + error reporting |
| 10 | Presigned-upload forms stop at enqueue success | Medium | medium | Track import jobs to completion |
| 11 | Production validation errors are opaque | Medium | medium | Return safe field-level summaries |
| 12 | Weighted-table UI hides ambiguous skips | Low | small | Show all skip counters |

**Counts:** 12 findings · 3 backlog-only notes

## Subsystem map
| Subsystem | Ops surfaces reviewed | Depth |
|---|---|---|
| Env and deploy assumptions | `apps/frontend/src/env.js`, `apps/frontend/package.json`, `apps/report-server/package.json`, `apps/frontend/src/lib/s3Utils.ts`, `apps/report-server/src/s3Utils.ts` | high |
| Report job start and completion | `apps/frontend/src/app/api/generateReport/route.ts`, `apps/frontend/src/app/api/reportComplete/route.ts`, `apps/frontend/src/app/api/reportComplete/reportCompleteVerifier.ts`, `apps/frontend/src/app/api/reportJobs/route.ts` | high |
| Report-server worker | `apps/report-server/src/index.ts`, `apps/report-server/src/jobOrchestration.ts`, `apps/report-server/src/webhookUtils.ts` | high |
| Operator job visibility | `apps/frontend/src/components/reports/PendingJobsIndicator.tsx`, `apps/frontend/src/app/components/ReportStatusTracker.tsx`, `apps/frontend/src/components/admin/PresignedUploadReportForm.tsx` | high |
| Upload and voter import | `apps/frontend/src/app/api/getVoterFileUploadUrl/route.ts`, `apps/frontend/src/hooks/useFileUpload.ts`, `packages/voter-import-processor/src/parseVoterFile.ts`, `apps/report-server/src/reportProcessors/voterImportProcessor.ts` | high |
| API failure envelopes | `apps/frontend/src/app/api/lib/validateRequest.ts`, `apps/frontend/src/app/api/lib/withPrivilege.ts` | medium |
| Admin import UX | `apps/frontend/src/app/admin/data/WeightedTableImport.tsx`, `apps/frontend/src/app/api/admin/weightedTable/import/route.ts` | medium |
| Observability | `apps/frontend/src/instrumentation.ts`, report-server console logging in `apps/report-server/src/index.ts` | medium |

## Findings

### 1. Frontend env validation covers auth only
**Severity: High · Blast radius: large**

**What & where.** `apps/frontend/src/env.js` validates only `NODE_ENV` and `AUTH_*`. Report-pipeline vars (`WEBHOOK_SECRET`, `PDF_SERVER_URL`, `ABLY_API_KEY`, `R2_*`, DB URL) are read via `process.env` at first use in `apps/frontend/src/app/api/generateReport/route.ts`, `apps/frontend/src/app/api/reportComplete/route.ts`, `apps/frontend/src/app/api/generateRealtimeToken/route.ts`, and `apps/frontend/src/lib/s3Utils.ts`.

**Why it hurts.** A production build can succeed and serve traffic until the first report, upload, webhook, or realtime token request, then fail with a late config error. Operators diagnose “reports broken” instead of “deploy missing env.”

**Opportunity.** Validate all report/upload/realtime critical server vars at boot the same way auth vars are validated today.

**Evidence.** Compared `env.js` server schema (four keys) with runtime checks in generateReport (`WEBHOOK_SECRET` throw), reportComplete (`ABLY_API_KEY` 500), and partial R2 key checks in frontend `s3Utils` (access key/secret only).

### 2. Report-server boots without R2/webhook/DB checks
**Severity: High · Blast radius: large**

**What & where.** `apps/report-server/src/index.ts` exits only on invalid `CALLBACK_URL`. `WEBHOOK_SECRET` is optional when signing outbound callbacks. `apps/report-server/src/s3Utils.ts` uses `R2_*` with non-null assertions and no startup validation.

**Why it hurts.** The worker can appear healthy, accept `/start-job`, then fail mid-flight on storage or produce unsigned callbacks that `apps/frontend/src/app/api/reportComplete/reportCompleteVerifier.ts` rejects — leaving reports stuck in `PROCESSING` with pm2 logs as the only clue.

**Opportunity.** Fail fast at report-server boot on required `WEBHOOK_SECRET`, `R2_*`, and database URL.

**Evidence.** Boot gate at CALLBACK_URL parse/exit; optional secret at callback sign sites; R2 client constructed with `!` assertions and no boot check.

### 3. `PDF_SERVER_URL` silently defaults to localhost
**Severity: High · Blast radius: large**

**What & where.** `apps/frontend/src/app/api/generateReport/route.ts` sets `PDF_API_BASE` to `http://localhost:8080` when `PDF_SERVER_URL` is unset.

**Why it hurts.** On a deployed frontend, missing `PDF_SERVER_URL` still creates a `Report` row and attempts to enqueue against localhost. Operators see generic failures or `FAILED` jobs without an obvious misconfiguration signal.

**Opportunity.** Require `PDF_SERVER_URL` outside local development and remove the production localhost default.

**Evidence.** Localhost ternary at module scope; `WEBHOOK_SECRET` is hard-required in the same handler, but `PDF_SERVER_URL` is not.

### 4. Callback delivery is fire-and-forget
**Severity: High · Blast radius: large**

**What & where.** Success and error paths in `apps/report-server/src/index.ts` `fetch` to `CALLBACK_URL` without checking response status, logging HTTP failures, or retrying. Frontend completion lives in `apps/frontend/src/app/api/reportComplete/route.ts`.

**Why it hurts.** Transient frontend outages, 401 from missing/mismatched `WEBHOOK_SECRET`, or 500 from missing `ABLY_API_KEY` leave the worker believing the job finished while the `Report` row stays `PROCESSING`. Operators have no durable failure signal and no automatic recovery.

**Opportunity.** Treat callback delivery as a first-class outcome: validate responses, log structured failure context, and retry or reconcile stale jobs.

**Evidence.** Both success and catch `fetch(CALLBACK_URL, …)` blocks ignore `response.ok`; reportComplete can 500 before DB update when Ably is missing; verifier requires HMAC.

### 5. Job failure reasons are not persisted
**Severity: High · Blast radius: medium**

**What & where.** On failure, `apps/frontend/src/app/api/reportComplete/route.ts` writes only `status: FAILED` and `completedAt`. The webhook `error` string is published to Ably only. `apps/frontend/src/components/reports/PendingJobsIndicator.tsx` shows title/status/date and a delete action — no error text. `Report.metadata` in `apps/frontend/prisma/schema.prisma` is unused for failures.

**Why it hurts.** After the realtime session ends, the root cause is gone unless someone searches server logs. Operators cannot answer “why did this import/report fail?” from the admin UI.

**Opportunity.** Persist terminal failure details on the report row and surface them in pending/failed job UIs.

**Evidence.** Failure update omits error/metadata; Ably message includes `error`; PendingJobsIndicator renders status badge only.

### 6. In-memory queue leaves orphan PROCESSING jobs
**Severity: High · Blast radius: large**

**What & where.** `apps/report-server/src/index.ts` holds work in a process-local `async.queue`. Frontend rows move to `PROCESSING` after `/start-job` ack in `apps/frontend/src/app/api/generateReport/route.ts`. `apps/frontend/src/components/reports/PendingJobsIndicator.tsx` offers refresh and delete-for-FAILED only — no cancel, mark-failed, or requeue for stuck `PROCESSING`.

**Why it hurts.** Worker restart, OOM, or dropped in-flight work leaves durable `PROCESSING` rows with no worker-side job record, timeout, or operator recovery action. Diagnosis cost is DB/log archaeology.

**Opportunity.** Add stale-job detection and a safe operator recovery path (mark failed with reason, or re-dispatch).

**Evidence.** In-memory queue push after HTTP 200; no worker job table/heartbeat; UI has no PROCESSING recovery action; reportComplete skips non-PROCESSING updates.

### 7. Voter import destroys archives without recoverable unit
**Severity: High · Blast radius: large**

**What & where.** `packages/voter-import-processor/src/parseVoterFile.ts` deletes existing `VoterRecordArchive` rows for the target year/entry before streaming batched writes. `apps/report-server/src/reportProcessors/voterImportProcessor.ts` drives the job. There is no cross-import transaction or explicit “import aborted / unsafe to trust” marker for operators.

**Why it hurts.** Mid-run failure (parse error, DB error, worker crash) can leave a partially updated voter file and deleted archives. Operators cannot tell from product UI whether retry is safe or what was already applied.

**Opportunity.** Make import abort state durable and operator-visible so recovery is not guesswork.

**Evidence.** `cleanupDB` / `deleteMany` runs first; batch writes proceed without an enclosing import transaction; success metadata is stored only on completed imports via reportComplete.

### 8. Production migrate path is `migrate dev` only
**Severity: Medium · Blast radius: large**

**What & where.** `apps/frontend/package.json` exposes `db_migrate` as `prisma migrate dev` (plus shared-prisma build). There is no product-script `prisma migrate deploy` for production.

**Why it hurts.** Schema/code can ship ahead of applied migrations; runtime Prisma errors look like application bugs. Operators lack a single, idempotent migrate command in the app package scripts.

**Opportunity.** Add an explicit production migration command and treat it as a deploy gate before serving traffic.

**Evidence.** `db_migrate` script contents; workspace search found `migrate deploy` only in docs/plans, not in package scripts.

### 9. Report-server observability is console-only
**Severity: Medium · Blast radius: medium**

**What & where.** `apps/report-server/src/index.ts` relies on `console.log` / `console.error` for queue, validation, processing, and callback paths. Frontend has Sentry wiring via `apps/frontend/src/instrumentation.ts`; report-server has no equivalent error reporting.

**Why it hurts.** Async job failures (Puppeteer, R2, import, BOE flagging) are hard to correlate across services; operators depend on pm2 file logs without job-structured alerting.

**Opportunity.** Add structured logging (jobId, type, duration, outcome) and error-reporting parity with the frontend.

**Evidence.** Dense console usage in report-server index; no Sentry usage under report-server product sources; frontend instrumentation exports `onRequestError`.

### 10. Presigned-upload forms stop at enqueue success
**Severity: Medium · Blast radius: medium**

**What & where.** `apps/frontend/src/components/admin/PresignedUploadReportForm.tsx` treats `/api/generateReport` success as terminal UI success and does not mount `apps/frontend/src/app/components/ReportStatusTracker.tsx`. Upload handoff uses `apps/frontend/src/hooks/useFileUpload.ts` plus `apps/frontend/src/app/api/getVoterFileUploadUrl/route.ts` / `apps/frontend/src/app/api/getCsvUploadUrl/route.ts`.

**Why it hurts.** Critical voter/absentee imports can fail after enqueue while the admin UI shows a success toast. Operators lack the live completion/error path that scoped PDF/XLSX forms already use.

**Opportunity.** Align presigned-upload workflows with the existing Ably/polling completion patterns.

**Evidence.** `onSuccess` sets static success and resets the form; no `reportId` tracking or status tracker mount in the shared upload form.

### 11. Production validation errors are opaque
**Severity: Medium · Blast radius: medium**

**What & where.** `apps/frontend/src/app/api/lib/validateRequest.ts` logs Zod issues only when `NODE_ENV === "development"` and always returns `{ error: "Invalid request data" }` with status 422.

**Why it hurts.** Admins hitting privileged import/config routes see a generic toast via client hooks. Diagnosis requires reproducing locally or digging server logs, raising recovery cost for routine payload mistakes.

**Opportunity.** Return safe, structured validation summaries (field paths without sensitive values) in production, or attach a correlation id operators can look up.

**Evidence.** Development-only `console.warn` of issues; production response body has no field errors.

### 12. Weighted-table UI hides ambiguous skips
**Severity: Low · Blast radius: small**

**What & where.** `apps/frontend/src/app/api/admin/weightedTable/import/route.ts` returns `matched`, `skippedNoCommittee`, and `skippedAmbiguous`. `apps/frontend/src/app/admin/data/WeightedTableImport.tsx` renders only the first two counters.

**Why it hurts.** Ambiguous LTED rows are silently skipped; operators may believe the import fully succeeded and miss incomplete weight updates.

**Opportunity.** Display all skip counters returned by the API.

**Evidence.** API response includes `skippedAmbiguous`; UI `renderResult` omits it from the typed response and display string.

## Already good

- Auth env hardening via `createEnv` in `apps/frontend/src/env.js`, imported at build time from Next config.
- Inbound webhook verification and `withBackendCheck` on `apps/frontend/src/app/api/reportComplete/route.ts` / `apps/frontend/src/app/api/reportComplete/reportCompleteVerifier.ts`.
- Enqueue-time failure hygiene in `apps/frontend/src/app/api/generateReport/route.ts` (marks `FAILED` when `/start-job` rejects or the handler throws after row create).
- Completion idempotency: reportComplete skips updates when status is not `PROCESSING`.
- Partial frontend R2 guard in `apps/frontend/src/lib/s3Utils.ts` (throws on missing access key/secret at module load).
- Report-server `CALLBACK_URL` shape validation with process exit on failure.
- Crosswalk import operator UX: row-level errors, audit event, expandable summary (contrast with weighted-table gap).
- Standard report forms that mount realtime status tracking for PDF/XLSX flows.
- Frontend Sentry request-error capture via `apps/frontend/src/instrumentation.ts`.

## Backlog-only notes

### B1. No health/readiness endpoints for dependency checks
**What & where.** No product `/api/health` or readiness route under `apps/frontend/src/app/api/` that probes DB, R2, worker reachability, or required secrets.

**Why defer.** Useful for deploy automation, but lower leverage than fixing silent env defaults and stuck-job recovery already in Findings.

**Future direction.** Add liveness plus a readiness check for report-pipeline dependencies once env validation is centralized.

### B2. BOE eligibility follow-up jobs are invisible to operators
**What & where.** `apps/report-server/src/jobOrchestration.ts` chains `voterImport` → `boeEligibilityFlagging` with fresh job ids and no callback (`apps/report-server/src/index.ts` skips callbacks for that type).

**Why defer.** Overlaps the async-reliability vector; ops impact is real but secondary to user-visible report/import failure diagnosis.

**Future direction.** Give maintenance jobs durable status/outcome visibility comparable to user-initiated reports.

### B3. Report lifecycle is absent from the audit trail
**What & where.** `AuditAction.REPORT_GENERATED` exists in `apps/frontend/prisma/schema.prisma` and audit UI labels, but `apps/frontend/src/app/api/generateReport/route.ts` never writes an audit event for start/complete/fail.

**Why defer.** Helpful for “who started what,” but does not unblock stuck-job recovery as directly as persisted failure reasons and stale-job actions.

**Future direction.** Audit report start and terminal outcomes with report id, type, and actor.

## Not a finding

- **Unsigned `/start-job` ingress** — trust-boundary axis; not scored here as ops hygiene.
- **`SKIP_ENV_VALIDATION` bypass** — intentional Docker/build escape hatch documented beside `env.js`.
- **Developer-only console noise in local scripts** — outside product runtime critical path.
- **Missing metrics for low-frequency admin CRUD** — clear UI recovery already exists; not an incident-class gap.
- **Generic 401 on bad webhook signature** — intentional; real reason is logged server-side for operators with log access.
- **`bulkLoadData` Vercel 503 guard** — explicit local-only tooling message, not a silent production failure.
