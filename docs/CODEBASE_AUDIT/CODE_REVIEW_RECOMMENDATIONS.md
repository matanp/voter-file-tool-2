# Code Review & Recommendations

## Executive Summary

Overall, the codebase demonstrates strong TypeScript practices, good separation of concerns via the monorepo package structure, and a well-designed search system. The main areas for improvement are: inconsistent patterns across the codebase, missing abstraction layers, in-memory job queue fragility, and dead code accumulation. This document focuses on code quality, maintainability, and extensibility -- security findings are in `SECURITY_AUDIT.md`.

---

## Architecture Assessment

### Strengths

1. **Monorepo package design is solid.** The `shared-prisma` > `shared-validators` > `voter-import-processor` dependency chain is clean. Types flow from the Prisma schema to validators to business logic without duplication of the source of truth.

2. **Server/Client component split is correct.** Pages are Server Components that fetch data directly from Prisma, passing props to Client Components for interaction. PII gating happens server-side (e.g., committees page only includes `committeeMemberList` for admin users in the Prisma query).

3. **Search system is well-engineered.** Discriminated union types for search fields, compound field support, normalization pipeline, shared Prisma query builder -- this is the most mature and well-tested part of the codebase.

4. **Shared Zod validation at API boundaries.** The `shared-validators` package defines schemas used by both frontend and report-server, ensuring type consistency across the wire.

5. **Webhook signing for report callbacks.** HMAC SHA-256 with timing-safe comparison on the receiving end is correctly implemented.

### Weaknesses

1. **No middleware layer.** All auth/authz is enforced per-route. This is the root cause of the unauthenticated admin routes -- there's no safety net.

2. **In-memory job queue.** The report-server uses `async.queue` with no persistence. Jobs are lost on crash/restart. No retry logic, no dead-letter queue, no queue size limit.

3. **~~Two different auth patterns in the frontend.~~** **Resolved.** API auth is now unified: every route (except NextAuth internals) is wrapped by one of `withPrivilege`, `withBackendCheck`, or `withPublic`. See Finding #2.

4. **Report-server runs interpreted TypeScript.** `ts-node` in production means slower startup, no build-time type checking during deploy, and the `outDir: ./dist` in tsconfig is misleading (never used).

---

## Findings & Recommendations

### P0 -- Critical

#### 1. In-Memory Job Queue Has No Persistence or Retry

The report-server's `async.queue` stores all jobs in memory. If PM2 restarts the process (crash, memory limit hit at 1GB, deployment), all queued and in-progress jobs are silently lost. The frontend shows these jobs as "PROCESSING" forever with no recovery mechanism.

**Current behavior:**

- Queue concurrency: 2 (two simultaneous Puppeteer/Chrome instances)
- No retry on failure -- failed jobs send a webhook and are discarded
- No queue size limit -- unbounded memory growth if jobs arrive faster than processed
- No dead-letter queue
- Frontend creates DB `Report` record with `PENDING` status, but if the job is lost after being marked `PROCESSING`, no mechanism updates it to `FAILED`

**Recommendation:** Replace `async.queue` with a persistent job queue. Options by increasing complexity:

- **Database polling** (simplest) -- report-server polls the existing `Report` table for `PENDING` jobs
- **pg-boss** (PostgreSQL-backed, already have Postgres) -- least new infrastructure
- **BullMQ** (Redis-backed) -- industry standard but requires Redis

At minimum, add a stale job cleanup: a startup check or periodic sweep that marks `PROCESSING` reports older than X minutes as `FAILED`.

#### 2. Unify Auth Pattern: `withPrivilege` vs Raw `auth()` — **RESOLVED**

**Status:** Implemented. Every API route is now wrapped by exactly one of:

- **withPrivilege** — session + optional privilege level (`PrivilegeLevel` or `"Authenticated"`). Used for all user-facing and admin routes.
- **withBackendCheck** — custom verifier (e.g. webhook HMAC). Used for `reportComplete`.
- **withPublic** — intentionally unauthenticated. Used for `auth/invite/[token]`.

**Only exclusion:** NextAuth internals (`auth/[...nextauth]`). No other routes remain unwrapped.

**Recommendation (remaining):** Add Next.js middleware as a defense-in-depth layer (unchanged).

### P1 -- High

#### 3. Data Fetching Inconsistency on the Frontend

Three different data fetching patterns are used in Client Components:

| Pattern                 | Where Used                                                      | Characteristics                                                   |
| ----------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| `useApiMutation` hook   | Most components                                                 | AbortController timeout (10s default), error state, loading state |
| Raw `fetch`             | CommitteeSelector, InviteManagement, SpecialReports, some admin | No timeout, manual error handling, inconsistent error display     |
| Server Component Prisma | page.tsx files                                                  | Direct DB access, no API round-trip (correct pattern)             |

The raw `fetch` usage creates code that handles errors differently, has no timeout protection, and doesn't follow the established hook's loading/error state pattern.

**Recommendation:** Migrate all raw `fetch` calls to `useApiMutation`. If `useApiMutation` doesn't support a use case (e.g., file upload with progress tracking in SpecialReports), extend it with an `onProgress` option rather than bypassing it.

#### 4. `useApiMutation` Options Dependency Causes Unnecessary Re-renders — **RESOLVED**

**Status:** Fixed. `useApiMutation` now stores `options` in a ref (`optionsRef.current`) and reads from it inside the `mutate` callback, so `mutate` has stable identity. The `mutateRef` workaround is no longer needed in consuming components.

#### 5. Report-Server Should Compile TypeScript for Production

The report-server runs `node -r ts-node/register src/index.ts` in production. This means:

- Slower cold start (TypeScript compilation happens at startup)
- `prestart` rebuilds ALL shared packages on every PM2 restart (30-60s+ downtime per crash recovery)
- Type errors are not caught during deployment (no `tsc` build step)
- The `outDir: ./dist` config in tsconfig is unused and misleading

**Recommendation:** Add a build step: compile with `tsc` to `dist/`, then run `node dist/index.js` in production. Move shared package rebuilds to deploy-time only (the `deploy-lightsail.sh` script), not `prestart`.

#### 6. Dead Code Accumulation

Multiple areas of commented-out code that create confusion about what's active:

| Location                   | Dead Code                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `fieldsConfig.tsx`         | ~10 commented-out field configs (VRCNUM, firstName, lastName, etc.)                                    |
| `searchFields.ts`          | Commented-out search field definitions                                                                 |
| `layout.tsx`               | ThemeProvider import and usage commented out                                                           |
| `page.tsx` (home)          | KeyCapabilities component commented out                                                                |
| `compoundFieldUtils.ts`    | `halfAddress` and two alternative address formatters commented out                                     |
| `utils.ts` (report-server) | `sleep` function defined but only used in commented-out debug blocks, `randomUUID` imported but unused |
| `absenteeDataUtils.ts`     | `getWardTownSummary` exported but never imported anywhere                                              |
| Frontend `.env`            | Shell script fragments in comments                                                                     |

**Recommendation:** Remove all commented-out code. Use git history for recovery if needed. Commented-out code creates confusion about what is active and what is legacy.

#### 7. `PendingJobsIndicator` Polls Unconditionally

Polls `/api/reportJobs?status=PENDING,PROCESSING` every 15 seconds via `setInterval`, regardless of whether there are any pending jobs. This creates unnecessary API load and database queries.

**Recommendation:** Options (increasing sophistication):

1. Stop polling when `jobs.length === 0`; resume on user action
2. Use exponential backoff (15s -> 30s -> 60s when idle)
3. Use the existing Ably realtime infrastructure for job status push updates instead of polling (the infrastructure already exists for individual report status)

### P2 -- Medium

#### 8. Duplicated Utility Functions

| Function                  | Location 1                 | Location 2                     | Notes                                            |
| ------------------------- | -------------------------- | ------------------------------ | ------------------------------------------------ |
| `getPrivilegeColor`       | `InviteManagement.tsx`     | `auth/invite/[token]/page.tsx` | Exact same badge coloring logic                  |
| `convertStringToDateTime` | `voter-import-processor`   | `api/lib/utils.ts`             | Same date parsing logic                          |
| `exampleVoterRecord`      | `voter-import-processor`   | `api/lib/utils.ts`             | Same CSV field template object                   |
| `isRecordNewer`           | `voter-import-processor`   | `api/lib/utils.ts`             | Same comparison logic                            |
| Window resize detection   | `GeneratePetitionForm.tsx` | `useWindowSize` hook           | Form reimplements what the hook already provides |

**Recommendation:** Extract shared code to single locations:

- `getPrivilegeColor` -> `lib/utils.ts`
- Import voter import utilities from the `voter-import-processor` package instead of reimplementing in `api/lib/utils.ts`
- Use `useWindowSize` hook in `GeneratePetitionForm`

#### 9. Admin Auth Check Inconsistency in Pages

Two patterns for server-side admin gating in pages:

**Pattern A -- `<AuthCheck>` component** (provides loading state, sign-in prompt, permission error):
Used by: `admin/dashboard`, `admin/data`, `voter-list-reports`

**Pattern B -- Manual check** (bare "Not authorized" div, no loading state):
Used by: `committee-reports`, `committees/requests`

**Recommendation:** Use `<AuthCheck>` consistently. It provides better UX and is more discoverable.

#### 10. `CommitteeRequest.committeList` Typo in Schema

The Prisma schema has a typo: `committeList` (missing one 't') in the `CommitteeRequest` model relation field. This is baked into the database column name and propagates through all code that references it.

**Recommendation:** Create a Prisma migration to rename the column. Not urgent but worth fixing before the SRS implementation adds more references to this field: `ALTER TABLE "CommitteeRequest" RENAME COLUMN "committeListId" TO "committeeListId"`.

#### 11. `xlsxGenerator.ts` Column Header Typo

`DEFAULT_COLUMN_HEADERS` has key `stateAssmblyDistrict` (missing 'e'), but `DEFAULT_COLUMN_ORDER` has `stateAssemblyDistrict` (correctly spelled). The header lookup `columnHeaders[field] || field` falls back to the raw field name for that column instead of showing "State Assembly District".

**Recommendation:** Fix the typo in `DEFAULT_COLUMN_HEADERS`.

#### 12. `electionDistrict` Type Inconsistency Across Layers

- `VoterRecord.electionDistrict`: `Int?` in Prisma
- `DropdownLists.electionDistrict`: `String[]` in Prisma
- Dropdown processor stores raw string value from CSV (no numeric conversion)
- Search queries from dropdown values would be strings but the DB column is integer

This means filtering by `electionDistrict` from a dropdown value requires implicit type coercion that may not happen correctly.

**Recommendation:** Store `electionDistrict` dropdown values as integers (matching the Prisma model), or explicitly convert in the search query builder.

#### 13. `voterImportReportSchema` Duplicates `voterImportJobDataSchema`

Both schemas define `fileKey`, `fileName`, `year`, `recordEntryNumber` with identical constraints. The report schema redeclares these fields inline rather than composing the existing schema.

**Recommendation:** Use `voterImportJobDataSchema.extend({ type: z.literal('voterImport'), format: z.literal('txt') })` in the report schema definition.

#### 14. Module-Level Mutable State in `dropdownListProcessor`

The `dropdownLists` Map is module-level singleton state. `clearDropdownLists()` is called at the start of each import, but if two imports run concurrently (queue concurrency is 2), they corrupt each other's state.

**Recommendation:** Pass the Map instance as a parameter, or use a class instance pattern. Alternatively, reduce queue concurrency to 1 for voter imports specifically.

#### 15. Hardcoded Monroe County Data in Report-Server

- `CommitteeReport.tsx`: `"Monroe County Democratic Committee List as of May 15, 2025"` -- hardcoded org name and stale date
- `absenteeDataUtils.ts`: `WARD_TO_TOWN_MAPPING` with 22 hardcoded ward-to-town entries
- Both are specific to Monroe County and will break if the tool is used by other organizations or if ward assignments change

**Recommendation:** Make the committee report title a prop or database-driven configuration. Move ward-to-town mapping to a config file or database table.

#### 16. `fetchCommitteeList` -- Unused Multi-Value Handling

The route handler validates multiple `legDistrict` query params in a loop but only uses `legDistrictValues[0]`. The extra validation serves no purpose and adds confusion.

**Recommendation:** Remove the loop. Accept a single `legDistrict` param.

### P3 -- Low

#### 17. `ElectionDates` Component Double-Fetches

Server Component provides initial election dates as props, but the Client Component re-fetches the same data from the API on mount via `useEffect`. The re-fetch is redundant.

**Recommendation:** Use the server-provided data directly. Only re-fetch after create/delete mutations.

#### 18. No Unified Error Handling Strategy

Error handling varies across the codebase with no documented standard:

- `ErrorDisplay` component for form validation (VoterListReportForm, XLSXConfigForm)
- Toast notifications for action feedback (ReportsList)
- Console-only logging (errors invisible to users) in some admin components
- Sentry capture in error boundaries
- Some errors swallowed entirely

**Recommendation:** Define a standard: toasts for mutation feedback, inline `ErrorDisplay` for form validation, Sentry for unexpected errors. Document the pattern in CLAUDE.md.

#### 19. `Invite.createdBy` Has No Foreign Key

The `createdBy` field on `Invite` is a plain `String`, not a relation to `User.id`. If a user is deleted, their invite records have dangling `createdBy` values with no referential integrity enforcement.

**Recommendation:** Add a foreign key relation to `User`, or document the intentional design choice (e.g., "invites should survive user deletion").

#### 20. `halfAddress` Commented Out with Alternatives

`compoundFieldUtils.ts` has `halfAddress` commented out of the address string builder, plus two alternative address formatting implementations. This suggests the address format was recently changed and old approaches were left in.

**Recommendation:** Decide on the address format. Remove the alternatives. If `halfAddress` is not used, remove the commented-out lines.

#### 21. `Report.generatedById` Has No Explicit Cascade Rule

The `Report` model references `User` via `generatedById` but has no `onDelete` specified. Prisma defaults to `Restrict`, meaning a User cannot be deleted if they have associated Reports. This may be intentional (reports should survive user deletion) but the intent is implicit.

**Recommendation:** Add explicit `onDelete: Restrict` (to document intent) or `onDelete: SetNull` with `generatedById` made optional (to allow user deletion).

#### 22. Create vs Update Inconsistency in `bulkSaveDropdownLists`

The `create` path sorts dropdown arrays (city, zipCode, street, etc.); the `update` path does not. First-time creation produces sorted dropdown lists; subsequent imports lose sort order.

**Recommendation:** Sort in both create and update paths for consistency.

#### 23. `convertStringToDateTime` Uses Local Timezone

`new Date(yyyy, mm-1, dd)` creates a date in the server's local timezone. All other date handling in the codebase uses UTC ISO strings. If the server is not configured for UTC, dates imported from voter files could be off by one day.

**Recommendation:** Use `new Date(Date.UTC(yyyy, mm-1, dd))` for consistent UTC handling.

---

## Extensibility Assessment

### Ready for Extension

- **New search fields:** Add to `SEARCH_FIELDS` array, `FIELD_CONFIG`, searchable field enum, and field renderer. The discriminated union handles new types cleanly.
- **New report types:** Add a variant to `generateReportSchema` discriminated union, add a processor in report-server, add a frontend form. The pattern is well-established.
- **New shared validators:** The package structure supports adding new schemas with full type flow.
- **New privilege levels:** The ordered array in `hasPermissionFor` makes adding a level between existing ones straightforward.

### Would Require Refactoring to Extend

- **Multi-organization support:** Monroe County is hardcoded in ward mappings, committee report title, and committee structure assumptions. Supporting another county/party org would require parameterizing these values.
- **Alternative auth providers:** NextAuth is configured with Google only. Adding email/password or another OAuth provider is straightforward via NextAuth, but the invite flow is tightly coupled to email-based Google accounts.
- **Horizontal scaling of report-server:** The in-memory queue, module-level mutable state, and PM2 single-instance mode all prevent running multiple server instances. A persistent queue is prerequisite.
- **Alternative storage backends:** R2/S3 is accessed directly in multiple files across both apps without a shared abstraction layer. Switching to a different storage provider would require changes in 4+ files.

---

## Summary

| Priority | Count | Key Themes                                                                 |
| -------- | ----- | -------------------------------------------------------------------------- |
| P0       | 2     | In-memory queue fragility, inconsistent auth patterns                      |
| P1       | 5     | Data fetching inconsistency, dead code, production TypeScript, performance |
| P2       | 9     | Duplicated code, type inconsistencies, hardcoded data, schema issues       |
| P3       | 7     | Error handling strategy, minor schema issues, timezone handling            |

**Top 5 most impactful improvements for maintainability:**

1. Add Next.js middleware (prevents future auth omissions)
2. Replace in-memory queue with persistent queue (prevents job loss)
3. Unify data fetching to `useApiMutation` (reduces cognitive overhead for new devs)
4. Remove dead code (reduces confusion about what's active)
5. Compile TypeScript for production (faster restarts, build-time type safety)
