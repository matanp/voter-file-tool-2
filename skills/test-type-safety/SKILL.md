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
- `@ts-ignore`

If one is truly needed, keep it local to a runtime-boundary or invalid-input test and add a short reason.

`@ts-expect-error` is different: it is forbidden as a silencing hatch, but **encouraged** as a deliberate negative type assertion — asserting that an invalid payload is rejected by a type or schema. Prefer it over forcing an invalid value through `as never` / `as unknown as T`. Add a trailing comment naming what is expected to fail:

```ts
// @ts-expect-error missing required `scope` — schema must reject this
generateReportSchema.parse({ type: "voterList" });
```

## Before writing the test

1. Look for an existing nearby test pattern.
2. Tests live per-package. For frontend tests, prefer shared helpers in `apps/frontend/src/__tests__/utils/testUtils.ts` and `mocks.ts`. Report-payload and cross-package type/union contracts belong in `packages/shared-validators/src/__tests__/`, next to the schemas they exercise.
3. For auth, authorization, role-gated UI, reports, uploads, invites, committee membership, or audit logs, also follow the relevant repo guidance in `AGENTS.md` and the skills linked from `CLAUDE.md`.

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

For report payloads, make sure `GenerateReportData`, `EnrichedReportData`, scoped report registry keys, and worker branches remain discriminated.

## Type-level assertions

When a discriminated-union branch could silently collapse to `never` (e.g. a hand-maintained variant list drifting out of sync, or a generic wrapper widening a merged shape), guard it at compile time instead of trusting runtime coverage.

Canonical exemplars to copy:

- **In-source exhaustiveness guard** — `packages/shared-validators/src/schemas/report.ts` (`_EnrichedCoversGenerate` / `_assertEnrichedExhaustive`). Proves the hand-maintained enriched-variant list stays in sync with `generateReportVariants`, failing compilation with a readable error string if a variant is dropped.
- **Type-contract test** — `packages/shared-validators/src/__tests__/schemas/reportTypes.test.ts`. Asserts specific union branches survive as non-`never`.

The test pattern:

```ts
type AssertNotNever<T> = T extends never ? never : true;

type _VoterImportJob = AssertNotNever<
  Extract<EnrichedReportData, { type: "voterImport" }>
>;

// The real check is this assignment: if a slot's type is `never`, the `true`
// literal is no longer assignable and compilation fails. Do NOT flatten this
// into a plain `const x = true` — that erases the error surface.
const _typeChecks: [_VoterImportJob /* , ... */] = [true];

describe("EnrichedReportData type exports", () => {
  it("preserves discriminated union branches at compile time", () => {
    // Runtime assertion is a token: it only makes Jest count the file. The
    // contract is enforced by the type assignment above, gated by `tsc --noEmit`.
    expect(_typeChecks).toEqual([true]);
  });
});
```

These files are validated by `tsc --noEmit` on the package (see Verification), not by running Jest — the runtime `expect` exists only so the file registers as a test.

## Verification

Run the smallest relevant command:

- shared validators: `pnpm --filter @voter-file-tool/shared-validators run build`
- voter import processor: `pnpm --filter @voter-file-tool/voter-import-processor run build`
- frontend tests/type contracts: `pnpm --filter voter-file-tool exec tsc --noEmit --pretty false`
- report-server type contracts: `pnpm --filter node-pdf-generation exec tsc --noEmit --pretty false`
- full tests when behavior changed: `pnpm test`

If a command is already blocked by unrelated current-branch errors, record the exact blocker in the final response.
