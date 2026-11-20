# 04 - Let the user pick exported report fields

Status: resolved

## Ask (verbatim)

> 4. The report generation currently only includes the name and address. It would be great if the user could pick what gets exported, including address, mailing address, phone, and email.

## Diagnosis

The report is the **Committee Roster** (`committeeRoster`). Its default format is XLSX
(`packages/shared-validators/src/scopeReportRegistry.ts`), and `ScopedReportForm.buildPayload`
(`apps/frontend/src/components/reports/ScopedReportForm.tsx`) hardcodes `includeFields: []`. An XLSX
with no selected fields has only compound Name + compound Address, one sheet per LD/town. There is **no ED
column today**: `determineColumnsToInclude` adds only `name`, `address`, and `selectedFields`, and
`columnOrder` only reorders columns already included. That is what the Leader saw.

The XLSX path already works end to end:

- `committeeRosterReportSchema` (`packages/shared-validators/src/schemas/report.ts`) accepts
  `includeFields` (currently any string) and `xlsxConfig`.
- `fetchCommitteeRosterData` (`apps/report-server/src/committeeMappingHelpers.ts`) loads the full
  `voterRecord`. `mapVoterRecordToMember` keeps every field and applies the default compounds (name, address).
- `extractXLSXConfig` (`apps/report-server/src/index.ts`) → `generateUnifiedXLSXAndUpload`
  (`apps/report-server/src/xlsxGenerator.ts`) output any selected VoterRecord field. `processJob` calls it
  with `dataType: 'ldCommittees'` for `committeeRoster` too, so both types share the per-LD sheet code.
  `electionDistrict` is special-cased there (padded to 3 digits) but only appears if it is in
  `selectedFields`.
- `processJob` handles `ldCommittees` and `committeeRoster` in one branch. Both call
  `generateCommitteeReportHTML(payload)` for PDF. `processJob` is not exported.

`telephone`, `email`, `mailingAddress1-4`, `mailingCity`, `mailingState`, `mailingZip`, and
`mailingZipSuffix` are on `VoterRecord`. Only `name` and `address` have compound fields
(`packages/shared-validators/src/compoundFieldUtils.ts`), so "Mailing Address" needs a new compound.

The roster **PDF** (`apps/report-server/src/components/CommitteeReport.tsx`, mapped by
`transformToCommitteeMemberFormat` in `apps/report-server/src/utils.ts`) is landscape Letter with fixed
columns: Serve ED, Name, Address, City, State, Zip, Phone. It ignores `includeFields`. The Address column
already uses `createCompoundAddressField`, which includes city, state, and zip, so the City/State/Zip
columns repeat it. Pagination is a fixed budget of 30 rows per page (`paginateCommittees`) on a fixed-height
page. Each ED costs its members + 1 (the spacer row), so an ED with more than 29 members splits across
pages. If wider rows wrap, content gets pushed off the page. The same PDF is used by the Admin `ldCommittees`
report.

## Spec

Scope: **Committee Roster only.** Other scoped reports don't change.

### Fields

A curated list, with the same keys used for both formats:

| Option          | Column header   | Source                                                                       | Default   |
| --------------- | --------------- | ---------------------------------------------------------------------------- | --------- |
| Name            | Name            | compound `name`                                                              | always on |
| Address         | Address         | compound `address`                                                           | checked   |
| Mailing Address | Mailing Address | new compound `mailingAddress`                                                | unchecked |
| Phone           | Phone           | `telephone`                                                                  | see below |
| Email           | Email           | `email`                                                                      | unchecked |

Phone's default follows the format: checked for PDF (the roster PDF has a Phone column today), unchecked
for XLSX. Switching format resets Phone to the new format's default.

Name can't be turned off. ED is always the first column in both formats. The PDF has it today; the
XLSX gains it (see XLSX worker).

### Shared-validators

- Add `createCompoundMailingAddressField(record)` to `compoundFieldUtils.ts`. It joins the non-empty
  `mailingAddress1-4` lines with `, ` (each is a whole address line), then appends
  `mailingCity, mailingState zip[-suffix]` formatted the same way as `createCompoundAddressField`. It returns
  `''` when everything is empty.
- Foreign addresses: in the 2026-1 BOE file, about 1,200 of the roughly 10,000 records with mailing data have
  2–4 lines and empty city/state/zip fields. They are mostly foreign addresses (Canada, UK, Germany, …), with
  the city, postcode and country written into the lines. These must come out as just the joined lines, with
  no trailing `,` or stray spaces. City/state/zip repeating inside the lines is negligible (about 5 records),
  so don't try to de-duplicate it.
- Add `mailingAddress?: boolean` to `CompoundFieldConfig` (`false` in `DEFAULT_COMPOUND_FIELD_CONFIG`,
  which is `Required<CompoundFieldConfig>`) and `mailingAddress: z.boolean().optional()` to
  `xlsxConfigSchema.includeCompoundFields`. Missing means off. Do **not** add `.default(false)`:
  `GenerateReportData` is the schema's _output_ type, so a default would make `mailingAddress` required and
  break the typed `ldCommittees` payload in `apps/frontend/src/app/committee-reports/XLSXConfigForm.tsx`
  (its `includeCompoundFields` is `{ name, address }`). Leave the outer default `{ name: true, address: true }`
  as is.
- Add `mailingAddress?: string` to `EnrichedPartialVoterRecordAPI`. Handle it in `applyCompoundFields`,
  `determineColumnsToInclude` (pushed right after `address`), and `extractFieldValue` (fall back to computing
  it, like `address`, because `mapVoterRecordToMember` only applies the default compounds). In
  `mapVoterRecordFieldsInternal`, add the eight mailing fields to `fieldsToInclude` when
  `compoundFieldConfig.mailingAddress` is set, matching how `address` pulls its parts.
- `xlsxConfigSchema` is shared with `ldCommittees` and `voterList`. The new key is off unless sent, so their
  output doesn't change.
- Narrow `committeeRosterReportSchema.includeFields` to `z.array(z.enum(['telephone', 'email']))`. The
  server then rejects arbitrary VoterRecord fields from a Leader. `ldCommittees` and `voterList` don't
  change.

### Form (`ScopedReportForm`, `type === "committeeRoster"` only)

- An "Include" checkbox group: Name (checked and disabled), Address, Mailing Address, Phone, Email, with
  the defaults above. It shows for both formats.
- Payload, for **both** formats (the PDF worker reads the same fields): `includeFields` is the checked
  `telephone` / `email` keys in that order. `xlsxConfig` is `{ includeCompoundFields: { name: true, address,
  mailingAddress } }`, with no `columnOrder` or `columnHeaders`.
- There is no empty selection: Name is always on, so the smallest output is ED + Name.
- When format is PDF and Mailing Address or Email is checked, show an inline note under the
  checkboxes: "Long values may be cut off in the PDF. Choose Excel (XLSX) for complete data."
- Admins and Leaders see the same picker. A Developer acting as a Leader matches Leader behavior.

### XLSX worker

- Add a column header (`Mailing Address`) and a width for `mailingAddress` in `DEFAULT_COLUMN_HEADERS` and
  `FIELD_WIDTHS` in `xlsxGenerator.ts`.
- For `committeeRoster` only, build the XLSX config on the server: prepend `electionDistrict` to
  `selectedFields` and set `columnOrder` to `electionDistrict, name, address, mailingAddress, telephone,
  email`. Use the default headers (`Election District`, `Name`, `Address`, `Mailing Address`, `Phone`,
  `Email`). Ignore any client `columnOrder` / `columnHeaders` for this type. `ldCommittees` and `voterList`
  keep using `extractXLSXConfig` as-is.
- Put this in an exported pure helper so it can be unit tested (`processJob` is not exported). Pin it as:

  ```ts
  // apps/report-server/src/committeeRosterConfig.ts
  export type CommitteeRosterColumn = 'name' | 'address' | 'mailingAddress' | 'telephone' | 'email';
  export function buildCommitteeRosterReportConfig(
    jobData: Extract<EnrichedReportData, { type: 'committeeRoster' }>,
  ): { xlsx: XLSXGenerationConfig; pdfColumns: CommitteeRosterColumn[] };
  ```

  It reads `includeFields` and `xlsxConfig?.includeCompoundFields`. A missing `xlsxConfig` means
  `{ name: true, address: true, mailingAddress: false }`. It always forces `name: true`, whatever the client
  sent. It dedupes and emits columns in the fixed order (name, address, mailingAddress, telephone, email)
  regardless of the order of `includeFields`. `pdfColumns` doesn't list ED, which the PDF always renders.
  `XLSXGenerationConfig` is already exported from `xlsxGenerator.ts`; `EnrichedReportData` comes from
  `@voter-file-tool/shared-validators`.

### PDF worker

- Add an optional `columns?: CommitteeRosterColumn[]` argument to `generateCommitteeReportHTML`
  (`apps/report-server/src/utils.ts`) and a matching prop on `CommitteeReport`. `committeeRoster` passes
  `pdfColumns`. Render Serve ED, then only the selected columns, in the order Name, Address, Mailing
  Address, Phone, Email.
- When `columns` is omitted (the `ldCommittees` call), render today's markup unchanged: same columns
  (including City, State, Zip, and Phone), no fixed layout, no truncation.
- For `committeeRoster`, drop the separate City, State, and Zip columns. The compound Address already
  contains them.
- Extend `CommitteeMember` and `transformToCommitteeMemberFormat` with `mailingAddress` and `email`.
- Build the PDF column list in the same exported helper as the XLSX config.
- When `columns` is passed, use `table-layout: fixed` (`table-fixed`) with set column widths. Every cell is a
  single line (`truncate`, i.e. `whitespace-nowrap overflow-hidden text-ellipsis`), so a row never grows
  past one line and the 30-rows-per-page pagination stays correct. Don't change font size or `pageSize`.
  `public/tailwind.css` is built by `build:css` from the class names in `src/`, so write the classes as
  literal strings, not built-up ones. Widths can be inline `style` values.
- Mailing Address appears as one column.

### Compatibility and permissions

- No Prisma or `ReportType` change and no migration. Existing `Report` rows and their generated files are
  untouched. A queued job or old client that sends `includeFields: []` and no `xlsxConfig` still parses and
  gets ED, Name, Address in either format (see `buildCommitteeRosterReportConfig` above).
- The narrowed `includeFields` applies to every role, Admins included. Admins who need other fields keep the
  legacy `ldCommittees` form at `committee-reports/`.
- Page and API authorization don't change. The picker is client UI only and isn't role-gated, so it doesn't
  need `actingPermissions`.

### Out of scope

- The Sign-In Sheet, Vacancy, Weight Summary, and Changes reports.
- The hardcoded "as of May 15, 2025" PDF title.
- Checking how often phone/email are populated in the BOE data.
- The Committee File preset (see Comments). It needs fields outside this curated list and moves to
  [15](15-monthly-report-run.md).

## Acceptance criteria

- [ ] With the default selection, the roster XLSX has Election District, Name, Address, and the PDF has
      Serve ED, Name, Address, Phone (the City/State/Zip columns are gone from the roster PDF).
- [ ] Checking Mailing Address, Phone, and Email adds those columns, in that order, to both the XLSX and
      the PDF.
- [ ] A member with no mailing address, phone, or email gets empty cells, not "null" or "undefined".
- [ ] In the roster PDF, the table has `table-fixed` and every body cell has `truncate`, so an overly long
      email or mailing address is cut off with an ellipsis on one line (checked in the `CommitteeReport` test).
      Manual check, noted in the PR: generate a roster PDF with every column checked for an ED that fills a
      page (29 members + the ED spacer row, the `paginateCommittees` budget) and confirm it fits and the
      footer stays visible.
- [ ] A client-sent `xlsxConfig.columnOrder` / `columnHeaders`, or `includeCompoundFields.name: false`, has
      no effect on a `committeeRoster` report.
- [ ] Phone is checked by default for PDF and unchecked for XLSX, and switching format resets it.
- [ ] The PDF cut-off note shows only when the format is PDF and Mailing Address or Email is checked.
- [ ] `POST /api/generateReport` rejects a `committeeRoster` body whose `includeFields` contains a
      field outside `telephone` / `email` (400).
- [ ] `ldCommittees` (Admin committee-reports) and `voterList` output don't change. The `ldCommittees` PDF
      keeps City, State, Zip, and Phone.
- [ ] `docs/SRS/REPORT_PARAMETER_MATRIX.md`: the Committee Roster row lists the field picker under Extra Params.
- [ ] Tests:
  - `createCompoundMailingAddressField` (full, partial, empty, and lines-only with empty city/state/zip) and `determineColumnsToInclude` with
    `mailingAddress`: `packages/shared-validators/src/__tests__/compoundFieldUtils.test.ts`.
  - Schema accepts `telephone` / `email` and rejects other `includeFields` for `committeeRoster`, and
    `ldCommittees` still accepts any field: `packages/shared-validators/src/__tests__/schemas/report.test.ts`.
  - API 400 for a bad roster `includeFields`: `apps/frontend/src/__tests__/api/generateReport.test.ts`.
  - `ScopedReportForm` roster payload for the PDF default, XLSX default, and all-checked cases, the Phone
    default switching with format, and the PDF note:
    `apps/frontend/src/__tests__/components/reports/ScopedReportForm.test.tsx`. In that file, the
    `committeeRoster` cases of `leaderPayload` and `adminCountywidePayload` gain the default `xlsxConfig`.
    The two `includeFields: []` assertions in
    `apps/frontend/src/__tests__/app/committee-roster-reports/CommitteeRosterReportForm.test.tsx` gain it too.
    These all use `expect.objectContaining` with the XLSX default, so `includeFields: []` stays correct and
    they keep passing without the change; add `xlsxConfig` so they pin the new shape.
  - `CommitteeReport` renders only the selected columns, and renders the legacy columns when `columns` is
    omitted: new `apps/report-server/src/__tests__/CommitteeReport.test.tsx` (follow `SignInSheet.test.tsx`).
  - `buildCommitteeRosterReportConfig` produces the XLSX config and PDF columns for the default,
    all-checked, missing-`xlsxConfig`, out-of-order `includeFields`, and client `name: false` /
    `columnOrder` / `columnHeaders` cases: new `apps/report-server/src/__tests__/committeeRosterConfig.test.ts`.
- [ ] `pnpm run build:packages`, `pnpm --filter voter-file-tool test`, and
      `pnpm --filter node-pdf-generation test` pass.

## Comments

### 2026-11-01 - Committee File folded in from 05

The past `Committee File 2025-12-18 v2.xlsx` (in `data/fwdcommitteefilesfrom20251218executivecommittee.zip`, also as
a PDF) is the full countywide roster with 19 columns: `Committee`, `Serve LT`, `Serve ED`, `name`, `res address1`,
`res city`, `res state`, `res zip`, `home phone`, `work phone`, `cell phone`, `email`, `party`, `sex`, `dob`,
`voter id`, `Home LTWard`, `Home ED`, `election type`. The field picker should be able to produce it; consider it
an Admin preset. It's part of the monthly bundle in [15](15-monthly-report-run.md).

### 2026-11-02 - Review decisions

- The Committee File preset is out of scope for 04. It needs Committee, Serve LT, party, sex, DOB, voter ID,
  Home LT/ED, and election type, plus separate home/work/cell phones (VoterRecord has one `telephone`). It's
  tracked in [15](15-monthly-report-run.md).
- Phone defaults to checked for PDF so the roster PDF keeps the column it has today.
- The `ldCommittees` PDF keeps its City/State/Zip columns.
- [03](03-leader-reports-limited-to-own-committee.md) (same form) is already merged (#134). Build on current
  `main`.

### 2026-11-02 - Readiness review

Checked against the code on `main` (4e2b49c). Changes:

- `xlsxConfigSchema.includeCompoundFields.mailingAddress` is `.optional()` with no default. A default would make
  the key required on `GenerateReportData` and break the typed `ldCommittees` payload in `XLSXConfigForm.tsx`.
- `mapVoterRecordFieldsInternal` also pulls the mailing parts when `mailingAddress` is on.
- The form sends `xlsxConfig.includeCompoundFields` for both formats, because the PDF worker reads it.
- Pinned the helper as `buildCommitteeRosterReportConfig` → `{ xlsx, pdfColumns }`, including the
  missing-`xlsxConfig` default, forced `name: true`, and fixed column order.
- Fixed layout and truncation apply only when `columns` is passed, so the `ldCommittees` PDF markup is unchanged.
  Tailwind classes must be literal because `build:css` scans `src/`.
- The PDF "fits on a page" check is now a class assertion plus a manual PDF check.
- Named the `leaderPayload` / `adminCountywidePayload` helpers in `ScopedReportForm.test.tsx` and noted that
  the existing `objectContaining` assertions keep passing.
- Added compatibility and permissions notes.
