# Test Coverage Analysis

## Executive Summary

Testing exists primarily in the frontend app, focused on the voter record search system. The report-server, shared packages, and most frontend pages/admin components have no test coverage. API route tests exist for a few endpoints but the majority (including all unauthenticated admin routes) are untested. No tests verify that authentication is enforced on any route.

---

## Current Test Infrastructure

- **Framework:** Jest 30 + React Testing Library + @testing-library/user-event
- **Environment:** jsdom (via jest-environment-jsdom)
- **Config:** `apps/frontend/jest.config.cjs`
- **Setup:** `apps/frontend/jest.setup.ts`
- **Path aliases:** `~/` mapped to `apps/frontend/src/`
- **CSS:** identity-obj-proxy
- **Excludes:** `__tests__/utils/`, `__tests__/types/`, `__tests__/__mocks__/` (support files)

**No test infrastructure exists for:**
- `apps/report-server` (no jest.config, no test scripts)
- `packages/shared-validators` (no jest.config -- tests run through frontend's runner)
- `packages/voter-import-processor` (no tests at all)
- `packages/xlsx-tester` (no tests at all)

---

## What IS Tested

### Search System (Strong Coverage)

| File | Test File | Coverage Quality |
|---|---|---|
| `VoterRecordSearch.tsx` | `VoterRecordSearch.test.tsx` | Excellent -- user journeys, interactions, keyboard shortcuts, aria attributes, announcements, edge cases |
| `SearchRow.tsx` | `SearchRow.test.tsx` | Good -- field rendering, callbacks, accessibility |
| `FieldRenderer.tsx` | `FieldRenderer.test.tsx` | Good -- per-field-type rendering |
| `SearchQueryDisplay.tsx` | `SearchQueryDisplay.test.tsx` | Good -- display formatting, clear button |
| `DateOfBirthPicker.tsx` | `DateOfBirthPicker.test.tsx` | Good -- date input edge cases |
| `DateRangePicker.tsx` | `DateRangePicker.test.tsx` | Good -- range validation |

### API Routes (Partial Coverage)

| Route | Test File | Coverage Quality |
|---|---|---|
| `POST /api/committee/add` | `committee/add.test.ts` | Good -- success, idempotency, Prisma errors, validation |
| `POST /api/committee/remove` | `committee/remove.test.ts` | Good -- ownership checks, not-found cases |
| `POST /api/committee/requestAdd` | `committee/requestAdd.test.ts` | Good -- validation, at-least-one-action check |
| `POST /api/fetchFilteredData` | `fetchFilteredData.test.ts` | Good -- pagination, validation, query building |

### Library/Utility Code (Partial Coverage)

| Module | Test File | Coverage Quality |
|---|---|---|
| `dateBoundaries` | `dateBoundaries.test.ts` | Good -- edge cases |
| `dateRangeValueEquality` | `dateRangeValueEquality.test.ts` | Good -- deep comparison |
| `dateUtils` | `dateUtils.test.ts` | Good -- formatting |
| `searchFieldProcessor` | `searchFieldProcessor.test.ts` | Good -- field conversion logic |

### Shared Validators (Partial -- Run Through Frontend Tests)

| Module | What's Tested | Quality |
|---|---|---|
| `searchQueryNormalizers` | Normalization logic | Good |
| `searchQueryUtils` (date range) | Prisma where clause building | Partial -- date range only |
| `schemas/report` (date range) | Date range schema validation | Partial |

---

## What is NOT Tested

### P0 -- Critical Gaps (Security/Data Integrity Risk)

#### API Routes -- No Auth Check Tests

None of the existing API route tests verify that authentication/authorization is enforced. The tests mock Prisma and call handlers directly without testing the `withPrivilege` wrapper. This means:
- A developer could remove `withPrivilege` from a route and no test would fail
- The 8+ unauthenticated admin routes have no tests at all

**Missing route tests (highest risk):**

| Route | Risk |
|---|---|
| `POST /api/admin/bulkLoadData` | Destructive, unauthenticated |
| `POST /api/admin/bulkLoadCommittees` | Destructive, unauthenticated |
| `POST /api/admin/handleCommitteeDiscrepancy` | Modifies PII, unauthenticated, no validation |
| `POST /api/admin/loadAdmin` | Privilege escalation, unauthenticated |
| `POST /api/generateReport` | Core business logic, complex validation |
| `POST /api/reportComplete` | Webhook handler, HMAC verification |
| `POST /api/committee/handleRequest` | Committee management, capacity enforcement |
| `GET /api/reports` | Data access control gap |

**Recommendation:** Write integration tests that verify:
1. Unauthenticated requests return 401
2. Insufficient privilege returns 403
3. Valid requests succeed
4. Invalid input returns 422

#### Voter Import Processor -- Zero Tests

`packages/voter-import-processor` has no tests. This package handles:
- CSV parsing of voter files (BOE format)
- Database upserts via raw SQL (`$executeRawUnsafe`)
- Dropdown list processing with module-level mutable state
- Date conversion with timezone implications

This is the highest-risk untested code. Bugs here corrupt the voter database.

**Recommendation:** Test `transformVoterRecord`, `isRecordNewer`, `convertStringToDateTime`, `bulkSaveVoterRecords` (with a test database), `processRecordForDropdownLists`.

### P1 -- High Priority Gaps

#### Report-Server -- Zero Tests

The entire `apps/report-server` has no test infrastructure. Untested code includes:
- Job queue processing and error handling
- Committee data mapping (`committeeMappingHelpers.ts`)
- XLSX generation (`xlsxGenerator.ts`) -- has a known column header typo bug
- Webhook signature creation (`webhookUtils.ts`)
- PDF generation pipeline (`utils.ts`)
- Absentee report processing (3 classes + data utils + statistics)
- CSV parsing (`csvProcessor.ts`)

**Recommendation:** Add Jest config to report-server. Priority test targets:
1. `webhookUtils.ts` -- HMAC signing (security-critical, pure function)
2. `committeeMappingHelpers.ts` -- data transformation (pure functions, easy to test)
3. `xlsxGenerator.ts` -- column header mapping (has a known typo bug)
4. `absenteeDataUtils.ts` -- statistics calculation (complex business logic)
5. `csvProcessor.ts` -- CSV parsing and validation

#### Shared Validators -- Incomplete Coverage

**Tested:** `searchQueryNormalizers`, date range schemas

**Untested:**
- `committeeUtils.ts` -- sentinel value conversion
- `compoundFieldUtils.ts` -- address/name formatting, field extraction
- `fileUtils.ts` -- S3 key sanitization, filename generation
- `reportTypeMapping.ts` -- report type validation
- `voterImport.ts` -- import job schema
- `searchQueryFieldValidators.ts` -- query validation
- `searchQueryFieldGuards.ts` -- type guards
- Most of `schemas/report.ts` -- the full discriminated union beyond date ranges

**Recommendation:** These are pure functions with no side effects -- ideal test targets. Start with `compoundFieldUtils` (address formatting is user-visible) and `fileUtils` (S3 key sanitization is security-adjacent).

### P2 -- Medium Priority Gaps

#### Frontend Pages -- No Tests

No `page.tsx` file has tests. Server Component data fetching, Prisma queries, and privilege gating in pages are all untested.

**Priority pages for testing:**
1. `/committees/page.tsx` -- server-side PII gating (admin vs non-admin query)
2. `/admin/data/page.tsx` -- admin-only access
3. `/recordsearch/page.tsx` -- dropdown data fetching

#### Frontend Components -- Significant Gaps

| Component | Type | Risk |
|---|---|---|
| `CommitteeSelector` | Interactive | Committee management core UI |
| `AddCommitteeForm` | Interactive | Privilege-gated behavior |
| `CommitteeRequestForm` | Interactive | Request creation |
| `ReportCard` | Interactive | Edit/delete/download |
| `ReportsList` | Interactive | Pagination, data fetching |
| `PendingJobsIndicator` | Polling | Polling lifecycle |
| `GeneratePetitionForm` | Complex form | Multi-step form, validation |
| `VoterListReportForm` | Complex form | Context integration, preview |
| `XLSXConfigForm` | Complex form | Column configuration |
| All admin components | Interactive | CRUD operations |

#### Auth Flow -- No Tests

The `signIn` callback, `createUser` event, privilege sync logic, and invite flow in `src/auth.ts` are completely untested. This is where:
- Privilege escalation/downgrade logic lives
- Invite validation and consumption happens
- The TOCTOU race condition exists

### P3 -- Nice to Have

#### Context Providers -- No Tests

`GlobalContext` (acting permissions, localStorage sync) and `VoterSearchContext` (cross-page search state) have no tests.

#### Hooks -- Partial Coverage

- `useApiMutation` -- untested (core data fetching hook used everywhere)
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

### Weaknesses

- No integration tests that verify auth + route handler together
- No E2E test framework (Playwright, Cypress) for user flows
- No test database setup for data layer tests
- No snapshot tests for report rendering components
- No test for `useApiMutation` despite it being the universal data fetching pattern
- `VoterListReportForm.test.ts` only tests a utility function inside the component file, not the component itself

---

## Recommendations

### Immediate Actions
1. **Add auth assertion tests to existing API route tests** -- verify 401/403 responses
2. **Add Jest config to report-server** -- even a basic setup enables incremental coverage
3. **Test `voter-import-processor` core functions** -- `transformVoterRecord`, `convertStringToDateTime`, `isRecordNewer`

### Near-Term
4. **Test `webhookUtils` HMAC signing** -- verify signature format and correctness
5. **Test `compoundFieldUtils`** -- address/name formatting affects user-visible reports
6. **Test `xlsxGenerator` column headers** -- catches the known `stateAssmblyDistrict` typo
7. **Test admin API routes** -- at minimum, verify auth is required

### Strategic
8. **Add Playwright E2E tests** for critical user flows (search, add to committee, generate report)
9. **Set up a test database** (Docker) for voter-import-processor integration tests
10. **Add snapshot tests** for report-server React components (CommitteeReport, DesignatingPetition)

---

## Summary

| Area | Coverage | Priority to Fix |
|---|---|---|
| Search UI components | Strong | -- |
| Search API route | Good | -- |
| Committee API routes (3 of 4) | Good | -- |
| Auth/privilege enforcement | None | P0 |
| Admin API routes | None | P0 |
| voter-import-processor | None | P0 |
| Report-server (all) | None | P1 |
| Shared validators | Partial | P1 |
| Frontend pages | None | P2 |
| Frontend admin components | None | P2 |
| Auth flow (auth.ts) | None | P2 |
| Hooks | Minimal | P3 |
| Context providers | None | P3 |
