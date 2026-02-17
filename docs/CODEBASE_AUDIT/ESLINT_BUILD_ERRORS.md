# ESLint Errors Blocking Next.js Build

**Status:** As of 2026-02-16, `pnpm --filter voter-file-tool run lint` passes with **0 errors and 0 warnings**. All issues are resolved.

**Context:** The project uses `plugin:@typescript-eslint/recommended-type-checked` and `plugin:@typescript-eslint/stylistic-type-checked`, which enforce strict type safety. Test files and some config/setup files had accumulated violations that have now been fixed across multiple rounds.

---

## Resolution History

### Round 1 (2025-02, early)
- Resolved `no-unused-vars` in `page.tsx` (KeyCapabilities import) and 4 admin test files (expectSuccessResponse imports).
- Admin tests (bulkLoadCommittees, bulkLoadData, electionDates, handleCommitteeDiscrepancy), `fetchLoaded.test.ts`, and `reports/[id].test.ts` cleaned up.

### Round 2 (2025-02, mid)
- **Test files:** Added type assertions for `response.json()` and `JSON.parse` calls across `generateReport.test.ts`, `getCsvUploadUrl.test.ts`, `getVoterFileUploadUrl.test.ts`, `reportJobs.test.ts`, `reports.test.ts`, and `useApiMutation.test.ts`.
- **Config files:** `next.config.js` (JSDoc types + ESLint override), `tailwind.config.ts` (ESM imports), `jest.setup.ts` (typed `jest.requireActual` + ESLint override).

### Round 3 (2026-02-16)
- **`next-env.d.ts`:** Added ESLint override to disable `triple-slash-reference` for this auto-generated file (Next.js regenerates it on every build).
- **`types/next-auth.d.ts`:** Switched to `import type` syntax, removed unused `NextAuth` default import.
- **`VoterListReportForm.tsx`:** Removed stable `fetchDataMutation.mutate` ref from useEffect deps with `eslint-disable-next-line` comment.

---

## Summary by Rule (all resolved)

| Rule                                         | Severity | Resolution                                              |
| -------------------------------------------- | -------- | ------------------------------------------------------- |
| `@typescript-eslint/no-unsafe-assignment`    | Error    | Type assertions on `response.json()` / `JSON.parse`    |
| `@typescript-eslint/no-unsafe-return`         | Error    | Typed mock return values                                |
| `@typescript-eslint/no-unsafe-call`          | Error    | JSDoc types + ESLint overrides for config files         |
| `@typescript-eslint/no-unsafe-member-access` | Error    | JSDoc types + ESLint overrides for config files         |
| `@typescript-eslint/no-var-requires`         | Error    | Replaced `require()` with ESM `import`                 |
| `@typescript-eslint/triple-slash-reference`  | Error    | ESLint override for auto-generated `next-env.d.ts`     |
| `@typescript-eslint/consistent-type-imports` | Warning  | Switched to `import type` syntax                        |
| `@typescript-eslint/no-unused-vars`          | Warning  | Removed unused `NextAuth` import                        |
| `react-hooks/exhaustive-deps`                 | Warning  | eslint-disable with comment (stable mutation ref)       |

---

## Related

- [TEST_COVERAGE_ANALYSIS.md](./TEST_COVERAGE_ANALYSIS.md) — test coverage and quality
- [CODE_STYLE_ARCHITECTURE.md](./CODE_STYLE_ARCHITECTURE.md) — coding standards
