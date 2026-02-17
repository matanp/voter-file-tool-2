# Test Coverage Analysis

## Executive Summary

Testing exists across the frontend app, report-server, shared packages, and voter-import-processor. Search system coverage is strong; API routes now include auth enforcement tests via `createAuthTestSuite()`. Admin routes, generateReport, reports, reportJobs, reportComplete, and handleRequest are all tested with 401/403 assertions. **API coverage expansion (Feb 2025):** reports now tests type filtering (public/my-reports/all), pagination, S3 error handling, and DB errors; reportJobs tests status filtering, 400 invalid status, and pagination; new tests for reports/[id] (PATCH/DELETE), committee/fetchLoaded, admin/electionDates, getVoterFileUploadUrl, getCsvUploadUrl; generateReport now tests WEBHOOK_SECRET missing and PDF API failure. Report-server has Jest config and `webhookUtils` HMAC tests. Shared-validators and voter-import-processor have dedicated Jest configs and tests. **Remaining gaps:** frontend pages, admin components, auth flow, xlsxGenerator (still has known typo bug), xlsx-tester package, admin/electionDates/[id], admin/officeNames, admin/invites, auth/invite/[token], generateRealtimeToken. **`useApiMutation` now tested** (Feb 2025) — success/error/timeout flows, callbacks, specialized hooks.

---

## Current Test Infrastructure

- **Framework:** Jest 30 + React Testing Library + @testing-library/user-event
- **Environment:** jsdom (via jest-environment-jsdom)
- **Config:** `apps/frontend/jest.config.cjs`
- **Setup:** `apps/frontend/jest.setup.ts`
- **Path aliases:** `~/` mapped to `apps/frontend/src/`
- **CSS:** identity-obj-proxy
- **Excludes:** `__tests__/utils/`, `__tests__/types/`, `__tests__/__mocks__/` (support files)

**Test infrastructure now exists for:**

- `apps/report-server` — `jest.config.cjs`, `test` script, `webhookUtils.test.ts`
- `packages/shared-validators` — `jest.config.cjs`, `test` script, own test suite (compoundFieldUtils, fileUtils, committeeUtils, reportTypeMapping, searchQueryFieldValidators, searchQueryFieldGuards, schemas, etc.)
- `packages/voter-import-processor` — `jest.config.cjs`, `test` script, `voterRecordProcessor.test.ts`

**No test infrastructure exists for:**

- `packages/xlsx-tester` (no tests at all)

---

## What IS Tested

### Search System (Strong Coverage)

| File                     | Test File                     | Coverage Quality                                                                                         |
| ------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| `VoterRecordSearch.tsx`  | `VoterRecordSearch.test.tsx`  | Excellent -- user journeys, interactions, keyboard shortcuts, aria attributes, announcements, edge cases |
| `SearchRow.tsx`          | `SearchRow.test.tsx`          | Good -- field rendering, callbacks, accessibility                                                        |
| `FieldRenderer.tsx`      | `FieldRenderer.test.tsx`      | Good -- per-field-type rendering                                                                         |
| `SearchQueryDisplay.tsx` | `SearchQueryDisplay.test.tsx` | Good -- display formatting, clear button                                                                 |
| `DateOfBirthPicker.tsx`  | `DateOfBirthPicker.test.tsx`  | Good -- date input edge cases                                                                            |
| `DateRangePicker.tsx`    | `DateRangePicker.test.tsx`    | Good -- range validation                                                                                 |

### API Routes (Strong Coverage)

| Route                                        | Test File                                  | Coverage Quality                                                                                     |
| -------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `POST /api/committee/add`                    | `committee/add.test.ts`                    | Good -- 401/403 auth, success, idempotency, Prisma errors, validation                                |
| `POST /api/committee/remove`                 | `committee/remove.test.ts`                 | Good -- 401/403 auth, ownership checks, not-found cases                                              |
| `POST /api/committee/requestAdd`             | `committee/requestAdd.test.ts`             | Good -- 401/403 auth, validation, at-least-one-action check                                          |
| `POST /api/committee/handleRequest`          | `committee/handleRequest.test.ts`          | Good -- 401/403 auth, 404, 400 (capacity/duplicate), accept/reject flows                             |
| `POST /api/committee/fetchLoaded`            | `committee/fetchLoaded.test.ts`            | Good -- 401/403 auth (Admin), empty/non-empty discrepancies, 500                                     |
| `GET /api/fetchCommitteeList`                | `fetchCommitteeList.test.ts`               | Good -- 401/403 auth, success, not-found                                                             |
| `POST /api/fetchFilteredData`                | `fetchFilteredData.test.ts`                | Good -- 401/403 auth, pagination, validation, query building                                         |
| `POST /api/admin/bulkLoadData`               | `admin/bulkLoadData.test.ts`               | Good -- 401/403 auth, 503 when VERCEL env set                                                        |
| `POST /api/admin/bulkLoadCommittees`         | `admin/bulkLoadCommittees.test.ts`         | Good -- 401/403 auth, success path                                                                   |
| `POST /api/admin/handleCommitteeDiscrepancy` | `admin/handleCommitteeDiscrepancy.test.ts` | Good -- 401/403 auth, 400 when VRCNUM missing                                                        |
| `POST /api/admin/loadAdmin`                  | `admin/loadAdmin.test.ts`                  | Good -- 401/403 auth, success when Developer                                                         |
| `GET/POST /api/admin/electionDates`          | `admin/electionDates.test.ts`              | Good -- 401/403 auth (Admin), GET/POST success, 409 duplicate, 400 invalid, 500                      |
| `POST /api/generateReport`                   | `generateReport.test.ts`                   | Good -- 401/403 auth, ldCommittees success, 400 invalid, 500 WEBHOOK_SECRET missing, 500 PDF failure |
| `POST /api/reportComplete`                   | `reportComplete.test.ts`                   | Good -- HMAC verification (missing secret, missing sig, invalid sig, valid sig)                      |
| `GET /api/reports`                           | `reports.test.ts`                          | Good -- 401/403 auth, type filtering (public/my-reports/all), pagination, S3 error, DB error         |
| `GET /api/reportJobs`                        | `reportJobs.test.ts`                       | Good -- 401/403 auth, status filtering, 400 invalid status, pagination, DB error                     |
| `PATCH/DELETE /api/reports/[id]`             | `reports/[id].test.ts`                     | Good -- 401/403 auth, 404/400/403, PATCH title/description/public, DELETE soft-delete                |
| `POST /api/getVoterFileUploadUrl`            | `getVoterFileUploadUrl.test.ts`            | Good -- 401/403 auth (Admin), validation (ext, contentType, size), success, 500                      |
| `POST /api/getCsvUploadUrl`                  | `getCsvUploadUrl.test.ts`                  | Good -- 401/403 auth (Admin), validation (ext, contentType, size), success, 500                      |

### Library/Utility Code (Partial Coverage)

| Module                   | Test File                                                                  | Coverage Quality                            |
| ------------------------ | -------------------------------------------------------------------------- | ------------------------------------------- |
| `dateBoundaries`         | `dateBoundaries.test.ts`                                                   | Good -- edge cases                          |
| `dateRangeValueEquality` | `dateRangeValueEquality.test.ts`                                           | Good -- deep comparison                     |
| `dateUtils`              | `dateUtils.test.ts`                                                        | Good -- formatting                          |
| `searchFieldProcessor`   | `searchFieldProcessorDateRange.test.ts`, `searchFieldProcessorDOB.test.ts` | Good -- DOB and date range field conversion |

### Shared Validators (Good Coverage -- Own Jest Suite)

| Module                          | Test File                                                          | Quality                                           |
| ------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| `searchQueryNormalizers`        | `searchQueryNormalizers.test.ts`                                   | Good                                              |
| `searchQueryUtils` (date range) | `searchQueryUtilsDateRange.test.ts`                                | Good                                              |
| `schemas/report` (date range)   | `reportDateRange.test.ts`                                          | Good                                              |
| `committeeUtils`                | `committeeUtils.test.ts`                                           | Good -- sentinel value conversion                 |
| `compoundFieldUtils`            | `compoundFieldUtils.test.ts`                                       | Good -- address/name formatting, field extraction |
| `fileUtils`                     | `fileUtils.test.ts`                                                | Good -- S3 key sanitization, filename generation  |
| `reportTypeMapping`             | `reportTypeMapping.test.ts`                                        | Good -- report type validation                    |
| `searchQueryFieldValidators`    | `searchQueryFieldValidators.test.ts`                               | Good                                              |
| `searchQueryFieldGuards`        | `searchQueryFieldGuards.test.ts`                                   | Good                                              |
| `searchQueryErrors`             | `searchQueryErrors.test.ts`                                        | Good                                              |
| `constants`                     | `constants.test.ts`                                                | Good                                              |
| `schemas`                       | `voterRecord.test.ts`, `designatedPetition.test.ts`, `api.test.ts` | Good                                              |

### Report-Server (Partial Coverage)

| Module         | Test File              | Quality                                                                                         |
| -------------- | ---------------------- | ----------------------------------------------------------------------------------------------- |
| `webhookUtils` | `webhookUtils.test.ts` | Good -- createWebhookSignature (sha256= prefix, consistency, payload/secret variations, Buffer) |

### Voter Import Processor (Partial Coverage)

| Module                 | Test File                      | Quality                                                                               |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| `voterRecordProcessor` | `voterRecordProcessor.test.ts` | Good -- convertStringToDateTime, isRecordNewer, transformVoterRecord (pure functions) |

### Hooks (Partial Coverage)

| Hook             | Test File                      | Quality                                                                                                                                                          |
| ---------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useApiMutation` | `hooks/useApiMutation.test.ts` | Good -- success/error/timeout, callbacks (onSuccess/onError/onFinally), reset, customEndpoint, HTTP methods, optionsRef; useApiPost/Delete/Patch/Put smoke tests |

---

## What is NOT Tested

### P0 -- Critical Gaps (Security/Data Integrity Risk)

#### Auth/Privilege Enforcement — ✅ ADDRESSED

All API route tests now use `createAuthTestSuite()` to verify 401 (unauthenticated) and 403 (insufficient privilege). A developer removing `withPrivilege` from any tested route would cause tests to fail.

#### Voter Import Processor — Partially Addressed

**Tested:** `convertStringToDateTime`, `isRecordNewer`, `transformVoterRecord` (pure functions).

**Still untested:**

- `bulkSaveVoterRecords` — requires test database
- `batchUpdateVoterRecords`
- `formatSqlValue`
- `processRecordForDropdownLists` — module-level mutable state

### P1 -- High Priority Gaps

#### Report-Server — Partially Addressed

**Tested:** `webhookUtils.ts` — `createWebhookSignature` (HMAC signing). HMAC verification is tested via `reportComplete.test.ts` in frontend (`reportCompleteVerifier`).

**Still untested:**

- Job queue processing and error handling
- Committee data mapping (`committeeMappingHelpers.ts`)
- XLSX generation (`xlsxGenerator.ts`) — has a known column header typo bug
- PDF generation pipeline (`utils.ts`)
- Absentee report processing (3 classes + data utils + statistics)
- CSV parsing (`csvProcessor.ts`)

**Recommendation:** Priority test targets: `committeeMappingHelpers.ts`, `xlsxGenerator.ts` (column header mapping), `absenteeDataUtils.ts`, `csvProcessor.ts`.

#### Shared Validators — Mostly Addressed

**Remaining untested:**

- `voterImport.ts` — import job schema
- Full discriminated union in `schemas/report.ts` beyond date ranges

### API Routes -- Still Untested

The following API routes have no tests (excluded from coverage expansion by design or deferred):

- `GET/PATCH/DELETE /api/admin/electionDates/[id]` — dynamic election date CRUD
- `GET/POST /api/admin/officeNames` and `admin/officeNames/[id]`
- `GET/POST /api/admin/invites`
- `GET /api/auth/invite/[token]` — invite token consumption
- `POST /api/generateRealtimeToken` — external service (Ably)
- `POST /api/admin/scripts/specialVoterFile` — one-off script
- `sentry-example-api`, `auth/[...nextauth]` — framework/example routes

### P2 -- Medium Priority Gaps

#### Frontend Pages -- No Tests

No `page.tsx` file has tests. Server Component data fetching, Prisma queries, and privilege gating in pages are all untested.

**Priority pages for testing:**

1. `/committees/page.tsx` -- server-side PII gating (admin vs non-admin query)
2. `/admin/data/page.tsx` -- admin-only access
3. `/recordsearch/page.tsx` -- dropdown data fetching

#### Frontend Components -- Significant Gaps

| Component              | Type         | Risk                         |
| ---------------------- | ------------ | ---------------------------- |
| `CommitteeSelector`    | Interactive  | Committee management core UI |
| `AddCommitteeForm`     | Interactive  | Privilege-gated behavior     |
| `CommitteeRequestForm` | Interactive  | Request creation             |
| `ReportCard`           | Interactive  | Edit/delete/download         |
| `ReportsList`          | Interactive  | Pagination, data fetching    |
| `PendingJobsIndicator` | Polling      | Polling lifecycle            |
| `GeneratePetitionForm` | Complex form | Multi-step form, validation  |
| `VoterListReportForm`  | Complex form | Context integration, preview |
| `XLSXConfigForm`       | Complex form | Column configuration         |
| All admin components   | Interactive  | CRUD operations              |

#### Auth Flow -- No Tests

The `signIn` callback, `createUser` event, privilege sync logic, and invite flow in `src/auth.ts` are completely untested. This is where:

- Privilege escalation/downgrade logic lives
- Invite validation and consumption happens
- The TOCTOU race condition exists

### P3 -- Nice to Have

#### Context Providers -- No Tests

`GlobalContext` (acting permissions, localStorage sync) and `VoterSearchContext` (cross-page search state) have no tests.

#### Hooks -- Partial Coverage

- `useApiMutation` -- tested (hooks/useApiMutation.test.ts)
- `useDebouncedValue` -- untested
- `useWindowSize` -- untested
- `useFormValidation` -- untested
- `useSearchState` -- indirectly tested via VoterRecordSearch tests

#### Error Boundaries -- No Tests

`error.tsx` and `error/page.tsx` -- Sentry capture, error display.

---

## Testing Patterns Assessment

### Strengths

- Search tests use `@testing-library/user-event` for realistic user interaction simulation
- Custom `renderWithVoterSearchProvider` helper wraps components in required providers
- API route tests use `Request` objects directly (Next.js App Router style)
- Prisma is properly mocked (`jest.mock('~/lib/prisma')`)
- Test structure mirrors source structure (`__tests__/` parallels `src/`)
- **`createAuthTestSuite()`** — shared auth assertion helper ensures 401/403 across all API routes
- Report-server and shared-validators have dedicated Jest configs and test suites

### Weaknesses

- No E2E test framework (Playwright, Cypress) for user flows
- No test database setup for data layer tests
- No snapshot tests for report rendering components
- `VoterListReportForm.test.ts` only tests a utility function inside the component file, not the component itself

---

## Recommendations

### Immediate Actions (Completed ✅)

1. ~~Add auth assertion tests to existing API route tests~~ — Done via `createAuthTestSuite()`
2. ~~Add Jest config to report-server~~ — Done
3. ~~Test `voter-import-processor` core functions~~ — Done: `convertStringToDateTime`, `isRecordNewer`, `transformVoterRecord`
4. ~~Test `webhookUtils` HMAC signing~~ — Done (report-server + reportComplete verifier in frontend)
5. ~~Test `compoundFieldUtils` and `fileUtils`~~ — Done (shared-validators)
6. ~~Test admin API routes~~ — Done: all 4 admin routes have auth + basic tests
7. ~~Deepen reports/reportJobs tests~~ — Done: type/status filtering, pagination, S3/DB errors (Feb 2025)
8. ~~Add reports/[id] PATCH/DELETE tests~~ — Done (Feb 2025)
9. ~~Add committee/fetchLoaded, admin/electionDates, getVoterFileUploadUrl, getCsvUploadUrl tests~~ — Done (Feb 2025)
10. ~~Add generateReport WEBHOOK_SECRET and PDF failure tests~~ — Done (Feb 2025)
11. ~~Test `useApiMutation`~~ — Done (Feb 2025): success/error/timeout, callbacks, specialized hooks

### Near-Term

12. **Test `xlsxGenerator` column headers** — catches the known `stateAssmblyDistrict` typo
13. **Test voter-import-processor remaining functions** — `processRecordForDropdownLists`, `formatSqlValue`; `bulkSaveVoterRecords` needs test DB
14. **Test report-server** — `committeeMappingHelpers`, `absenteeDataUtils`, `csvProcessor`
15. **Optional: Add tests for admin/electionDates/[id], officeNames, invites** — lower priority

### Strategic

16. **Add Playwright E2E tests** for critical user flows (search, add to committee, generate report)
17. **Set up a test database** (Docker) for voter-import-processor integration tests (`bulkSaveVoterRecords`)
18. **Add snapshot tests** for report-server React components (CommitteeReport, DesignatingPetition)

---

## Summary

| Area                           | Coverage                 | Priority to Fix                               |
| ------------------------------ | ------------------------ | --------------------------------------------- |
| Search UI components           | Strong                   | --                                            |
| Search API route               | Good                     | --                                            |
| Committee API routes (all 5)   | Good                     | --                                            |
| Auth/privilege enforcement     | ✅ All tested routes     | --                                            |
| Admin API routes (5 of ~8)     | Good                     | P2 (electionDates/[id], officeNames, invites) |
| Report/ReportJobs API routes   | Strong                   | --                                            |
| Upload URL routes (voter, csv) | Good                     | --                                            |
| voter-import-processor         | Partial (pure functions) | P1 (bulkSave, dropdown)                       |
| Report-server                  | Partial (webhookUtils)   | P1                                            |
| Shared validators              | Good                     | P1 (voterImport schema)                       |
| Frontend pages                 | None                     | P2                                            |
| Frontend admin components      | None                     | P2                                            |
| Auth flow (auth.ts)            | None                     | P2                                            |
| Hooks                          | Partial (useApiMutation) | P3                                            |
| Context providers              | None                     | P3                                            |
