# Whole-App Data Lifecycle & Retention Review

## Basis
- **Branch:** `feat/srs-implementation` · **Commit:** `fc87188` · **Date:** 2026-07-08 · **Model:** `composer-2.5`
- **Deliverable:** `docs/WHOLE_APP_DATA_LIFECYCLE_RETENTION_REVIEW_composer-2.5_2026-07-08.md`
- **Review run:** `.review/runs/WHOLE_APP_DATA_LIFECYCLE_RETENTION_REVIEW_composer-2.5_2026-07-08-fc87188`
- **Product files:** 356 · **checksum:** `c44a825f107e248477c02b2e8b26782dbd61aec1c8e9d4f8acf994ed38f3fd4c` · **algorithm:** sha256
- **Inventory:** `pnpm review:freeze data-lifecycle` · **Scan profile:** `data-lifecycle-retention`
- **Methodology:** `docs/review/WHOLE_APP_DATA_LIFECYCLE_RETENTION_REVIEW_METHODOLOGY.md`
- **Axis:** generated report files, uploads, presigned URLs, invite/token expiry, stale S3 objects, audit retention, archive/delete behavior, and privacy-preserving cleanup

## At a glance
| # | Finding | Severity | Blast | Opportunity |
|---|---------|----------|-------|-------------|
| 1 | No R2 object deletion anywhere in product code | High | large | Add delete helper and call sites |
| 2 | Report soft-delete hides DB row but leaves R2 artifact | High | large | Delete object when marking deleted |
| 3 | Successful upload can orphan R2 object without DB fileKey | High | medium | Link upload to row or reconcile |
| 4 | Upload presign mints keys with no durable tracking or cleanup | Medium | large | Track keys or lifecycle-prefix purge |
| 5 | Import and absentee source uploads never deleted after use | Medium | large | Delete source object post-job |
| 6 | Expired unused invites linger until same-email re-invite | Medium | medium | Scheduled expired-invite purge |
| 7 | Report rows accumulate with no retention or purge policy | Medium | medium | Bound FAILED/old COMPLETED rows |
| 8 | Client forms hold presigned URLs without expiry refresh | Low | small | Re-issue on download or shorten UI hold |

**Counts:** 8 findings · 3 backlog-only notes

## Subsystem map
- **Report artifact lifecycle:** high depth. Job creation, completion webhook, presigned read issuance, list/delete APIs, and client download surfaces live in `apps/frontend/src/app/api/generateReport/route.ts`, `apps/frontend/src/app/api/reportComplete/route.ts`, `apps/frontend/src/app/api/reports/route.ts`, `apps/frontend/src/app/api/reports/[id]/route.ts`, and `apps/frontend/src/components/reports/ReportCard.tsx`.
- **Report-server generation & upload:** high depth. Worker upload to R2, callback handoff of object keys, and filename conventions live in `apps/report-server/src/index.ts`, `apps/report-server/src/s3Utils.ts`, `apps/report-server/src/utils.ts`, and `packages/shared-validators/src/fileUtils.ts`.
- **Presigned upload handoff:** high depth. CSV and voter-file upload URL routes, shared client upload hook, and admin upload-then-generate forms live in `apps/frontend/src/app/api/getCsvUploadUrl/route.ts`, `apps/frontend/src/app/api/getVoterFileUploadUrl/route.ts`, `apps/frontend/src/hooks/useFileUpload.ts`, and `apps/frontend/src/components/admin/PresignedUploadReportForm.tsx`.
- **Invite/token expiry:** medium depth. Expiry validation, consumption, admin create/delete, and display live in `apps/frontend/src/lib/invites/validity.ts`, `apps/frontend/src/lib/applyPendingInvite.ts`, `apps/frontend/src/app/api/admin/invites/route.ts`, and `apps/frontend/src/app/api/auth/invite/loadValidInvite.ts`.
- **Import archive replacement:** medium depth. Per-version archive delete-before-reimport lives in `packages/voter-import-processor/src/parseVoterFile.ts` and `apps/frontend/src/app/api/admin/bulkLoadData/bulkLoadUtils.ts`.
- **Audit immutability:** light depth. Write-once audit rows and runtime delete guard live in `apps/frontend/prisma/schema.prisma` and `apps/frontend/src/lib/auditLogGuard.ts`.
- **Shared object-storage helpers:** high depth. Frontend and report-server S3 clients expose upload, read, head, and presign only in `apps/frontend/src/lib/s3Utils.ts` and `apps/report-server/src/s3Utils.ts`.

## Findings

### 1. No R2 object deletion anywhere in product code
**Severity: High · Blast radius: large**

**What & where.** Both object-storage helpers — `apps/frontend/src/lib/s3Utils.ts` and `apps/report-server/src/s3Utils.ts` — implement upload, stream/download, head metadata, and presigned URL generation only. A repo-wide search for `deleteObject`, `DeleteObject`, or equivalent cleanup calls across product TypeScript returns no matches.

**Why it hurts.** Every artifact family that writes to R2 (generated reports, CSV uploads, voter-file uploads) can only accumulate objects. There is no compensating delete path for soft-deleted reports, failed jobs, abandoned presigns, or post-processing source files.

**Opportunity.** Add a shared delete helper and wire it into each artifact family's terminal lifecycle step.

**Evidence.** Mechanical scan `scan-data-lifecycle.txt` surfaced presign/upload paths only; `rg 'deleteObject|DeleteObject' apps packages` returned zero product hits; deep read of both `s3Utils.ts` files confirmed read/write-only surface.

### 2. Report soft-delete hides the DB row but leaves the R2 artifact indefinitely
**Severity: High · Blast radius: large**

**What & where.** `apps/frontend/src/app/api/reports/[id]/route.ts` marks a report `deleted: true` without clearing `fileKey` or deleting the underlying object. List endpoints filter `deleted: false` in `apps/frontend/src/app/api/reports/route.ts`, but the `Report.fileKey` column and R2 object remain. Generated object keys are durable paths under author/type prefixes via `packages/shared-validators/src/fileUtils.ts`.

**Why it hurts.** A user or admin "delete" removes UI visibility while voter-bearing PDF/XLSX files persist in object storage without ownership, expiry, or audit linkage. Re-issuing a presigned URL is still possible for anyone who retained a prior URL until TTL, and the object itself never expires.

**Opportunity.** Delete the R2 object (or archive to a bounded-retention prefix) when soft-deleting a report.

**Evidence.** `reports/[id]/route.ts` `deleteReportHandler` updates only `{ deleted: true }`; `schema.prisma` `Report` model retains `fileKey`; `reports/route.ts` stops listing deleted rows but does not touch storage.

### 3. Successful R2 upload can orphan an object without a durable DB fileKey
**Severity: High · Blast radius: medium**

**What & where.** `apps/report-server/src/index.ts` uploads generated files to R2 (via `apps/report-server/src/utils.ts` and XLSX helpers) and only then sends a success callback whose `url` field is the object key. `apps/frontend/src/app/api/reportComplete/route.ts` persists `fileKey` only after the webhook handler runs successfully; it can return 500 before the update when `ABLY_API_KEY` is missing or `getPresignedReadUrl` fails. The report-server worker does not verify callback success.

**Why it hurts.** A generated report file can exist in R2 while the `Report` row stays `PROCESSING` with `fileKey: null`. The artifact has no DB owner, no list/download path, and no cleanup trigger — a silent orphan on the retention axis.

**Opportunity.** Persist fileKey atomically with terminal status or run orphan-object reconciliation.

**Evidence.** `report-server/src/index.ts` success path uploads then `fetch(CALLBACK_URL)` without checking `response.ok`; `reportComplete/route.ts` performs Ably/presign work between status check and `prisma.report.update` that sets `fileKey`.

### 4. Upload presign routes mint object keys with no durable tracking or compensating cleanup
**Severity: Medium · Blast radius: large**

**What & where.** `apps/frontend/src/app/api/getCsvUploadUrl/route.ts` and `apps/frontend/src/app/api/getVoterFileUploadUrl/route.ts` generate timestamped keys under `csv-uploads/` and `voter-file-uploads/` and return a one-hour presigned PUT URL. No database row records the key, uploader, or intended downstream job. `apps/frontend/src/hooks/useFileUpload.ts` uploads directly to R2 and keeps the key only in React state until a report is started.

**Why it hurts.** Keys are minted for every presign request. Abandoned flows — presign issued but upload never completed, upload completed but `/api/generateReport` never called, or report start failed after upload — leave sensitive source files in R2 forever with no product-level owner or purge hook.

**Opportunity.** Record upload intent in the database or enforce bucket lifecycle rules on upload prefixes.

**Evidence.** Both upload URL routes build `fileKey` locally and return it; `useFileUpload.ts` has no server-side completion callback; no product code references upload-key cleanup.

### 5. Voter-import and absentee CSV source objects are never deleted after processing
**Severity: Medium · Blast radius: large**

**What & where.** `apps/report-server/src/reportProcessors/voterImportProcessor.ts` streams the source file from R2 via `streamFileFromR2` and imports into Postgres, but never deletes the upload key afterward. Absentee processing in `apps/report-server/src/reportProcessors/absenteeReportProcessor.ts` downloads the CSV via `downloadFileFromR2(this.csvFileKey)` and generates an output report while leaving the input object in place.

**Why it hurts.** Raw voter files and absentee CSVs are among the most sensitive artifacts in the system. After successful ingestion or report generation, the full source file remains in object storage indefinitely with only a timestamped key prefix as lifecycle metadata.

**Opportunity.** Delete source upload objects after successful job completion.

**Evidence.** Deep read of `voterImportProcessor.ts` ends after `parseVoterFileFromStream` with no delete call; `AbsenteeDataLoader.ts` reads `csvFileKey` with no compensating cleanup; both S3 helper modules lack delete APIs.

### 6. Expired unused invites are only soft-deleted on same-email re-invite, not proactively
**Severity: Medium · Blast radius: medium**

**What & where.** `apps/frontend/src/lib/invites/validity.ts` defines `expiredUnusedInviteWhere` for admin cleanup, used only inside the create-invite transaction in `apps/frontend/src/app/api/admin/invites/route.ts` when a new invite is issued to the same email. `GET /api/admin/invites` returns all `deleted: false` rows regardless of `expiresAt`, including expired-but-unused invites with live `token` values.

**Why it hurts.** Expired credentials and invite metadata accumulate in the database until an admin manually deletes them or re-invites the same address. Tokens remain valid until `expiresAt` passes and are re-exposed on every admin list fetch.

**Opportunity.** Add scheduled or on-read purge of expired unused invites.

**Evidence.** `admin/invites/route.ts` `expiredUnusedInviteWhere` runs only in `createInviteHandler`; `getInvitesHandler` filters `deleted: false` only; `loadValidInvite.ts` correctly rejects expired tokens on consumption.

### 7. Report rows accumulate across all terminal states with no retention policy
**Severity: Medium · Blast radius: medium**

**What & where.** The `Report` model in `apps/frontend/prisma/schema.prisma` stores `PENDING`, `PROCESSING`, `FAILED`, and `COMPLETED` jobs indefinitely. `apps/frontend/src/app/api/reportJobs/route.ts` lists non-deleted jobs for the owner with no age filter. Soft-deleted rows retain `fileKey`, metadata, and timestamps without purge.

**Why it hurts.** Failed and stale `PROCESSING` rows, soft-deleted entries, and old completed jobs grow without bound in Postgres. Each retained `fileKey` is a latent pointer to a still-present R2 object (finding 2), complicating storage accounting and compliance-oriented retention reviews.

**Opportunity.** Define and enforce bounded retention for terminal and soft-deleted report rows.

**Evidence.** `reportJobs/route.ts` `whereClause` includes only `generatedById` and `deleted: false`; no `completedAt` or status-based pruning; `Report` schema has no TTL or archive fields.

### 8. Client report forms cache presigned completion URLs without expiry refresh
**Severity: Low · Blast radius: small**

**What & where.** `apps/frontend/src/app/api/reportComplete/route.ts` embeds a one-hour presigned read URL in the Ably completion message. Report forms including `apps/frontend/src/components/reports/ScopedReportForm.tsx`, `apps/frontend/src/app/petitions/GeneratePetitionForm.tsx`, and `apps/frontend/src/app/committee-reports/XLSXConfigForm.tsx` store that URL in `reportUrl` state and render it in anchors and iframes until the user navigates away.

**Why it hurts.** After the presigned TTL (default 3600s in `apps/frontend/src/lib/s3Utils.ts`), the cached client URL expires but the UI still presents a broken download/preview surface. Users may assume access was revoked when the link is simply stale — a lifecycle UX gap rather than durable over-retention, since list APIs can re-issue URLs.

**Opportunity.** Re-fetch a fresh presigned URL on download or hide stale client-held links.

**Evidence.** `ScopedReportForm.tsx` `setReportUrl(url)` from `ReportStatusTracker` `onComplete`; iframe `src={reportUrl}` with no TTL tracking; `getPresignedReadUrl` default `expiresIn = 3600`.

## Already good
- **Invite consumption is atomic and expiry-aware.** `apps/frontend/src/lib/applyPendingInvite.ts` uses `updateMany` with `unusedInviteWhere` so tokens cannot be double-consumed, and `apps/frontend/src/app/api/auth/invite/loadValidInvite.ts` rejects deleted, expired, and used invites before exposing payload data.
- **Per-import archive replacement is explicit.** `packages/voter-import-processor/src/parseVoterFile.ts` deletes the target `VoterRecordArchive` slice for `(year, recordEntryNumber)` before rebuilding, giving imports a clear replace-not-append lifecycle in the database.
- **Presigned read URLs use a bounded default TTL.** `apps/frontend/src/lib/s3Utils.ts` and `apps/report-server/src/s3Utils.ts` default `expiresIn` to 3600 seconds, and list APIs re-issue on demand rather than storing long-lived URLs in the database.
- **AuditLog immutability is enforced at runtime.** `apps/frontend/src/lib/auditLogGuard.ts` blocks update/delete/upsert on `AuditLog`, matching the schema comment that audit rows are write-once.

## Backlog-only notes

### B1. AuditLog rows have no archival or purge story beyond immutability
**What & where.** `apps/frontend/prisma/schema.prisma` `AuditLog` model and `apps/frontend/src/lib/auditLogGuard.ts`.  
**Why defer.** SRS §1.5 intentionally treats audit as immutable compliance history; no product policy claims shorter retention.  
**Future direction.** Document operator retention expectations and add cold-storage export if table growth becomes operational.

### B2. Ably completion messages carry presigned URLs into channel history
**What & where.** `apps/frontend/src/app/api/reportComplete/route.ts` publishes `url: signedUrl` to `report-status-${jobId}`.  
**Why defer.** URL TTL bounds off-platform persistence; channel access scope is primarily a trust-boundary concern (see PII review).  
**Future direction.** Publish job status only and let clients fetch fresh presigned URLs from owner-scoped APIs.

### B3. Admin invite list returns raw tokens for all non-deleted invites
**What & where.** `apps/frontend/src/app/api/admin/invites/route.ts` `getInvitesHandler` selects `token` for every active row.  
**Why defer.** Admin-only surface; tokens are invalidated by `expiresAt`, `usedAt`, and soft-delete.  
**Future direction.** Return invite URLs or opaque ids in list responses; reserve raw token for create-only.

## Not a finding
- **One-hour presigned URL default with on-demand re-issue** — matches operator workflow; list and completion paths mint fresh URLs rather than persisting them in `Report` rows.
- **AuditLog immutability without TTL** — intentional compliance posture per schema comment; not a retention gap on this axis without a stated shorter policy.
- **VoterRecordArchive long-lived storage** — archive rows are domain data with explicit per-version replacement on import, not orphaned file artifacts.
- **NextAuth session and VerificationToken expiry** — framework-managed credential lifetime outside product artifact families.
- **Callback delivery retry gap** — primarily async-reliability; cited here only where it leaves orphan R2 objects (finding 3).
