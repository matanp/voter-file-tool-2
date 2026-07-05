---
name: test-type-safety
description: Use before adding, changing, or reviewing tests in voter-file-tool to keep TypeScript test code type-safe without over-engineering. Applies to Jest tests, Prisma mocks, route payloads, response assertions, report payload unions, auth/report/upload/invite/audit/committee tests, and shared test utilities.
---

# Test Type Safety

Use this skill before adding or materially changing tests.

## Default posture

Prefer type safety that catches real contract drift. Do not make test fixtures painfully complete just to satisfy full Prisma models when production code selects only a subset.

Allowed escape hatch: casts at framework boundaries (`fetch`, `NextRequest`, `FormData`, xlsx mocks, Jest matchers) are acceptable when centralized in a helper with a clear name.

Avoid casual call-site casts:

- `as never`
- `as unknown as SomeDomainType`
- `as jest.Mock`
- raw `any`
- `@ts-ignore` / `@ts-expect-error`

If one is truly needed, keep it local to a runtime-boundary or invalid-input test and add a short reason.

## Before writing the test

1. Look for an existing nearby test pattern.
2. Prefer shared helpers in `apps/frontend/src/__tests__/utils/testUtils.ts` and `mocks.ts`.
3. For auth, authorization, role-gated UI, reports, uploads, invites, committee membership, or audit logs, also follow the relevant repo guidance in `AGENTS.md`.

## Fixtures

Use complete typed fixtures only when the code under test consumes a complete type.

For Prisma queries that return selected or included shapes, define a small named selected-shape type or factory. Prefer:

```ts
const report = {
  id: "report-1",
  generatedById: "user-1",
} satisfies ReportOwnershipRow;
```

over:

```ts
prismaMock.report.findFirst.mockResolvedValue({ id: "report-1" } as never);
```

For schema/request validation tests, keep invalid values typed as `unknown` or `Record<string, unknown>` and pass them through the public boundary. Do not force invalid values into valid domain types unless the test is explicitly exercising defensive runtime behavior.

## Mocks

Use `jest.mocked(fn)` or shared typed wrappers for mocked functions.

Centralize unavoidable casts for:

- global `fetch`
- `NextRequest` with custom `json()` or `formData()`
- `xlsx.read` and `xlsx.utils.sheet_to_json`
- Prisma delegate gaps in generated mocks
- Jest asymmetric matchers used inside Prisma JSON inputs

If a test file repeats the same cast three or more times, create or extend a helper.

## Responses and schemas

For low-risk unit tests, `parseJsonResponse<T>()` is acceptable.

For public API contracts, shared package boundaries, report payloads, auth/upload/invite/audit routes, and generated worker payloads, prefer a Zod schema parse in the assertion path.

For report payloads, make sure `GenerateReportData`, `EnrichedReportData`, scoped report registry keys, and worker branches remain discriminated. Add type-level assertions when a branch could accidentally become `never`.

## Verification

Run the smallest relevant command:

- shared validators: `pnpm --filter @voter-file-tool/shared-validators run build`
- voter import processor: `pnpm --filter @voter-file-tool/voter-import-processor run build`
- frontend tests/type contracts: `pnpm --filter voter-file-tool exec tsc --noEmit --pretty false`
- report-server type contracts: `pnpm --filter node-pdf-generation exec tsc --noEmit --pretty false`
- full tests when behavior changed: `pnpm test`

If a command is already blocked by unrelated current-branch errors, record the exact blocker in the final response.
