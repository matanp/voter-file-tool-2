# 01 - Replace npm `xlsx` 0.18.5 with SheetJS 0.20.3 from the SheetJS CDN

Status: ready-for-human
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

## Done (branch `deps/xlsx-sheetjs-0.20.3`, not merged)

Went with the vendored tarball, so installs never reach cdn.sheetjs.com.

- `vendor/xlsx-0.20.3.tgz` comes from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`.
  sha256 `8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8`. Its `package/package.json`
  says `xlsx` 0.20.3, with no dependencies and no install scripts.
- Root `package.json` uses `file:vendor/xlsx-0.20.3.tgz`. `apps/frontend`, `apps/report-server` and
  `packages/xlsx-tester` use `file:../../vendor/xlsx-0.20.3.tgz`. The lockfile records one
  `file:vendor/xlsx-0.20.3.tgz` package with an integrity hash. The seven 0.18.5 sub-dependencies (cfb,
  ssf, codepage and others) are gone, because 0.20.3 bundles them.
- `pnpm why -r xlsx` shows only 0.20.3. `pnpm test` passes (204 suites, 3014 tests). The frontend
  `tsc --noEmit`, `next build`, the report-server build and the xlsx-tester build all pass.
  Report-server `tsc --noEmit` fails in exactly one place, which is unrelated to xlsx:
  `src/__tests__/committeeMappingHelpers.test.ts:278`, a Prisma fixture that is missing the
  `resignationLetter*` fields. This change does not touch that file.
- Round trip (step 4) ran as a script rather than in the running app. It wrote workbooks with the
  report-server's compiled `xlsxUtils`, `AbsenteeReportExporter` and
  `generateDesignationWeightSummaryXLSXAndUpload`, with the upload stubbed out. It read them back with the
  frontend's `parseXlsxBuffer` and `parseCommitteeExportXlsx`. All of it passed. Re-importing a roster
  through the real bulk-load route in a running app has not been done.
- Clean-clone `pnpm install --frozen-lockfile --ignore-scripts` works with the Vercel install command
  (root, filtered to frontend plus shared packages), with the Lightsail command (root), and from inside
  `apps/report-server`. Every package resolved xlsx 0.20.3.

Open:

- Lightsail deploys with `git pull` into `/opt/voter-file-tool` and installs from the root, so `vendor/`
  arrives with the pull. No script change was needed.
- Vercel's install command runs `cd ../..` from `apps/frontend` and already depends on files outside the
  root directory (`packages/`), so `vendor/` should be visible too. Confirm on the first preview deploy
  of this branch.
- Dependabot can't track `file:` tarballs. Check https://cdn.sheetjs.com/ by hand for new releases. To
  upgrade, swap the tarball, update the four manifests, and record the new sha256.
- After merge, confirm the 9 `xlsx` alerts close.
