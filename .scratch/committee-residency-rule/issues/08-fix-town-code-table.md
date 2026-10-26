# 08 - Fix the Monroe town-code table so crosswalk rows get the right town

Status: ready-for-agent
Type: task

## Why

Ticket 02's audit found that `TOWN_CODE_TO_CITY` in `apps/frontend/src/lib/lted/monroeTownCodes.ts`
is wrong. It maps two codes to CLARKSON, two to BRIGHTON and two to GATES. It has no entries for
IRONDEQUOIT, MENDON or PARMA. Every code from 017 to 075, plus 085 and 090, is shifted to the
wrong town. The crosswalk importer therefore saves LDs 48 to 62 under the wrong `cityTown`. The
committees for those LDs (238 of 437 locally) find no crosswalk row, so every admission to them
hard-stops with `ASSEMBLY_DISTRICT_MISMATCH`, and ticket 04 would disable the eligible-only filter
for them.

The weighted-table import (`apps/frontend/src/app/api/admin/weightedTable/import/route.ts`) uses
the same table, and it falls back on crosswalk town names. Expect it to match weights to the wrong
committee towns, or none, for the same 15 towns.

## The correct table

Checked against three sources on 2026-10-25. Each code covers exactly one LD (Rochester excepted)
in `data/2024_LTED_Matrix.xlsx` (`town` → `ward`) and in `data/2026_1_voter_file_full.txt`, and
the two files agree. The BOE office names in `data/Elected County Committee List 2026 - 2028 .txt`
(e.g. `GATES/049/005-CC`) give each LD's town. The codes follow alphabetical town order:

| code | town | LD |   | code | town | LD |
|---|---|---|---|---|---|---|
| 005 | BRIGHTON | 45 | | 055 | PARMA | 56 |
| 010 | CHILI | 46 | | 060 | PENFIELD | 57 |
| 015 | CLARKSON | 47 | | 065 | PERINTON | 58 |
| 017 | EAST ROCHESTER | 48 | | 070 | PITTSFORD | 59 |
| 020 | GATES | 49 | | 075 | RIGA | 60 |
| 025 | GREECE | 50 | | 080 | ROCHESTER | city wards |
| 030 | HAMLIN | 51 | | 085 | RUSH | 61 |
| 035 | HENRIETTA | 52 | | 090 | SWEDEN | 62 |
| 040 | IRONDEQUOIT | 53 | | 095 | WEBSTER | 63 |
| 045 | MENDON | 54 | | 100 | WHEATLAND | 64 |
| 050 | OGDEN | 55 | | | | |

## To do

- Correct `TOWN_CODE_TO_CITY`, and add a test that pins every entry. The current test checks only
  080 and an unknown code.
- Re-import the crosswalk in each environment. The import upserts on (town, LD, ED), so the
  mislabelled rows stay behind: delete them first, or clear the table before importing.
- Re-run the weighted-table import if weights were loaded with the bad table.
- Re-run the BOE eligibility audit. It auto-resolves (`RESOLVED_BY_RESCAN`) the stale
  `ASSEMBLY_DISTRICT_MISMATCH` flags. Locally, all 1,426 active members have one; see ticket 02.
- Re-run section 2 of `audit-ad-data.sql`. It should report 0 committees without a crosswalk row
  and an empty 2b (town labels).

## Comments
