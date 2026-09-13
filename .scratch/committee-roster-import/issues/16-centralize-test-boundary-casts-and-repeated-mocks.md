# 16: Centralize remaining low-risk test boundary casts and repeated mocks

**Status:** ready-for-agent

**Priority:** P3 cleanup. These are worthwhile type-safety and readability improvements, but they
are not roster import merge blockers.

## What to fix

The type-safety review found several smaller patterns that should be cleaned up after the focused
branch fixes:

- `voterRecordRow` in `bulkLoadCommittees.test.ts` builds a row from
  `Object.fromEntries(Object.keys(voterRecordSchema.shape)...)` and casts the result to
  `VoterRecord`. Add a `satisfies Record<keyof VoterRecord, unknown>` style check on the built
  object so a Prisma column added without a schema entry fails at compile time.
- `xlsx.write(...) as Buffer` appears in both
  `bulkLoadCommittees.rejectedRows.test.ts` and
  `rosterFormats/committeeExportXlsx.test.ts`. This is an acceptable framework-boundary cast, but
  the project guidance says repeated boundary casts should live behind a helper.
- The `jest.mock("~/app/api/lib/committeeValidation", ...)` preamble and the repeated
  `jest.mocked(...)` assignments are copied through several roster import tests. Add a
  `mockCommitteeValidation()` or similar helper in test utilities if it can reduce duplication
  without hiding which functions a test overrides.
- `bulkLoadCommittees.pg.integration.test.ts` necessarily uses raw SQL and string table/index
  names. Do not try to invent compile-time SQL safety for that file, but leave comments near the
  raw SQL list naming it as runtime-only drift coverage.

## Acceptance criteria

- [ ] `voterRecordRow` proves the schema-derived object covers `keyof VoterRecord` before the
      unavoidable final row cast.
- [ ] The duplicated `xlsx.write(..., { type: "buffer", bookType: "xlsx" }) as Buffer` cast is
      centralized in one clearly named helper.
- [ ] Repeated committee-validation Jest mock boilerplate is extracted only if the resulting helper
      keeps each test's overridden functions obvious.
- [ ] The Postgres integration test's raw SQL table/index names are documented as intentional
      runtime-only drift checks.
- [ ] The affected frontend tests and frontend type check pass.

## Out of scope

- Rewriting the integration test to avoid raw SQL.
- Moving roster import parsing into a different package.
- The broader Prisma delegate mock migration; that is issue 14.
