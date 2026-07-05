# Test Type Safety Review

Date: 2026-07-05

## Executive Summary

Current test type-safety practice is solid in intent but inconsistent in execution.

Overall rating: **6.5 / 10**

- **TypeScript configuration:** 8 / 10. The repo uses `strict`, frontend enables `noUncheckedIndexedAccess`, and package builds include tests where tests live under `src`.
- **Test helper design:** 7 / 10. Shared helpers for auth, requests, response assertions, fixtures, and Prisma mock accessors are useful and worth continuing.
- **Mock and fixture type safety:** 5 / 10. Many tests bypass delegate return types with `as never`, `as unknown as`, and `as jest.Mock`.
- **Consistency:** 5.5 / 10. Shared validators and some report/form tests are strongly typed; API route tests vary widely file to file.
- **Balanced engineering:** 6.5 / 10. The repo mostly avoids `any` and `@ts-ignore`, which is good. The next step is not extreme typing everywhere; it is isolating unsafety into named helpers and using runtime schemas at external boundaries.

The main recommendation is to adopt a moderate rule: **test code may use casts at framework boundaries, but domain fixtures, route payloads, and schema-derived unions should be typed by construction.**

## Review Scope

I reviewed current-branch tests under:

- `apps/frontend/src/__tests__`
- `apps/frontend/src/app/**/__tests__`
- `apps/report-server/src/__tests__`
- `packages/shared-validators/src/__tests__`
- `packages/voter-import-processor/src/__tests__`

I also checked TypeScript/Jest configuration and shared test utilities.

Observed counts across 104 test files:

- `as never`: 168 occurrences
- `as unknown as`: 76 occurrences
- `jest.Mock` / `MockedFunction`-style casts/usages: 162 occurrences
- `@ts-ignore` / `@ts-expect-error`: 0 occurrences
- direct `any` patterns in tests: 2 occurrences
- `satisfies` in tests: 0 occurrences

These counts are not automatically bad, but they show where consistency work should focus.

## What Is Working Well

Strict TypeScript is enabled at the base config, and frontend tests are included by `apps/frontend/tsconfig.json`.

The shared validators package has strong schema-centered tests. Files like `packages/shared-validators/src/__tests__/schemas/report.test.ts` and `scopeReportRegistry.test.ts` validate runtime contracts where type checking alone is not enough.

The frontend test utilities are valuable:

- `createMockSession`
- `createMockRequest`
- `createAuthTestSuite`
- `parseJsonResponse`
- Prisma mock accessors like `getMembershipMock`
- matcher wrappers like `expectAuditLogCreate`

`ScopedReportForm.test.tsx` is a good pattern: it parameterizes over `SCOPE_REPORT_TYPES`, so new scoped report types naturally get form coverage.

The repo almost never uses raw `any` and does not suppress TypeScript errors with `@ts-ignore`. That is a strong foundation.

## Current Gaps

### 1. Jest Is Not A Sufficient Type Gate

`pnpm test` runs Jest through `scripts/run-tests.ts`; it does not run a dedicated typecheck. Frontend Jest through `next/jest` is especially likely to transpile without enforcing the full project type graph.

I ran:

```bash
pnpm --filter voter-file-tool exec tsc --noEmit --pretty false
```

It failed before test-specific diagnostics because `.next/types` rejects a non-route export from `apps/frontend/src/app/api/admin/audit/route.ts` (`buildAuditWhere`). That should be fixed so frontend tests can be typechecked cleanly.

I also ran:

```bash
pnpm --filter @voter-file-tool/shared-validators run build
pnpm --filter @voter-file-tool/voter-import-processor run build
pnpm --filter node-pdf-generation exec tsc --noEmit --pretty false
```

Shared validators and voter-import compile cleanly. Report-server currently fails typecheck in source and `jobOrchestration.test.ts`; `Extract<EnrichedReportData, { type: 'voterImport' }>` and related branches narrow to `never`. This appears connected to the generated declaration for `enrichedReportDataSchema`, where the schema is cast through `unknown` to `EnrichedDiscriminatedOptions`. The source schema exists, but the package-exported type shape does not preserve enough discrimination for consumers.

Recommendation: add a normal CI/local gate that runs package builds plus frontend `tsc --noEmit`, after fixing the current blockers.

### 2. Prisma Mock Returns Often Bypass Type Checking

The dominant pattern in API tests is:

```ts
prismaMock.report.create.mockResolvedValue({ id: MOCK_REPORT_ID } as never);
```

This keeps tests moving, but it removes the compiler from the exact place where schema drift matters most. Top offenders include report routes, `generateReport`, committee request flows, discrepancy handling, bulk loads, and weighted imports.

Recommendation: keep partial mock returns allowed, but route them through named helpers:

- `mockResolvedPrisma(modelCall, value)` for intentionally partial delegate results
- factory functions that return route-specific selected shapes
- `satisfies` for complete fixtures and selected result shapes

Do not require every test fixture to satisfy a full Prisma model when the production query selects only a subset. That becomes ceremony. Prefer named selected-shape types.

### 3. Broad Mock Casts Are Repeated Instead Of Centralized

There are many scattered patterns like:

```ts
global.fetch = fetchMock as unknown as typeof fetch;
const readWorkbookMock = xlsx.read as jest.Mock;
```

Some of this is normal at framework boundaries. The issue is repetition and inconsistent quality.

Recommendation: centralize in test utilities:

- `mockGlobalFetch(handlerOrResponses)`
- `asMockedFunction(fn)`
- `createFormDataNextRequest(file)`
- typed xlsx helpers for `read` and `sheet_to_json`

The balanced rule: casts at the boundary are fine, but they should live in one helper with a clear name.

### 4. Invalid Payload Tests Sometimes Lie To Domain Types

Examples include intentionally wrong values cast into valid types:

```ts
"1" as unknown as number
undefined as unknown as string
```

This is appropriate when testing runtime validation, but it should be deliberate and local to request/schema boundary tests.

Recommendation: for invalid input, type the object as `unknown` or `Record<string, unknown>` and pass it through the public boundary (`createMockRequest`, schema `safeParse`, route handler). Avoid making invalid data pretend to be a valid domain type.

### 5. Response Parsing Is Often Assertion-Only

`parseJsonResponse<T>()` is convenient but is a type assertion, not validation. For many unit tests, that is acceptable. For public API response contracts, especially auth/report/upload/invite/audit routes, we should prefer Zod-backed response parsing.

Recommendation:

- Keep `parseJsonResponse<T>()` for lightweight tests.
- Add `parseJsonResponseWithSchema(response, schema)` for API contract tests.
- Use schema parsing for route responses that are consumed across package/app boundaries.

### 6. Schema-Derived Union Types Need Stronger Export Tests

The report-server typecheck failure shows a high-value gap: package source can compile while downstream consumers see a degraded exported union.

Recommendation: add type tests or compile tests for exported unions:

- `Extract<EnrichedReportData, { type: 'voterImport' }>` is not `never`
- every report-server handled `jobData.type` branch has a non-never variant
- scoped report registry, schema variants, and worker payload types stay aligned

This is more useful than adding many narrow casts in report-server tests.

## Recommendations

### Short Term

1. Fix the frontend typecheck blocker by moving non-route exports out of `app/api/**/route.ts` files or otherwise satisfying Next's route export constraints.
2. Fix `EnrichedReportData` declaration preservation so report-server can compile without `never` branches.
3. Add `pnpm run typecheck` at the workspace root. It should run package builds and frontend `tsc --noEmit`.
4. Add `parseJsonResponseWithSchema` to frontend test utilities.
5. Add a small helper for global `fetch` mocks and use it in new tests.

### Medium Term

1. Replace high-frequency `as never` clusters with typed fixture helpers, starting with:
   - `apps/frontend/src/__tests__/api/reports/[id].test.ts`
   - `apps/frontend/src/__tests__/api/generateReport.test.ts`
   - `apps/frontend/src/__tests__/api/admin/handleCommitteeDiscrepancy*.test.ts`
   - `apps/frontend/src/__tests__/api/committee/requestAdd.test.ts`
2. Introduce route-specific response schemas for public API contracts where shared validators do not already provide one.
3. Use `satisfies` in new tests for full fixtures and expected payloads.
4. Add type-level tests for registry/schema/worker discriminated unions.

### Do Not Over-Engineer

Avoid requiring every mock object to be a complete Prisma model. Many tests only need selected shapes. Type those selected shapes instead.

Avoid generic type gymnastics inside individual test files. If a type helper is hard to read, hide it in `testUtils.ts` or do not use it.

Avoid replacing all casts mechanically. Prioritize casts that can hide schema, auth, report, upload, invite, committee membership, or audit-log regressions.

## Proposed Agent Skill

I added `skills/test-type-safety/SKILL.md`.

Recommended AGENTS.md trigger:

```md
Before adding or materially changing tests, read [skills/test-type-safety/SKILL.md](skills/test-type-safety/SKILL.md).
```

The skill tells future agents to:

- use existing typed helpers first
- keep invalid inputs at runtime boundaries
- centralize unavoidable framework casts
- prefer Zod parsing for public API responses
- avoid casual `as never`, `as unknown as`, and `as jest.Mock`
- run the relevant typecheck/build command when test type contracts change

## Target State

The goal is not maximal type purity. The goal is that a schema or route contract change should break test code in useful places, not be hidden behind casts.

Target rating after the short-term work: **8 / 10**.

At that point, remaining unsafety should mostly be in well-named helpers at framework boundaries, with domain-specific fixtures and API contracts typed or schema-validated by default.
