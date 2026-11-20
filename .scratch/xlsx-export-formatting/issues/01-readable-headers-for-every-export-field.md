# 01 - Give every exported field a readable column header

Status: needs-triage
Type: task

## Found

2026-11-08, checking a production voter-list export (`test-prod-2026-11-09-06-18-11.xlsx`: 17,223 rows, every field
selected) after report-server-provisioning ticket 11 was deployed. 16 of its 41 columns have the raw field name as their
header:

`halfAddress`, `resAddrLine2`, `resAddrLine3`, `zipSuffix`, `mailingAddress1`, `mailingAddress2`, `mailingAddress3`,
`mailingAddress4`, `mailingCity`, `mailingState`, `mailingZip`, `mailingZipSuffix`, `L_T`, `CC_WD_Village`, `townCode`,
`statevid`.

## Why

`generateUnifiedXLSXAndUpload` (`apps/report-server/src/xlsxGenerator.ts`) labels each column with
`columnHeaders[field] || field`. `DEFAULT_COLUMN_HEADERS` (same file) only covers the fields in `DEFAULT_COLUMN_ORDER`.
Any other selected field falls back to its key. The voter-list, committee-roster and LD-committees XLSX exports all go
through this function, so all three are affected.

Two related bugs on the same path:

- **The State Assembly District column lands in the wrong place.** `DEFAULT_COLUMN_ORDER` lists
  `stateAssemblyDistrict`, but the field is `stateAssmblyDistrict` (the Prisma column is misspelled). The order entry
  never matches, so that column comes after `L_T`, not next to the other districts. Its header is right only because
  `DEFAULT_COLUMN_HEADERS` uses the misspelled key.
- **Setting one custom header drops all the default headers.** The destructuring default
  `columnHeaders = DEFAULT_COLUMN_HEADERS` only applies when `columnHeaders` is `undefined`. The voter-list and committee
  report forms send `xlsxConfig.columnHeaders` as soon as the user renames any column (`VoterListReportForm.tsx`,
  `XLSXConfigForm.tsx`). Renaming one column therefore replaces the whole map, and every column the user didn't rename
  falls back to its raw key.

The labels are also defined three times, and the copies disagree:
- the report-server's `DEFAULT_COLUMN_HEADERS`;
- the field picker in `apps/frontend/src/app/committee-reports/constants.ts`, which itself shows `L_T` and
  `CC_WD_Village` as labels;
- `displayName` in `apps/frontend/src/lib/constants/searchFields.ts`, which says `CC WD Village`.

## Fix

- Keep one label per exportable field in `packages/shared-validators`, next to the field list in `constants.ts`. Use
  it for the XLSX defaults and for both frontend pickers.
- Merge custom headers onto the defaults (`{ ...DEFAULT_COLUMN_HEADERS, ...columnHeaders }`) instead of replacing them.
- Fix the `stateAssemblyDistrict` entry in `DEFAULT_COLUMN_ORDER`. Better, type the order list against the field
  names so a misspelling doesn't compile.

**Needs a human:** what the BOE-specific fields should be called. `L_T` (legislative town?), `CC_WD_Village`,
`statevid` (State Voter ID?), `halfAddress` (it holds `0`/`-1` in production) and `townCode` all need names, and
someone who knows the BOE file has to choose them.

## Acceptance

- An all-fields voter-list export has no header that is a raw field key.
- State Assembly District sits with the other district columns.
- Renaming one column in the form changes only that column's header.
- A report-server test covers all three, through `generateUnifiedXLSXAndUpload` or the header/order helpers it uses.

## Comments

- 2026-11-15: PR #149 (merged `26c28e0d`) did part of this ticket:
  - Custom headers now merge over the defaults per column, and blank ones are ignored (`resolveColumnHeaders` in
    `xlsxGenerator.ts`). The "renaming one column" acceptance item is covered by its tests.
  - `CC_WD_Village` now has one shared label, `VILLAGE_WARD_LABEL` ("Village / Ward") in `shared-validators`. The
    voter card, record search column, report picker and XLSX default all use it.
  - The hidden "CC WD Village" search field was removed, so the `searchFields.ts` copy is gone.

  Still open:
  - The other fields have no shared label.
  - The frontend `AVAILABLE_FIELDS[].label` and `DEFAULT_COLUMN_HEADERS` can still disagree. The report form uses
    `field?.label` as the header input's placeholder, but a blank input now falls back to the server default, so the
    placeholder can show a header the export won't use.
  - Once every field has a default, `columnHeaders[field] || field` (`xlsxGenerator.ts:203`, `:239`) can only fall
    back to the raw key for a field with no label. A typed label map would remove that fallback.
  - The `stateAssemblyDistrict` order bug.
  - Names for `L_T`, `townCode`, `statevid` and `halfAddress`.
