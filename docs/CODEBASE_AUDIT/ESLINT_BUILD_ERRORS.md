# ESLint Errors Blocking Next.js Build

**Status:** As of the last `pnpm --filter voter-file-tool run build`, the Next.js build fails during the "Linting and checking validity of types" phase due to ESLint errors. These errors block Vercel deployment.

**Context:** The project uses `plugin:@typescript-eslint/recommended-type-checked` and `plugin:@typescript-eslint/stylistic-type-checked`, which enforce strict type safety. Test files and some app code have accumulated violations.

**Recent fixes (2025-02):** Resolved `no-unused-vars` in `page.tsx` (KeyCapabilities import) and 4 admin test files (expectSuccessResponse imports).

---

## Summary by Rule

| Rule                                         | Severity | Count (approx) | Primary Location                                        |
| -------------------------------------------- | -------- | -------------- | ------------------------------------------------------- |
| `@typescript-eslint/no-unsafe-assignment`    | Error    | ~35            | Test files (JSON.parse, response.json())                |
| `@typescript-eslint/no-unsafe-member-access` | Error    | ~40            | Test files (accessing .error, .reports, .fileKey, etc.) |
| `@typescript-eslint/no-unsafe-return`        | Error    | ~5             | Test mocks, helper functions                            |
| `@typescript-eslint/no-unsafe-call`          | Error    | ~2             | useApiMutation.test.ts                                  |
| `@typescript-eslint/no-unused-vars`          | Warning  | ~1             | types/next-auth.d.ts (NextAuth unused)                  |
| `react-hooks/exhaustive-deps`                | Warning  | 1              | VoterListReportForm.tsx                                 |

---

## Affected Files

### Test Files (bulk of errors)

| File                                                         | Main Issues                                                                            |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `src/__tests__/api/admin/bulkLoadCommittees.test.ts`         | Unsafe assignment/member-access on response body                                       |
| `src/__tests__/api/admin/bulkLoadData.test.ts`               | Same pattern                                                                           |
| `src/__tests__/api/admin/electionDates.test.ts`              | Same pattern                                                                           |
| `src/__tests__/api/admin/handleCommitteeDiscrepancy.test.ts` | *(resolved)*                                                                           |
| `src/__tests__/api/committee/fetchLoaded.test.ts`            | Unsafe assignment/member-access on success, discrepanciesMap, recordsWithDiscrepancies |
| `src/__tests__/api/generateReport.test.ts`                   | Unsafe assignment, .error access                                                       |
| `src/__tests__/api/getCsvUploadUrl.test.ts`                  | Unsafe return, .error, .uploadUrl, .fileKey                                            |
| `src/__tests__/api/getVoterFileUploadUrl.test.ts`            | Same as getCsvUploadUrl                                                                |
| `src/__tests__/api/reportJobs.test.ts`                       | .error, .provided, .pageSize, .page, .reports, .totalCount                             |
| `src/__tests__/api/reports.test.ts`                          | Unsafe return, .reports access                                                         |
| `src/__tests__/api/reports/[id].test.ts`                     | .error, .fileKey, and similar response body access                                     |
| `src/__tests__/hooks/useApiMutation.test.ts`                 | Unsafe assignment, .signal access, unsafe call                                         |

### Application Code

| File                                                 | Issue                                                     |
| ---------------------------------------------------- | --------------------------------------------------------- |
| `src/app/page.tsx`                                   | *(resolved)*                                             |
| `src/app/voter-list-reports/VoterListReportForm.tsx` | useEffect missing `fetchDataMutation` in dependency array |

---

## Root Causes

1. **Test helpers:** `JSON.parse()` and `response.json()` return `any`. Tests then assign to variables and access properties without type assertions.
2. **Mock responses:** Mock fetch/Response objects often return untyped values; accessing `.json()`, `.signal`, etc. triggers unsafe-\* rules.
3. **Unused code:** `expectSuccessResponse` and `KeyCapabilities` — *fixed in page.tsx and 4 admin test files*; `NextAuth` in next-auth.d.ts remains.
4. **Hooks:** Intentional dependency omission in useEffect (e.g. stable mutation ref) without eslint-disable.

---

## Fix Strategies

### Quick wins (unblock build)

- Add `eslint: { ignoreDuringBuilds: true }` to `next.config.js` (build passes; ESLint still runs via `pnpm run lint`).
- Or exclude `**/__tests__/**` from ESLint during build (e.g. via `eslintrc` overrides).

### Proper fixes

1. **Test files:** Type JSON parsing and response bodies, e.g.:
   - `const data = JSON.parse(json) as ExpectedType`
   - `const body = (await res.json()) as ExpectedResponse`
   - Or use Zod schema validation and typed `parse()`.
2. **Unused symbols:** Remove or use — *done for page.tsx (KeyCapabilities), electionDates, bulkLoadCommittees, bulkLoadData, handleCommitteeDiscrepancy (expectSuccessResponse)*. Remaining: `NextAuth` in next-auth.d.ts.
3. **Hooks:** Add `// eslint-disable-next-line react-hooks/exhaustive-deps` with a brief comment if the dependency is intentionally omitted.

---

## Related

- [TEST_COVERAGE_ANALYSIS.md](./TEST_COVERAGE_ANALYSIS.md) — test coverage and quality
- [CODE_STYLE_ARCHITECTURE.md](./CODE_STYLE_ARCHITECTURE.md) — coding standards
