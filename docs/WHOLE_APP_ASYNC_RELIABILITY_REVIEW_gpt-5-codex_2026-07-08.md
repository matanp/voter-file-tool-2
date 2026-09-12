# Whole-App Async Reliability Review

## Basis
- **Branch:** `feat/srs-implementation` · **Commit:** `daaf2c7` · **Date:** 2026-07-08 · **Model:** `gpt-5-codex`
- **Deliverable:** `docs/WHOLE_APP_ASYNC_RELIABILITY_REVIEW_gpt-5-codex_2026-07-08.md`
- **Product files:** 356 · **checksum:** `c44a825f107e248477c02b2e8b26782dbd61aec1c8e9d4f8acf994ed38f3fd4c` · **algorithm:** sha256
- **Inventory:** `pnpm review:freeze async-reliability` · **Scan profile:** `async-reliability`
- **Methodology:** `docs/review/WHOLE_APP_ASYNC_RELIABILITY_REVIEW_METHODOLOGY.md`
- **Axis:** async job lifecycle, webhook idempotency, retry safety, and partial-failure recovery

## At a glance
| # | Finding | Severity | Blast | Opportunity |
|---|---------|----------|-------|-------------|
| 1 | In-memory report queue loses PROCESSING jobs on worker restart | High | large | Persist job claims |
| 2 | Fast callbacks can be skipped before PROCESSING is durable | High | medium | Claim before enqueue |
| 3 | Callback delivery failures are acknowledged by silence | High | medium | Retry terminal callbacks |
| 4 | Completion idempotency is check-then-write, not atomic | Medium | medium | Conditional terminal update |
| 5 | Voter imports can fail after partial database writes | High | large | Checkpoint or transact imports |
| 6 | Duplicate import deliveries can destructively interleave | Medium | large | Add import idempotency keys |
| 7 | BOE eligibility background runs have no durable run state | Medium | medium | Track scheduled runs |
| 8 | Report forms can lose the durable job id after client timeout | Low | medium | Return recoverable job state |

**Counts:** 8 findings · 2 backlog-only notes

## Subsystem map
- **Report job lifecycle:** high depth. Report creation, status transition, and user polling live in `apps/frontend/src/app/api/generateReport/route.ts`, `apps/frontend/src/app/api/reportComplete/route.ts`, `apps/frontend/src/app/api/reportJobs/route.ts`, `apps/frontend/src/app/api/reports/route.ts`, and `apps/frontend/src/components/reports/PendingJobsIndicator.tsx`.
- **Report-server worker and callbacks:** high depth. Queue acceptance, in-memory processing, report-type dispatch, and callback delivery live in `apps/report-server/src/index.ts`, with report payload and webhook contracts in `packages/shared-validators/src/schemas/report.ts`.
- **Upload and import workflows:** high depth. Presigned upload handoff, voter import streaming, archive/current-record writes, and dropdown updates live in `apps/frontend/src/app/api/getVoterFileUploadUrl/route.ts`, `apps/frontend/src/hooks/useFileUpload.ts`, `apps/report-server/src/reportProcessors/voterImportProcessor.ts`, `packages/voter-import-processor/src/parseVoterFile.ts`, `packages/voter-import-processor/src/voterRecordProcessor.ts`, and `packages/voter-import-processor/src/dropdownListProcessor.ts`.
- **Realtime status UI:** medium depth. Ably token creation, report channel subscription, form-level status handling, and dashboard polling live in `apps/frontend/src/app/api/generateRealtimeToken/route.ts`, `apps/frontend/src/lib/ably.ts`, `apps/frontend/src/app/components/ReportStatusTracker.tsx`, `apps/frontend/src/components/reports/ScopedReportForm.tsx`, and `apps/frontend/src/app/voter-list-reports/VoterListReportForm.tsx`.
- **BOE eligibility background work:** medium depth. Scheduled and import-triggered BOE flagging jobs are built in `apps/report-server/src/jobOrchestration.ts`, dispatched in `apps/report-server/src/index.ts`, and mutate eligibility flags in `packages/shared-prisma/src/boeEligibilityFlagging.ts`.
- **Durable model:** high depth. Job status, report metadata, archive uniqueness, current voter records, and flag state are represented in `apps/frontend/prisma/schema.prisma`.

## Findings

### 1. In-memory report queue loses PROCESSING jobs on worker restart
**Severity: High · Blast radius: large**

**What & where.** The report server uses an in-process `async.queue` in `apps/report-server/src/index.ts`; `/start-job` pushes the parsed job into that queue and immediately reports success. The frontend then marks the `Report` row `PROCESSING` in `apps/frontend/src/app/api/generateReport/route.ts`. No durable queue row, lease, attempt counter, heartbeat, or reconciler is modeled in `apps/frontend/prisma/schema.prisma`, and the dashboard only lists the resulting `PENDING`, `PROCESSING`, and `FAILED` rows through `apps/frontend/src/app/api/reportJobs/route.ts`.

**Why it hurts.** A report-server crash, deploy, or process restart after `/start-job` succeeds loses the only copy of queued work while the database continues to say the report is processing. Users see a spinner or dashboard entry indefinitely, and operators have no persisted payload to retry.

**Opportunity.** Persist job claims before reporting accepted work.

**Evidence.** Mechanical scan `scan-async-jobs.txt` highlighted the queue and status paths. Deep read traced `Report.create(PENDING)` to `fetch(/start-job)` to `report.update(PROCESSING)`, while the worker stores only `q.push(requestData)` in process memory.

### 2. Fast callbacks can be skipped before PROCESSING is durable
**Severity: High · Blast radius: medium**

**What & where.** `apps/frontend/src/app/api/generateReport/route.ts` creates the report as `PENDING`, calls the report server, and updates the row to `PROCESSING` only after `/start-job` returns. `apps/report-server/src/index.ts` calls `q.push(requestData)` before it sends the success response. `apps/frontend/src/app/api/reportComplete/route.ts` returns `received: true, skipped: true` for every callback whose report is not already `PROCESSING`.

**Why it hurts.** Short jobs, failed jobs, or duplicate queue execution can call back while the frontend row is still `PENDING`. The callback is acknowledged and discarded, then the generator marks the row `PROCESSING`; no later terminal callback is guaranteed.

**Opportunity.** Make the processing claim durable before the worker can complete.

**Evidence.** The state order is visible across the three files: create `PENDING`, enqueue before `/start-job` response, skip non-`PROCESSING` callback, then update `PROCESSING` after the response.

### 3. Callback delivery failures are acknowledged by silence
**Severity: High · Blast radius: medium**

**What & where.** After successful or failed processing, `apps/report-server/src/index.ts` sends `fetch(CALLBACK_URL, ...)` but never checks `response.ok`, never parses the callback response, and has no retry/backoff or dead-letter path. The callback endpoint in `apps/frontend/src/app/api/reportComplete/route.ts` can return 500 before any terminal DB update when `ABLY_API_KEY` is missing, or when `getPresignedReadUrl` fails before the success update. The worker still logs `done` for any non-throwing HTTP response.

**Why it hurts.** A generated file can exist in R2, or an import can have completed its writes, while the `Report` row remains `PROCESSING` forever because the terminal callback returned 500 and the worker treated the HTTP exchange as complete.

**Opportunity.** Treat callback non-2xx as retryable delivery failure.

**Evidence.** Deep read showed `await fetch(CALLBACK_URL, ...)` followed only by logging in the worker, while the callback route performs environment and presigned-URL work before terminal status persistence.

### 4. Completion idempotency is check-then-write, not atomic
**Severity: Medium · Blast radius: medium**

**What & where.** `apps/frontend/src/app/api/reportComplete/route.ts` first reads the report status with `findUnique`, then performs an unconditional `report.update` by id for either `COMPLETED` or `FAILED`. The webhook payload schema in `packages/shared-validators/src/schemas/report.ts` has no delivery id, attempt id, generation token, or terminal-state precondition beyond `jobId`.

**Why it hurts.** Concurrent conflicting callbacks can both observe `PROCESSING` and race their terminal writes. A late failure callback can overwrite a success callback, or duplicate delivery can publish multiple terminal messages, because the idempotency check is not part of the database update.

**Opportunity.** Use a conditional terminal update with a single winner.

**Evidence.** Mechanical scan `scan-prisma-writes.txt` surfaced the read-then-update sequence; the deep read confirmed the write predicate is only `id: jobId`, not `id + status: PROCESSING` or an attempt key.

### 5. Voter imports can fail after partial database writes
**Severity: High · Blast radius: large**

**What & where.** `packages/voter-import-processor/src/parseVoterFile.ts` deletes the target archive slice, streams rows, flushes each batch through `bulkSaveVoterRecords`, and saves dropdown lists at the end. `packages/voter-import-processor/src/voterRecordProcessor.ts` writes archive rows, updates existing current voters, and creates new current voters per batch without wrapping the full import in one transaction or checkpoint protocol. `apps/report-server/src/reportProcessors/voterImportProcessor.ts` reports the job failed only after those writes may already have committed.

**Why it hurts.** A malformed late row, stream error, database timeout, or process crash can leave the archive partially rebuilt and current `VoterRecord` rows partially advanced to the new import version, while the report status merely becomes `FAILED`. Retrying the import then starts by deleting the same archive slice again.

**Opportunity.** Make imports resumable or commit by durable checkpoint.

**Evidence.** The import code runs `cleanupDB`, then repeatedly calls `bulkSaveVoterRecords` as the parser emits rows; `bulkSaveVoterRecords` commits archive/current-record writes each time it is called.

### 6. Duplicate import deliveries can destructively interleave
**Severity: Medium · Blast radius: large**

**What & where.** `/start-job` in `apps/report-server/src/index.ts` accepts and queues every valid payload; it does not claim a `jobId`, reject already-running work, or serialize by import version. Voter import cleanup in `packages/voter-import-processor/src/parseVoterFile.ts` deletes all archive rows for `(year, recordEntryNumber)`, while uniqueness for those archive rows is only the final data shape in `apps/frontend/prisma/schema.prisma`.

**Why it hurts.** If the same voter import payload is replayed or delivered twice, two workers can both clean and rebuild the same archive slice. With queue concurrency greater than one, one import can delete rows the other has already inserted, then both can continue writing current voters and dropdowns from independent parser progress.

**Opportunity.** Add an idempotent import claim per version/job.

**Evidence.** Deep read connected the unconditional `q.push` path, the `QUEUE_CONCURRENCY = 2` worker, and the import cleanup keyed only by year and entry number.

### 7. BOE eligibility background runs have no durable run state
**Severity: Medium · Blast radius: medium**

**What & where.** `apps/report-server/src/jobOrchestration.ts` enables recurring BOE scans by default and enqueues synthetic `boeEligibilityFlagging` jobs with random ids. `apps/report-server/src/index.ts` sets `shouldSendCallback` false for those jobs, so success and failure are not reflected in any `Report` row or background-run table. `packages/shared-prisma/src/boeEligibilityFlagging.ts` performs flag creates, pending-flag updates, stale-flag auto-resolution, and audit writes as independent operations.

**Why it hurts.** Scheduled or import-triggered eligibility scans can fail halfway through mutating flags, or fail entirely, with only process logs as evidence. Operators cannot tell which run last succeeded, which import triggered it, or whether a partial run needs replay.

**Opportunity.** Track BOE scan runs as durable async work.

**Evidence.** The scan profile highlighted `setTimeout`, `setInterval`, queue enqueue, and `boeEligibilityFlagging` status writes. Deep read found no callback, run-status persistence, or transaction around the full flagging run.

### 8. Report forms can lose the durable job id after client timeout
**Severity: Low · Blast radius: medium**

**What & where.** `apps/frontend/src/hooks/useApiMutation.ts` aborts mutations after 10 seconds by default. Report forms such as `apps/frontend/src/components/reports/ScopedReportForm.tsx`, `apps/frontend/src/app/voter-list-reports/VoterListReportForm.tsx`, and `apps/frontend/src/components/admin/PresignedUploadReportForm.tsx` use that default for `/api/generateReport`. The durable job list can still be polled later via `apps/frontend/src/app/reports/page.tsx`, but the forms only subscribe to realtime after they receive a `reportId`.

**Why it hurts.** If the backend creates and enqueues a report but the browser aborts before the response arrives, the user sees a timeout and the form never mounts `ReportStatusTracker` for the actual job. The job may still complete, but the initiating workflow has lost the handle it needs for direct recovery.

**Opportunity.** Make report-start responses recoverable after timeout.

**Evidence.** The hook default timeout is shared across mutations; each report form sets `reportId` only in `onSuccess`, and the dashboard is a separate polling surface rather than a form-level fallback.

## Already good
- `apps/frontend/src/app/api/reportComplete/reportCompleteVerifier.ts` verifies HMAC over the raw body before the callback handler runs, preserving a clean backend trust boundary for terminal job updates.
- `apps/frontend/src/app/api/reportComplete/route.ts` intentionally skips callbacks after a report has already left `PROCESSING`, which is the right shape for duplicate terminal delivery after the state is already durable.
- `apps/report-server/src/utils.ts`, `apps/report-server/src/utils/xlsxUtils.ts`, and `apps/report-server/src/s3Utils.ts` propagate storage upload failure back to `processJob`; generated reports are not marked complete after an upload helper returns false.
- `apps/frontend/src/components/reports/PendingJobsIndicator.tsx` polls pending, processing, and failed reports, so the dashboard has a durable-status fallback even when realtime delivery is missed.

## Backlog-only notes

### B1. Uploaded source objects can be orphaned after report-start failure
**What & where.** `apps/frontend/src/hooks/useFileUpload.ts` uploads the file to R2 before `apps/frontend/src/components/admin/PresignedUploadReportForm.tsx` calls `/api/generateReport`.  
**Why defer.** A failed report-start leaves storage clutter rather than incorrect job state, and the object key is still available in the form until reset.  
**Future direction.** Add cleanup or expiration for source upload objects that never become accepted jobs.

### B2. PDF browser cleanup is not in a finally block
**What & where.** `apps/report-server/src/utils.ts` closes the Puppeteer browser only after upload succeeds.  
**Why defer.** This is primarily a worker resource leak under failure pressure, not a direct lifecycle-state corruption.  
**Future direction.** Close browser resources in `finally` around PDF generation and upload.

## Not a finding
- **Report-complete skips duplicate terminal callbacks** - skipping non-`PROCESSING` rows in `apps/frontend/src/app/api/reportComplete/route.ts` is acceptable once a terminal state is already durable; the finding is the pre-`PROCESSING` race and non-atomic claim.
- **Report-server upload failure propagation** - `apps/report-server/src/s3Utils.ts` returns false on upload failure and callers in `apps/report-server/src/utils.ts` and XLSX helpers throw instead of sending success callbacks.
- **Absentee and presigned upload forms lack inline report recovery** - this is covered by the shared form timeout/status-handle finding rather than separate per-form findings.
- **Report-server `/start-job` trust boundary** - the worker currently validates payload shape but does not verify the frontend signature; that is important, but belongs in the trust-boundary vector rather than this async reliability register.
