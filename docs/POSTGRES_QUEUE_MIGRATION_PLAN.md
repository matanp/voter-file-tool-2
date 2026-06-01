# Postgres Queue Migration Plan (Neon + Lightsail + Vercel)

## Goal
Replace the in-memory report queue in `apps/report-server/src/index.ts` with a durable Postgres-backed queue that works on Neon, without breaking the current frontend/API behavior.

## Current State In This Codebase
1. `apps/frontend/src/app/api/generateReport/route.ts` creates a `Report` row and calls `POST ${PDF_SERVER_URL}/start-job`.
2. `apps/report-server/src/index.ts` pushes jobs into `async.queue` (`QUEUE_CONCURRENCY = 2`), stored only in process memory.
3. When work finishes, report-server calls `POST /api/reportComplete` on frontend.
4. `apps/frontend/src/app/api/reportComplete/route.ts` updates `Report.status` and publishes Ably (`report-status-{jobId}`).

### Current Risk
- Queue state is lost on report-server restart/deploy because it is in-memory.
- No durable retry/visibility behavior at queue layer.

## Target Architecture (Recommended For This Repo)
Keep the existing service boundaries and contracts:
1. Frontend still calls report-server `/start-job`.
2. Report-server `/start-job` enqueues into Postgres (Graphile Worker tables), not `async.queue`.
3. A Graphile worker in report-server claims and processes jobs.
4. Callback to `/api/reportComplete` remains the status/finalization path.

This is the lowest-risk migration because UI polling, Ably notifications, webhook signing, and report schemas all stay in place.

## Why Graphile Worker Here
- SQL/table based (`FOR UPDATE SKIP LOCKED` pattern under the hood).
- No `CREATE EXTENSION` dependency required for Neon.
- Good fit for long-running Node workers on Lightsail.
- Lets us keep `Report` as business state and use worker tables only for queue mechanics.

## Required Changes

### 1) Dependencies (`apps/report-server/package.json`)
- Add:
  - `graphile-worker`
  - `pg`
- Remove `async` only after migration is complete.

### 2) Environment Variables
Use separate DB URLs:
- `POSTGRES_PRISMA_URL`: existing pooled URL for Prisma queries.
- `POSTGRES_DIRECT_URL`: new direct Neon connection for worker enqueue/claim/listen.

Files to update:
- `apps/report-server/.env.example`
- `infrastructure/templates/report-server.env.tpl`
- `main.tf` (new variable and template wiring)
- `terraform.tfvars.example`
- `docs/LOCAL_DEVELOPMENT.md`
- `infrastructure/DEPLOYMENT_SETUP.md`

Optional tunables:
- `WORKER_CONCURRENCY=2`
- `WORKER_POLL_INTERVAL_MS=1000`

### 3) Database Setup (One-time Per DB)
Install Graphile Worker schema on the same Postgres DB used by app data.

Example:
```bash
npx graphile-worker --schema-only -c "$POSTGRES_DIRECT_URL"
```

No Prisma schema migration is required for `Report` just to adopt the queue backend.

### 4) Report-Server Refactor
Split responsibilities:
- `apps/report-server/src/index.ts`
  - keep HTTP server and `/start-job`
  - validate/decompress request as today
  - enqueue job in Postgres
- new worker module (example: `apps/report-server/src/queue/worker.ts`)
  - register task `generate_report`
  - call existing report processing logic

Refactor existing `processJob(...)` out of `index.ts` into a reusable module (example: `apps/report-server/src/jobs/processReportJob.ts`) so worker task can call it directly.

### 5) Status Flow Alignment
Current frontend route marks `Report.status=PROCESSING` immediately after `/start-job` accepts.

Recommended change:
1. Keep status `PENDING` when enqueue succeeds.
2. Worker sets `PROCESSING` when it actually starts job execution.
3. `reportComplete` continues setting `COMPLETED` / `FAILED`.

Files:
- `apps/frontend/src/app/api/generateReport/route.ts`
- worker task module in report-server

This makes status truthful and supports delayed processing safely.

### 6) Idempotency
Use `jobId` (`Report.id`) as worker `jobKey` so retries/duplicate enqueue calls do not create duplicate jobs.

### 7) Callback Compatibility
Keep callback contract unchanged:
- path: `/api/reportComplete`
- signature header: `x-webhook-signature`
- payload shape: `ReportCompleteWebhookPayload`

No UI changes are required for `ReportStatusTracker` or `PendingJobsIndicator`.

## File-Level Change Map

### Frontend
- `apps/frontend/src/app/api/generateReport/route.ts`
  - enqueue request remains
  - stop setting `PROCESSING` immediately
  - keep failure path setting `FAILED`
- `apps/frontend/src/app/api/reportComplete/route.ts` (optional hardening)
  - optionally accept updates when current status is `PENDING` or `PROCESSING` during cutover window

### Report Server
- `apps/report-server/src/index.ts`
  - remove `async.queue`
  - enqueue into Graphile instead
- `apps/report-server/src/jobs/processReportJob.ts` (new)
  - move existing processing logic here
- `apps/report-server/src/queue/worker.ts` (new)
  - Graphile `run(...)` bootstrap and task registration
- `apps/report-server/src/lib/prisma.ts`
  - unchanged for report data queries/updates

### Infra / Ops
- `infrastructure/templates/report-server.env.tpl`
- `main.tf`
- `terraform.tfvars.example`
- `apps/report-server/ecosystem.config.js` (only if you choose separate worker process)

## Cutover Plan (Low Risk)

### Phase A: Compatibility Prep
1. Deploy frontend change so new jobs stay `PENDING` after enqueue.
2. (Optional) make `reportComplete` accept `PENDING` and `PROCESSING`.

### Phase B: Queue Backend Switch
1. Apply Graphile schema in DB.
2. Deploy report-server with Graphile enqueue + worker.
3. Verify new jobs move `PENDING -> PROCESSING -> COMPLETED/FAILED`.

### Phase C: Cleanup
1. Remove `async` dependency and old queue code.
2. Remove any temporary cutover logic.

## What Is Necessary Before Switching
1. A Neon direct DB URL available to report-server (`POSTGRES_DIRECT_URL`).
2. Graphile worker schema installed in production DB.
3. Lightsail deployment updated with new env vars.
4. A deploy window where in-memory queue can be drained first.

## In-Flight Job Handling During Migration
Before deploying the switch:
1. Stop new report submissions briefly (or deploy during low traffic).
2. Wait for current in-memory queue to drain.
3. Deploy new backend.

If any report rows remain stuck in `PENDING/PROCESSING` from old deployments, mark them `FAILED` and ask users to regenerate.

## Testing Checklist

### Automated
1. Update `apps/frontend/src/__tests__/api/generateReport.test.ts`
   - success path should no longer expect immediate `PROCESSING` update (if adopting status change).
2. Keep `reportComplete` tests passing (`apps/frontend/src/__tests__/api/reportComplete.test.ts`).
3. Keep `reportJobs` tests passing (`apps/frontend/src/__tests__/api/reportJobs.test.ts`).

### Manual
1. Create each supported report type (`ldCommittees`, `voterList`, `designatedPetition`, `absenteeReport`, `voterImport`).
2. Restart report-server while jobs are queued; confirm jobs still process after restart.
3. Verify Ably completion updates still arrive in report forms.

## Rollback Plan
If worker deployment fails:
1. Re-deploy previous report-server version (with in-memory queue).
2. Keep frontend code compatible (`PENDING` is still valid in UI).
3. Re-run migration once worker health checks are green.

## Optional Follow-Up: Frontend Direct Enqueue (Remove `/start-job` Hop)
If you also switch to frontend direct enqueue (remove `/start-job` hop), that is a bigger step: ~4-7 days with higher risk because it changes service boundaries and producer logic.

### Why This Is Higher Risk
1. Producer logic moves from report-server into frontend API routes.
2. Frontend becomes directly responsible for queue-write reliability and idempotency.
3. Existing webhook-authenticated handoff (`generateReport` -> `/start-job`) is replaced by DB enqueue semantics.
4. Deployment coordination is tighter because multiple boundaries change at once.

### Target Follow-Up Architecture
1. Frontend `POST /api/generateReport` writes `Report` row and enqueues Graphile job directly.
2. Report-server runs worker-only process(es) that consume queue jobs and execute report logic.
3. Report-server callback to `POST /api/reportComplete` remains unchanged.

### Optional Follow-Up Plan

#### Phase 1: Prep (Day 1)
1. Add queue client utility in frontend (direct DB URL for queue enqueue only).
2. Keep existing `/start-job` path active behind a feature flag for fallback.
3. Define job payload contract for worker task (`reportId`, `type`, any required context).

#### Phase 2: Dual-Path Compatibility (Day 2)
1. Update `apps/frontend/src/app/api/generateReport/route.ts` to support:
   - legacy path: call report-server `/start-job`
   - new path: direct Graphile enqueue
2. Use feature flag/env toggle to choose path at runtime.
3. Preserve current API response shape (`reportId`, `jobsAhead`) so UI is unchanged.

#### Phase 3: Worker-Only Report Server (Day 3-4)
1. Ensure report-server has a standalone worker entrypoint (`run(...)`).
2. Keep `/start-job` temporarily for rollback while direct enqueue is being validated.
3. Validate all report types end-to-end through direct enqueue path.

#### Phase 4: Cutover + Cleanup (Day 5-7)
1. Enable direct enqueue in production.
2. Monitor queue throughput/failures and report completion rates.
3. Remove `/start-job` code path and related request validation/compression logic once stable.
4. Update docs and Terraform/env vars to reflect new boundary (frontend producer, report-server consumer).

### Suggested File Touchpoints For This Follow-Up
1. `apps/frontend/src/app/api/generateReport/route.ts`
2. `apps/frontend/package.json` (if queue client dep added)
3. `apps/report-server/src/index.ts` (remove `/start-job` endpoint after cutover)
4. `apps/report-server/src/queue/worker.ts`
5. `apps/report-server/ecosystem.config.js` (worker process definition)
6. `docs/LOCAL_DEVELOPMENT.md`
7. `infrastructure/DEPLOYMENT_SETUP.md`
8. `main.tf` and env templates if boundary-specific vars change

### Rollback Strategy For This Follow-Up
1. Keep `/start-job` available during rollout.
2. Flip feature flag back to legacy enqueue path if direct enqueue has issues.
3. Keep worker runtime unchanged so only producer path is toggled.

## Optional Improvements After Migration
1. Verify `x-webhook-signature` on inbound `/start-job` (currently not verified in report-server).
2. Move queue depth metric to DB query for a real `numJobs` estimate.
3. Add retry policy by classifying transient vs permanent failures.
4. Split API and worker into separate PM2 processes for better isolation.
