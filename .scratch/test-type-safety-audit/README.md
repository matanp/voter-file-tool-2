# Test type-safety audit and enforcement

Audit date: 2026-11-02

Status: proposed

## Goal

Make test type-safety rules enforceable rather than advisory. Tests should catch contract drift at
compile time without forcing every narrow Prisma result into a complete database model.

This project covers two related problems:

1. Existing tests frequently erase types with casts and untyped mocks.
2. Agent guidance describes the desired behavior, but the repository does not mechanically reject
   violations.

No production or test behavior was changed during this audit.

## Executive summary

The repository's `skills/test-type-safety/SKILL.md` has the right general posture, but adherence is
low in several high-risk areas. CI runs Jest without a test-inclusive TypeScript check, so contract
drift can merge while the test suite remains green.

The clearest example is the current Prisma model drift. Test-inclusive typechecks catch membership
fixtures that are missing `exitReportedAt`, `exitReportedById`, and `exitReportedKind`, while the
normal Jest-only workflow does not make this a required gate.

The recommended strategy is:

1. Restore a green typecheck baseline.
2. Add a test-inclusive typecheck to CI.
3. Reject new escape-hatch debt using a checked-in baseline.
4. Migrate the most contract-sensitive tests first.
5. Tighten the agent pointer and skill around checkable completion criteria.

## Scope and method

The audit covered 158 `*.test.*` and `*.spec.*` files across:

- `apps/frontend`
- `apps/report-server`
- `packages/shared-validators`
- `packages/voter-import-processor`

It included lexical scans for the prohibited patterns named in the skill, inspection of shared test
helpers and CI configuration, and test-inclusive TypeScript checks for each package.

Counts below are lexical. A count identifies review work, not necessarily a defect: some double
assertions are legitimate framework boundaries. The important distinction is whether the cast is
centralized and named, or whether it erases a domain contract at a call site.

## Findings

### Escape-hatch inventory

| Pattern | Occurrences | Test files | Assessment |
| --- | ---: | ---: | --- |
| `as never` | 159 | 24 | Mostly domain or Prisma result shapes; high-priority debt |
| `as unknown as` | 116 | 47 | Mixed boundary and domain casts; requires classification |
| `as jest.Mock` | 47 | 22 | Usually erases callable and Prisma delegate contracts |
| `getXxxMock(prismaMock)` | 506 | 26 | Methods are raw `jest.Mock`; generated Prisma types are lost |
| Raw `as any` | 2 | 1 | Direct violation |
| `@ts-ignore` | 0 | 0 | Good |
| `@ts-expect-error` | 0 | 0 | No current misuse, but the skill's example is incorrect |

Positive patterns also exist:

- 587 direct `prismaMock.<model>.<method>` call sites
- 48 `jest.mocked()` call sites
- 11 `satisfies` expressions in tests
- centralized helpers for fetch, response-schema parsing, raw SQL, and Jest matchers

### Highest concentrations

- `apps/frontend/src/__tests__/api/generateReport.test.ts`: 26 `as never` assertions
- `apps/frontend/src/__tests__/api/reports/[id].test.ts`: 21 `as never` assertions
- `apps/frontend/src/__tests__/api/admin/handleCommitteeDiscrepancy.test.ts`: 20 `as never`
  assertions
- `apps/frontend/src/__tests__/api/lib/membershipConfirmation.test.ts`: repeated untyped Prisma
  accessors and delegate casts
- `packages/shared-validators/src/__tests__/compoundFieldUtils.test.ts`: both raw `as any` uses

### Current typecheck results

Commands run:

```sh
pnpm --filter voter-file-tool exec tsc --noEmit --pretty false
pnpm --filter node-pdf-generation exec tsc --noEmit --pretty false
pnpm --filter @voter-file-tool/shared-validators exec tsc --noEmit --pretty false
pnpm --filter @voter-file-tool/voter-import-processor exec tsc --noEmit --pretty false
```

Results:

| Package | Result | Blocker |
| --- | --- | --- |
| Frontend | Failed | Membership fixtures omit three exit-report fields; `AuditAction` label map also omits two actions |
| Report server | Failed | Committee membership fixture omits the same three fields |
| Shared validators | Failed | `searchQueryUtilsDateRange.test.ts` cannot resolve the package's self-import |
| Voter import processor | Passed | None |

These failures demonstrate that test typechecking already catches useful contract drift. It simply
is not part of the required workflow.

### CI does not enforce test type safety

`.github/workflows/test.yml` runs only `pnpm test`. `scripts/run-tests.ts` invokes Jest for each
package but does not invoke `tsc` or ESLint.

The frontend ESLint configuration weakens `no-unsafe-assignment` and
`no-unsafe-member-access` to warnings in tests, and lint is not part of the test workflow. It cannot
currently act as an acceptance gate.

### Public response contracts are asserted, not parsed

There are 123 uses of `parseJsonResponse<T>()` in frontend API/lib tests. The safer
`parseJsonResponseWith(response, schema)` helper exists but has no call sites.

This matters most for the categories the skill calls out explicitly: public APIs, reports, auth,
uploads, invites, audit routes, and worker payloads. A generic response cast cannot fail when the
runtime response stops matching `T`.

### Shared Prisma helpers erase generated types

`apps/frontend/src/__tests__/utils/testUtils.ts` defines accessors for membership, audit log,
eligibility flag, discrepancy, and meeting-record models. Their operations are raw `jest.Mock`
members. All result and argument drift below those accessors is invisible to TypeScript.

The skill says there is only one pre-migration accessor. The implementation and the rule have
already drifted apart.

`selectedRow()` and `resolvesTo()` centralize casts, but both ultimately return `never`. An explicit
generic checks the literal against the caller-supplied type; it does not prove that the type matches
the production query's actual `select` or `include` shape.

### Problems in the skill and AGENTS pointer

The rule document needs several corrections:

- Its `@ts-expect-error` example calls Zod `.parse()`. Zod accepts `unknown`, so the directive is
  normally unused. Negative compile-time assertions should target a typed assignment or function
  argument. Runtime schema rejection should use `safeParse()` or `toThrow()`.
- `satisfies Record<keyof Model, unknown>` checks that keys exist but does not check their value
  types or nullability. Complete rows should use `satisfies Model`.
- The shared-validator verification command runs `tsconfig.build.json`, which excludes tests. It
  therefore does not validate the type-contract test named by the skill.
- The skill description includes test reviews, but its body and the `AGENTS.md` pointer trigger only
  on adding or materially changing tests.
- “Prefer” schema parsing is too weak for public contracts and the named high-risk route classes.

## Enforcement design

Guidance and enforcement should have separate responsibilities.

### Guidance

`AGENTS.md` should be a short, reliable trigger. The skill should be the single source of truth for
the workflow and exceptions.

Suggested pointer:

> Before creating, changing, or reviewing tests or test helpers, read
> `skills/test-type-safety/SKILL.md`. Before finishing, run the affected package's
> `typecheck:test` command and report any blocker.

The skill should end with a checkable completion criterion:

> Every affected test is included in a passing TypeScript check, every public contract is
> schema-parsed, and the change introduces zero new escape-hatch violations.

### Mechanical enforcement

Add one `typecheck:test` command per package and a root `check:test-types` command that runs them
all. Use a dedicated `tsconfig.test.json` when build and test inclusion differ. Make the root command
a required CI check alongside Jest.

Because the repository already contains many violations, do not begin with an unqualified global
ban. Check in a baseline containing the existing violation fingerprints, reject additions, and
remove entries as tests are migrated. A raw total-count budget is insufficient because one removed
violation could otherwise pay for an unrelated new one.

Allow boundary casts only in an explicit small set of helper files. Exceptional call-site casts
should require a short reason that identifies the runtime boundary or deliberately invalid input.

## Migration order

1. Fix the current typecheck blockers so enforcement has a green baseline.
2. Add package and root typecheck commands, then require them in CI.
3. Add the no-new-debt scanner and capture the existing baseline.
4. Remove untyped Prisma accessors, starting with membership and audit tests.
5. Add or export response schemas and migrate high-risk API assertions.
6. Consolidate repeated fetch, NextRequest, xlsx, and matcher casts into approved boundary helpers.
7. Update the skill and `AGENTS.md` pointer after the commands they name actually exist.

## Tickets

| # | Ticket | Outcome |
| --- | --- | --- |
| 01 | [Restore a green test-typecheck baseline](issues/01-restore-green-typecheck-baseline.md) | Current contract drift is visible and fixed |
| 02 | [Add required test-inclusive typechecks](issues/02-add-test-typecheck-gate.md) | CI rejects TypeScript errors in tests |
| 03 | [Reject new escape-hatch debt](issues/03-reject-new-escape-hatch-debt.md) | New casts and untyped mocks cannot accumulate silently |
| 04 | [Migrate Prisma test mocks](issues/04-migrate-prisma-test-mocks.md) | Generated query/result types reach test call sites |
| 05 | [Schema-validate public response contracts](issues/05-schema-validate-public-responses.md) | Runtime response drift fails high-risk API tests |
| 06 | [Centralize runtime-boundary casts](issues/06-centralize-runtime-boundary-casts.md) | Legitimate casts are named, reviewable, and allowlisted |
| 07 | [Tighten agent guidance](issues/07-tighten-agent-guidance.md) | Agents receive reliable triggers and checkable completion criteria |

## Non-goals

- Requiring complete Prisma model fixtures when production selects a narrow shape
- Banning deliberate negative runtime tests
- Treating all double assertions as equally harmful
- Replacing runtime tests with type-level assertions
- Fixing unrelated production behavior discovered by the typecheck

