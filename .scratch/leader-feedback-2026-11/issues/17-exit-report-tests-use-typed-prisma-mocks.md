# 17 - Exit Report tests use typed Prisma mocks

Status: resolved
Merge blocking: yes

## Problem

The Exit Report branch extends the legacy `getMembershipMock` / `getAuditLogMock`
accessors and adds call-site `as never` / `as unknown as` casts in several changed
test suites. Those patterns erase the generated Prisma delegate types, so schema
or selected-row drift can compile unnoticed.

Follow `skills/test-type-safety/SKILL.md`: call `prismaMock.<model>.<method>`
directly, use named selected/include row shapes or `satisfies`-typed fixtures,
and keep unavoidable runtime-boundary casts in the shared test helpers.

## Acceptance criteria

- [x] Changed Exit Report tests do not add uses of the untyped Prisma mock accessors.
- [x] Changed Exit Report tests contain no casual `as never` or `as unknown as` casts.
- [x] Selected/include query fixtures are checked against named shapes.
- [x] Frontend `tsc --noEmit` and the affected suites pass.

## Answer

Fixed. Every line the branch added now goes through a typed `prismaMock.<model>` delegate,
and the branch adds no `as never` / `as unknown as` casts.

- `MockMembership` in `testUtils.ts` is now the generated `CommitteeMembership` type instead
  of the string-typed pre-migration stub, so every `createMockMembership` fixture is checked.
  Switching to it caught `status: string` in the hand-written arg types in `add.test.ts` and
  `handleRequest.test.ts`.
- Partial membership literals in `petition-outcomes/record.test.ts` now use
  `createMockMembership`. The eligibility-flag review fixture spreads a real row and adds
  its included relations.
- Selected shapes are named: `ResolvedDiscrepancyRow` in `undo.test.ts` (it replaces the
  `as never` discrepancy casts) and `ActiveMembershipExitState` in the bulk-load test.
  The history-tab audit rows go through the existing typed `serveAuditRows`.
- `designationWeight.test.ts` uses `prismaMock.userJurisdiction` with full
  `UserJurisdiction` rows.

The 170-odd legacy `getMembershipMock` / `getAuditLogMock` uses on lines this branch didn't
add are left for a separate migration.

Verified: frontend `tsc --noEmit` is clean, `pnpm test` passes (2270 tests), and `test:pg`
passes (4 suites, 15 tests, run against a throwaway `_test` database).
