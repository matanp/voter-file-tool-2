# 08 - Fix the Monroe town-code table so crosswalk rows get the right town

Status: resolved
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

- [x] Correct `TOWN_CODE_TO_CITY`, and add a test that pins every entry. The current test checks only
  080 and an unknown code.
- [x] Re-import the crosswalk in each environment (prod done 2026-10-25). The import upserts on (town, LD, ED), so the
  mislabelled rows stay behind: delete them first, or clear the table before importing.
- [x] Re-run the weighted-table import if weights were loaded with the bad table (prod done, ticket 10).
- [ ] Re-run the BOE eligibility audit (moved to ticket 11). It auto-resolves (`RESOLVED_BY_RESCAN`) the stale
  `ASSEMBLY_DISTRICT_MISMATCH` flags. Locally, all 1,426 active members have one; see ticket 02.
- [x] Re-run section 2 of `audit-ad-data.sql` (prod clean 2026-10-25). It should report 0 committees without a crosswalk row
  and an empty 2b (town labels).

## Comments

### 2026-10-25 - code fix landed

- `TOWN_CODE_TO_CITY` in `apps/frontend/src/lib/lted/monroeTownCodes.ts` now matches the table
  above: 21 codes, 21 distinct towns, IRONDEQUOIT, MENDON and PARMA added, 017-075, 085 and 090
  moved to the right town.
- Re-checked the table before changing it. `data/2024_LTED_Matrix.xlsx` (`town` → `ward`) and
  `data/2026_1_voter_file_full.txt` both give exactly one LD per code (45-64, in code order; 080
  covers the city wards), and every LD 45-64 in the BOE committee list carries the same single
  town name.
- `monroeTownCodes.test.ts` now pins the whole mapping with `toEqual`, checks there are no
  duplicate towns, and resolves each code in strict mode. It failed on the old table (15 codes
  wrong, 18 distinct towns) and passes now.
- Other users: the crosswalk import, the weighted-table import (`fallback` mode) and
  `scripts/seedLtedCrosswalk.ts` all go through `lookupCityTown`, so they pick up the fix with no
  code change. No existing test relied on the wrong mapping. One weighted-table import test pairs
  town `025` with a BRIGHTON committee in its fixture. It still passes, because it only needs two
  different towns for the same LTED, but `025` is GREECE now, so the fixture reads oddly.
- Left for a human, in each environment: delete the mislabelled crosswalk rows (or clear the
  table) and re-import the crosswalk, re-run the weighted-table import if weights were loaded
  with the bad table, re-run the BOE eligibility audit, and re-run section 2 of
  `audit-ad-data.sql`. No database was touched.

### 2026-10-25 - prod crosswalk replaced

- Prod held 370 rows across 6 towns, against a full import's 659. The rows had the old wrong
  labels (BRIGHTON up to LD 50, CLARKSON LD 48, EAST ROCHESTER LD 49, GATES LD 51), and LDs 52-64
  were missing entirely. That fits the old row-by-row import timing out partway through.
- Backed up to `apps/frontend/crosswalk-backup.csv` on Matan's machine (370 rows), deleted in
  psql, then reloaded with `pnpm db:seed-lted-crosswalk ../../data/2024_LTED_Matrix.xlsx`: 659
  rows inserted, no unknown town codes.
- `audit-ad-data.sql` on prod: 437 active committees, 0 without a crosswalk row, 0 with an empty
  AD, and 2b empty. See ticket 02 for the full results.
- Still open: the weighted-table re-import (ticket 10) and the BOE eligibility audit (ticket 11),
  both from the prod admin UI. The local DB hasn't been redone either.

### 2026-10-25 - verified on prod, closing

- Matan checked eligibility on prod for ROCHESTER · LD 21 · ED 3 (AD 138). The Presbergs, who live
  in LD 23/24 but in AD 138, show as eligible. They don't show as eligible for LD 21 ED 1 (AD 136)
  or ED 4 (AD 137), which is correct: LD 21 is split across ADs 136, 137 and 138 in the 2026 voter
  file.
- The remaining work is tracked elsewhere: the BOE rescan in ticket 11, and the local DB crosswalk
  reload (ticket 11, step 5).
