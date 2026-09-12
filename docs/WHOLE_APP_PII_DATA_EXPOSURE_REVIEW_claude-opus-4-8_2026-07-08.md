# Whole-App PII & Data Exposure Review

## Basis
- **Branch:** `feat/srs-implementation` · **Commit:** `daaf2c7` · **Date:** 2026-07-08 · **Model:** `claude-opus-4-8`
- **Deliverable:** `docs/WHOLE_APP_PII_DATA_EXPOSURE_REVIEW_claude-opus-4-8_2026-07-08.md`
- **Review run:** `.review/` (frozen basis `basis.txt`, manifest `product-files.txt`)
- **Product files:** 356 · **checksum:** `c44a825f107e248477c02b2e8b26782dbd61aec1c8e9d4f8acf994ed38f3fd4c` · **algorithm:** sha256
- **Inventory:** `pnpm review:freeze pii` · **Scan profile:** `pii-data`
- **Methodology:** `docs/review/WHOLE_APP_PII_DATA_EXPOSURE_REVIEW_METHODOLOGY.md`
- **Axis:** Sensitive-data exposure likelihood × recipient/blast radius — PII minimization, export/download exposure, presigned URL handling, log/metadata leakage.

## At a glance
| # | Finding | Severity | Blast | Opportunity |
|---|---------|----------|-------|-------------|
| 1 | `fetchCommitteeList` returns full voter records to Leaders | High | medium | Apply roster's Admin-only contact policy |
| 2 | Ably realtime token grants unscoped channel access | Medium | medium | Scope token capability to owner's job channels |
| 3 | `reports?type=public` leaks generator email + presigned URLs to every authed user | Medium | medium | Drop email; reconsider ReadAccess download floor |
| 4 | Full voter record logged on bulk-load validation error | Medium | small | Log identifiers, not the row |
| 5 | Audit export embeds raw before/after/metadata JSON | Low | small | Minimize/redact serialized PII columns |

**Counts:** 5 findings · 3 backlog-only notes

## Subsystem map
| Area | Defining surfaces | Depth |
|---|---|---|
| Voter search output | fetchFilteredData handler, shared record→API converter | medium |
| Committee roster/list read paths | roster route + seat-row builder, committee-list route | high |
| Reports lifecycle & realtime | generateReport, reportComplete webhook, reportJobs, reports list, realtime token, status tracker | high |
| Report generation server | report-server voter fetch, webhook signing, presigned read | medium |
| Presigned upload | CSV / voter-file upload URL routes, S3 helpers | medium |
| Audit export | audit export route | medium |
| Bulk import | bulkLoadData utilities | medium |

## Findings

### 1. `fetchCommitteeList` returns the entire voter record to Leaders, bypassing the roster's Admin-only contact policy
**Severity: High · Blast radius: medium**
**What & where.** `apps/frontend/src/app/api/fetchCommitteeList/route.ts` loads memberships with `include: { voterRecord: true }` and returns `...committee` verbatim, so each active member's full `VoterRecord` — including `email`, `telephone`, mailing address fields, and `dateOfBirth` — is serialized to any `Leader`. The sibling roster endpoint deliberately withholds this: `apps/frontend/src/app/api/committee/roster/route.ts` sets `includeContact = isAdmin` under an explicit "Contact info (email/phone) is Admin-only" policy, and `apps/frontend/src/app/api/committee/roster/buildSeatRosterRows.ts` only attaches a `contact` block (and never the raw record) when `includeContact` is true.
**Why it hurts.** Two routes render the same committee roster to the same audience, but one hands a Leader the complete PII row while the other caps them at name + VRCNUM. The minimization decision made for the roster is silently defeated by the list route.
**Opportunity.** Serialize `fetchCommitteeList` through a shared roster projection that honors the Admin-only contact gate instead of spreading the raw record.
**Evidence.** `route.ts:88-96` (`include: { voterRecord: true }`) and `route.ts:142-151` (`...committee`) vs `buildSeatRosterRows.ts:154` / `buildSeatRosterRows.ts:172` (contact only when `includeContact`) and the policy comment at `roster/route.ts:57-61`.

### 2. Ably realtime token grants unscoped channel access; per-job presigned report URLs are readable by any authenticated user
**Severity: Medium · Blast radius: medium**
**What & where.** `apps/frontend/src/app/api/generateRealtimeToken/route.ts` calls `createTokenRequest({ clientId })` with no `capability`, so Ably issues the default `{"*":["*"]}` grant — the token can subscribe to every channel. `apps/frontend/src/app/api/reportComplete/route.ts` publishes the completed report's **presigned download URL** to channel `report-status-${jobId}`, and `apps/frontend/src/app/components/ReportStatusTracker.tsx` subscribes purely by `reportId`. Nothing binds a job's channel to its owner.
**Why it hurts.** Any authenticated user (down to ReadAccess) can mint a token and subscribe to another user's `report-status-<jobId>` channel; at completion they receive a live presigned URL to a report file that may contain voter PII, with no ownership check on the channel.
**Opportunity.** Issue the token with a `capability` restricted to the caller's own job channels (or a per-user channel namespace).
**Evidence.** `generateRealtimeToken/route.ts:18-21` (no capability), `reportComplete/route.ts:89-96` + `reportComplete/route.ts:129-136` (presigned URL published to job channel), `ReportStatusTracker.tsx:21` (channel keyed only on `reportId`).

### 3. `reports?type=public` exposes the generator's email and live presigned download URLs to every authenticated user
**Severity: Medium · Blast radius: medium**
**What & where.** `apps/frontend/src/app/api/reports/route.ts` serves `type=public` to any `"Authenticated"` caller and, for every returned report, includes `generatedBy.email` and a freshly minted `presignedUrl` to the report file. The `my-reports` branch is correctly owner-scoped, but the public branch applies neither an email projection nor a download-privilege floor.
**Why it hurts.** Marking a report public (an Admin action) is reasonably meant to share the *file*, but it also broadcasts the author's email address and a downloadable link to PII-bearing exports to the lowest-privileged role, with no `COMPLETED` filter on the public branch.
**Opportunity.** Drop `email` from the public projection and decide deliberately whether ReadAccess should receive presigned download URLs.
**Evidence.** `reports/route.ts:47-55` (public branch, no owner/role narrowing), `reports/route.ts:60-67` (`generatedBy.email` selected), `reports/route.ts:78-91` (presigned URL attached to every row).

### 4. Full voter record is written to server logs on a bulk-load validation error
**Severity: Medium · Blast radius: small**
**What & where.** `apps/frontend/src/app/api/admin/bulkLoadData/bulkLoadUtils.ts` logs the entire in-flight record — `console.log("Error saving voter record", voterRecord)` — whenever required fields are missing, before throwing.
**Why it hurts.** The complete PII row (name, address, contact) lands in stdout / the log aggregator, an external persistence surface outside the app's access controls, on an easily-triggered error path. Admin-gated, but the log audience is broader than the route audience.
**Opportunity.** Log only identifying keys (e.g., VRCNUM plus the missing field names), never the whole record.
**Evidence.** `bulkLoadUtils.ts:200`.

### 5. Audit export embeds raw before/after/metadata JSON, copying whatever PII the audit rows captured
**Severity: Low · Blast radius: small**
**What & where.** `apps/frontend/src/app/api/admin/audit/export/route.ts` serializes `beforeValue`, `afterValue`, and `metadata` verbatim via `JSON.stringify` into the XLSX export, with no field selection or redaction.
**Why it hurts.** Any voter/contact data an audit entry happened to snapshot is copied wholesale into a downloadable spreadsheet. It is Admin-only and the CSV path already mitigates formula injection, but the JSON columns are an unbounded PII passthrough into a durable file.
**Opportunity.** Project audit diffs to a known, minimized field set (or redact known-sensitive keys) before writing them into the export.
**Evidence.** `audit/export/route.ts:119-141` (raw `JSON.stringify` of before/after/metadata into the sheet).

## Already good
- **Roster contact gating.** `apps/frontend/src/app/api/committee/roster/buildSeatRosterRows.ts` attaches contact info only when `includeContact` (Admin) is set — the projection pattern finding 1 should adopt.
- **`reportJobs` minimization + ownership.** `apps/frontend/src/app/api/reportJobs/route.ts` scopes to `generatedById` and uses an explicit `select` of metadata fields (no file keys, no PII).
- **Inter-service payload discipline.** The report server reads voter rows directly from the DB (`apps/report-server/src/index.ts` `fetchVoterRecords`) rather than shipping PII over the wire; the job payload is gzipped and HMAC-signed (`apps/frontend/src/app/api/generateReport/route.ts`).
- **Webhook hardening.** `apps/frontend/src/app/api/reportComplete/route.ts` is backend-verified, idempotent on non-`PROCESSING` status, and the audit CSV path mitigates spreadsheet formula injection (`apps/frontend/src/app/api/admin/audit/export/route.ts`).

## Backlog-only notes

### B1. Presigned-read helper logs the S3 object key on every call
**What & where.** `apps/frontend/src/lib/s3Utils.ts` runs `console.log("getting presigned for ", key)` on each read; keys embed upload filenames (`voter-file-uploads/<ts>-<name>`).
**Why defer.** Low-sensitivity metadata, no record contents; noisy but not a PII row.
**Future direction.** Drop or downgrade to debug-level logging.

### B2. `generateReport` returns the caught error in the response body
**What & where.** `apps/frontend/src/app/api/generateReport/route.ts` sets `message: error` on the 500 response.
**Why defer.** Serialized `Error` objects usually stringify to `{}`; this is an info-hygiene issue more than a PII leak.
**Future direction.** Return a static message; log details server-side only.

### B3. Access-denied page logs the attempting email to the browser console
**What & where.** `apps/frontend/src/app/auth/access-denied/AccessDeniedContent.tsx` does `console.log("Access denied for email:", email)`.
**Why defer.** Client-side console, and it is the caller's own email; narrow audience, no external persistence.
**Future direction.** Remove the log.

## Not a finding
- **`fetchFilteredData` returns full voter records to ReadAccess** — `apps/frontend/src/app/api/fetchFilteredData/route.ts` is the core voter-search function and ReadAccess is the granted floor for it; field sensitivity alone, with no over-broad recipient, is not a finding.
- **Presigned upload key naming** — `apps/frontend/src/app/api/getCsvUploadUrl/route.ts` and `apps/frontend/src/app/api/getVoterFileUploadUrl/route.ts` use timestamp-plus-filename keys but require Admin plus a short-lived presigned credential; no durable public access.
- **Report author name in the job payload** — `apps/frontend/src/app/api/generateReport/route.ts` embeds `reportAuthor`, but only within the HMAC-signed server-to-server payload; no client/log boundary crossed.
