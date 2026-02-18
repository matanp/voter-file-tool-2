# Test Code Review: Unstaged Changes — Gaps & Issues

**Reviewed**: 2026-02-15
**Scope**: All unstaged/untracked test files in `apps/frontend/src/__tests__/api/`

---

## 1. `generateReport.test.ts` (modified)

### What's Covered
- Auth (401/403)
- Success path: reportId + jobsAhead returned, report updated to `PROCESSING`
- Multiple report types: `ldCommittees` and `absenteeReport`
- 400 for invalid request body
- 500 when WEBHOOK_SECRET missing
- 500 + report marked FAILED when PDF API fails (`response.ok=false`)
- 500 + report marked FAILED when PDF API returns `ok=true` but `success=false`

### Fixed (from initial review)
- ~~Happy path did not verify report updated to PROCESSING~~ — added `report.update` assertion with `JobStatus.PROCESSING`
- ~~Manual session construction instead of `createMockSession()`~~ — all tests now use `createMockSession()`
- ~~Inline `process.env.WEBHOOK_SECRET` cleanup could leak on throw~~ — wrapped in `try/finally` to guarantee restoration even if assertions throw
- ~~No test for other report types~~ — added `absenteeReport` type test
- ~~No test for `response.ok=true` but `success=false`~~ — added test confirming report marked FAILED

### Remaining Gaps
| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 1 | **No test for session missing `user.id`** — the route returns 500 if `session?.user?.id` is falsy. | Low | |
| 2 | **No test for gzip/HMAC signing correctness** — tests don't verify the webhook signature or compressed payload format. | Low | May be better suited for integration tests. |

---

## 2. `reportJobs.test.ts` (modified)

### What's Covered
- Auth (401/403)
- Basic success with empty results
- Status filtering: single status, multiple statuses, `status=all`, invalid status
- Pagination with `page`/`pageSize`, pageSize capped to 100, page clamped to maxPage
- Response shape with populated report data
- DB error handling (findMany and count failures)

### Fixed (from initial review)
- ~~No test for `report.count` failure~~ — added count failure test returning 500
- ~~No test for page clamping~~ — added tests for `pageSize=200` capped to 100 and `page=99999` clamped to maxPage
- ~~No test for response shape with actual reports~~ — added test with populated report data verifying structure

### Remaining Gaps
| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 1 | **No test for NaN page/pageSize** — the route falls back to defaults when `parseInt` yields NaN. | Low | The `reports.test.ts` has this — inconsistent coverage across similar endpoints. |
| 2 | **Missing test for comma-separated with one invalid value** — e.g., `status=COMPLETED,BOGUS`. | Low | |

---

## 3. `reports.test.ts` (modified)

### What's Covered
- Auth (401/403)
- Basic success, type filtering (public/my-reports/all), non-admin fallback
- Pagination with boundary clamping
- S3 presigned URL success path (populated presignedUrl, fileSize, fileContentType)
- S3 presigned URL with `fileKey=null` (skips S3 calls, returns nulls)
- S3 error handling (presigned URL failure → null fields)
- DB error handling (findMany and count failures)

### Fixed (from initial review)
- ~~No test for successful presigned URL generation with actual report data~~ — added test confirming presignedUrl, fileSize, fileContentType populated correctly
- ~~No test for `report.fileKey === null`~~ — added test confirming S3 calls are skipped and null fields returned

### Remaining Gaps
| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 1 | **No test for default type** — when no `type` query param is provided, the route should default to some behavior. Not tested. | Low | |
| 2 | **`mockGetPresignedReadUrl` / `mockGetFileMetadata` mock setup happens in `beforeEach` AND inline** — the S3 error test overrides the mocks set in `beforeEach`. This works but could be cleaner. | Low | Style nit. |
| 3 | **Pagination clamp test comment has assumption** — `page=foo -> NaN -> 1; pageSize=-1 -> Math.max(1,-1) -> 1`. | Low | |

---

## 4. `admin/electionDates.test.ts` (new file)

### What's Covered
- Auth tests for both GET and POST (admin-only)
- GET success and DB error
- POST success (201), duplicate via findFirst (409), invalid date (400)
- POST Prisma P2002 unique constraint race condition (409)

### Fixed (from initial review)
- ~~No test for Prisma P2002 unique constraint~~ — added test where `findFirst` returns null but `create` throws P2002, confirming 409 response

### Remaining Gaps
| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 1 | **DELETE handler is at `/admin/electionDates/[id]`** — a separate route file, not this one. N/A for this test file. | N/A | Originally mislabeled as a gap in this file. |
| 2 | **No test for `revalidatePath` being called** — POST calls `revalidatePath("/petitions")` on success. | Low | |
| 3 | **No test for missing `date` field in POST body** — only tests invalid date string. | Low | |
| 4 | **No test for date timezone normalization** — the route normalizes dates to midnight UTC. | Low | |

---

## 5. `committee/fetchLoaded.test.ts` (new file)

### What's Covered
- Auth tests (admin-only)
- Empty discrepancies → success with empty arrays
- Non-empty discrepancies with voter records
- Multiple discrepancies with same VRCNUM (last entry wins via reduce)
- Discrepancy with non-existent voter record (appears in map but not in records)
- DB error → 500

### Fixed (from initial review)
- ~~No test for multiple discrepancies with same VRCNUM~~ — added test confirming reduce overwrite behavior (last entry wins)
- ~~No test for discrepancy with non-existent voter record~~ — added test confirming asymmetry between discrepanciesMap and recordsWithDiscrepancies

### Remaining Gaps
| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 1 | **No test for `voterRecord.findMany` failure** — only `committeeUploadDiscrepancy.findMany` failure is tested. | Low | |

---

## 6. `getCsvUploadUrl.test.ts` (new file)

### What's Covered
- Auth tests (admin-only)
- Missing required fields → 400
- Wrong file extension → 400
- Invalid content type → 400
- File too large (>50MB) → 400
- Path traversal characters in fileName sanitized
- Success path with uploadUrl/fileKey
- S3 error → 500

### Fixed (from initial review)
- ~~No test for special characters in fileName~~ — added test confirming `../../etc/passwd.csv` is sanitized (no `..` or `/etc/` in fileKey)

### Remaining Gaps
| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 1 | **No test for boundary file size (exactly 50MB)** | Low | |
| 2 | **No test for `fileSize: 0`** | Low | |
| 3 | **No test for all valid content types** — only `text/csv` tested in success case. | Low | |
| 4 | **Inconsistent assertion style** — the invalid content type test uses inline assertions. | Low | Style nit. |

---

## 7. `getVoterFileUploadUrl.test.ts` (new file)

### What's Covered
- Auth tests (admin-only)
- Missing required fields → 400
- Wrong file extension (.csv instead of .txt) → 400
- Invalid content type → 400
- File too large (>500MB) → 400
- Success path with uploadUrl/fileKey
- S3 error → 500

### Remaining Gaps
| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 1 | **Near-identical structure to `getCsvUploadUrl.test.ts`** — consider shared test factory. | Low | |
| 2 | **Same boundary/edge case gaps as getCsvUploadUrl** — no test for exactly 500MB, `fileSize: 0`, or special characters. | Low | |
| 3 | **No test for `text/csv` content type** — only `text/plain` tested in success path. | Low | |
| 4 | **Same inconsistent assertion style** for invalid content type test. | Low | |

---

## 8. `reports/[id].test.ts` (new file)

### What's Covered
- PATCH auth, missing params, invalid JSON body, wrong Content-Type, report not found, non-admin public access, empty update, successful title update, admin public update
- PATCH race condition: `updateMany` returns count:0 → 404
- PATCH DB error: `updateMany` throws → 500
- DELETE auth, missing params, report not found, successful soft-delete, DB error

### Fixed (from initial review)
- ~~No test for invalid JSON body in PATCH~~ — added test using `jest.spyOn(request, "json").mockRejectedValue()`
- ~~No test for `updateMany` returning `count: 0` in PATCH~~ — added race condition test confirming 404
- ~~No test for PATCH DB error (updateMany throws)~~ — added test confirming 500

### Remaining Gaps
| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 1 | **No test for `findUnique` returning null after successful update in PATCH** — another race condition path. | Low | |
| 2 | **No test for PATCH with `description` field** — only `title` and `public` tested. | Low | |
| 3 | **No test for PATCH with multiple fields** — e.g., updating both `title` and `description`. | Low | |
| 4 | **No test for `updateMany` returning `count: 0` in DELETE** — same race condition as PATCH. | Low | |
| 5 | **`routeContextMissingParams`** uses `params: undefined` — may not match real scenarios. | Low | |

---

## Cross-Cutting Issues

### 1. `as never` Type Assertions (All files)
Every Prisma mock uses `as never` to silence TypeScript:
```ts
prismaMock.report.create.mockResolvedValue({ id: MOCK_REPORT_ID } as never);
```
This hides type mismatches between mock data and actual Prisma return types. If the schema changes, these tests won't catch the mismatch at compile time. Consider creating typed mock factories instead.

### 2. Inconsistent Use of Test Utilities
- Some files use `expectErrorResponse()` consistently; others mix in inline assertions (e.g., `getCsvUploadUrl.test.ts` invalid content type test).

### 3. No Integration/Smoke Tests
All tests are unit tests with mocked Prisma/S3/auth. There are no integration tests that verify actual Prisma query construction, S3 presigned URL generation, or auth middleware chain behavior. This is expected for unit tests but should be noted.

---

## Summary by Priority

| Priority | Count | Key Items |
|----------|-------|-----------|
| **High** | 0 | All resolved |
| **Medium** | 0 | All resolved |
| **Low** | 17 | Boundary values, style inconsistencies, minor edge cases, additional race condition paths |
