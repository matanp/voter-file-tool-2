# 01 - Replace npm `xlsx` 0.18.5 with SheetJS 0.20.3 from the SheetJS CDN

Status: ready-for-agent
Type: task

## Problem

`xlsx@0.18.5` carries 9 open Dependabot alerts: prototype pollution and ReDoS (GHSA-4r6h-8v6p-xvw6,
GHSA-5pgg-2g8v-p4x9, and others). Dependabot shows "no fix" because SheetJS stopped publishing to npm after
0.18.5. Fixed builds ship only from `https://cdn.sheetjs.com/`.

The vulnerable path is reachable. The frontend parses uploaded workbooks with `xlsx.read`:

- `apps/frontend/src/lib/lted/xlsxUpload.ts:55` (LTED / weighted-table / crosswalk imports)
- `apps/frontend/src/app/api/admin/bulkLoadCommittees/rosterFormats/committeeExportXlsx.ts:64`

Both are admin-only routes, which lowers the risk, but they still parse files supplied by users. The report
server only writes workbooks (`xlsxGenerator.ts`, `utils/xlsxUtils.ts`, `AbsenteeReportExporter.ts`).

## Fix

1. In every manifest that lists `xlsx`, change `"xlsx": "^0.18.5"` to
   `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`:
   root `package.json` (dev), `apps/frontend`, `apps/report-server`, `packages/xlsx-tester`.
2. `pnpm install`, then commit the lockfile (it records a tarball resolution with an integrity hash).
3. Run `pnpm test`, `tsc --noEmit` in both apps, `next build`, and the report-server build. Several tests
   mock `xlsx.read` (`xlsxUpload.test.ts`, `weightedTableImport.test.ts`, `crosswalk/import.test.ts`). Check
   they still type-check against the 0.20 typings.
4. Round-trip check: generate a committee export and an absentee report in XLSX, then re-import a roster
   through the bulk-load route.

## Things to decide

- **Install-time dependency on cdn.sheetjs.com.** CI and the Lightsail deploy (`scripts/deploy-lightsail.sh`)
  would fetch from SheetJS's CDN. If that's unacceptable, vendor the tarball, e.g. `vendor/xlsx-0.20.3.tgz`
  referenced as `file:../../vendor/xlsx-0.20.3.tgz`. SheetJS documents both approaches.
- Dependabot can't track tarball dependencies, so future SheetJS releases need a manual check.

## Acceptance

- `pnpm why xlsx -r` shows only 0.20.3.
- The 9 `xlsx` alerts auto-close after merge to `main`.
