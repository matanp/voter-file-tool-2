# Test type-safety: quick-win plan

Updated: 2026-11-02 (after re-running typechecks against the current branch)

The audit README is partly stale. Recent Exit Report commits already fixed the membership fixtures,
the report-server fixture, and the `AuditAction` labels from ticket 01.

## Current typecheck state

| Package | Result | Remaining errors |
| --- | --- | --- |
| Frontend | 6 errors | See below; all tied to in-progress Exit Report changes |
| Report server | Pass | None |
| Shared validators | 2 errors | Self-import in `searchQueryUtilsDateRange.test.ts` |
| Voter import processor | Pass | None |

Frontend errors:

- `adapters.test.ts` (4): `reason` was removed from `ResignationInput`.
- `remove.exitReport.test.ts:121`: passes `exitReportedAt`, which the remove input no longer has.
- `CommitteeActionDrawer.test.tsx:1271`: uses `"confirm-exit-report"`, which is no longer in the action union.

## Order of work

1. **Ticket 01 - restore green baseline (~30 min).**
   - Fix the 6 frontend errors alongside the Exit Report branch work (they come from its changes).
   - Fix the shared-validators self-import (one-line import change, or a path mapping in a test tsconfig).
2. **Ticket 02 - add the gate (~1 hr).** Highest value.
   - Add a `typecheck:test` script per package (and `tsconfig.test.json` where build excludes tests).
   - Add root `check:test-types`.
   - Add it to `.github/workflows/test.yml` next to `pnpm test`.
   - Confirm `reportTypes.test.ts` in shared-validators is covered.
3. **Ticket 07, partial - fix the skill doc.**
   - Replace the invalid Zod `@ts-expect-error` example (typed assignment for compile-time; `safeParse`/`toThrow` for runtime).
   - Use `satisfies Model`, not `satisfies Record<keyof Model, unknown>`.
   - Fix the shared-validators verification command that excludes tests.
   - Add the new `AGENTS.md` pointer wording only after ticket 02 lands (it names `typecheck:test`).
4. **Ticket 05, one slice.**
   - Migrate one high-risk route test (audit or invites) from `parseJsonResponse<T>()` to `parseJsonResponseWith()`.
   - Add the regression test showing an incompatible runtime response fails schema parsing.

## Defer (not quick wins)

- Ticket 03: AST scanner and baseline.
- Ticket 04: migrating 506 `getXxxMock(prismaMock)` call sites.
- Ticket 06: classifying and centralizing boundary casts.

## Open question

Should the 6 frontend errors be fixed here, or folded into the Exit Report branch? They sit next to
uncommitted work in that branch.
