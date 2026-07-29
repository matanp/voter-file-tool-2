# Committee File Diff: 2025 vs 2026

Generated: 2026-05-31

Compares:
- **Old:** `apps/frontend/data/Committee-File-2025-05-15.xlsx` (May 15, 2025)
- **New:** `apps/frontend/data/Committee File 2026-04-16(1).xlsx` (April 16, 2026)

Parsing rules match bulk load (`bulkLoadUtils.ts`) and `compare-committee-exports.ts`: city from `Committee` (LD → Rochester), committee key `{cityTown}-{Serve LT}-{Serve ED}`, member key `voter id`.

---

## Executive Summary

| Metric | 2025 file | 2026 file | Change |
| --- | ---: | ---: | ---: |
| Data rows | 1,500 | 1,559 | +59 |
| Unique voters | 1,498 | 1,559 | **+61** |
| Committees (city-LT-ED) | 460 | 474 | **+14** |
| Rochester LD committees | 158 | 158 | 0 |

**Membership churn (voter-ID keyed, 2025 duplicates use first row):**

| Category | Count |
| --- | ---: |
| Added (in 2026 only) | 104 |
| Removed (in 2025 only) | 43 |
| Moved (different committee) | 2 |
| Field changes (same committee) | 7 |

**Notable patterns:**
- 16 new committees appeared; 2 committees from 2025 no longer exist.
- 93 committees changed membership size; several Rochester LD committees filled toward the 4-member target.
- Gates-49-001 went from 0 → 4 members (new committee slot).
- The 2026 export adds 7 columns (`dob`, district serve fields); bulk load ignores them today.
- The 2025 file has **2 duplicate voter ID rows** (data quality issue); the 2026 file has none.

---

## Schema Comparison

| Property | 2025 | 2026 |
| --- | --- | --- |
| Sheet name | Export Current Committee | Export Current Committee with S |
| Column count | 18 | 25 |
| Columns removed | — | (none) |

### Columns added in 2026

| Column | Notes |
| --- | --- |
| `dob` | Date of birth; not used by bulk load |
| `Serve LTED` | Serve district crosswalk; informational |
| `Serve CD` | Congressional district served |
| `Serve SD` | State Senate district served |
| `Serve AD` | Assembly district served |
| `Serve LD` | Legislative district served |
| `Serve CC/Ward` | County/Ward served |

All original 18 columns are unchanged. Bulk load continues to use: `Committee`, `Serve LT`, `Serve ED`, `voter id`, plus discrepancy fields (`name`, `res address1`, `res city`, `res state`, `res zip`).

---

## Membership Changes

### Removed members (43)

| Voter ID | Name | Committee |
| --- | --- | --- |
| 000111245 | CARRIE E REMIS | IRONDEQUOIT-53-007 |
| 000158117 | MARTHA R NELSON | ROCHESTER-25-001 |
| 000170422 | AARON M GALLANT | ROCHESTER-24-012 |
| 000172114 | ROMAN A MISULA | IRONDEQUOIT-53-005 |
| 000208695 | SARA A HOPKINS | BRIGHTON-45-021 |
| 000210269 | ERIK T EMERSON | CHILI-46-022 |
| 000249485 | ALISON M SANTACROCE | IRONDEQUOIT-53-041 |
| 002419947 | MICHAEL L WILLOUGHBY | BRIGHTON-45-020 |
| 002724803 | SUSAN A KORPECK | BRIGHTON-45-035 |
| 003077087 | JOHN GL GIESS | ROCHESTER-23-016 |
| 005251420 | ROSA L CAMACHO-GRAHAM | IRONDEQUOIT-53-041 |
| 008396934 | ANN C LEWIS | ROCHESTER-25-017 |
| 008620221 | JAMES H DEMPS | ROCHESTER-28-006 |
| 012065094 | TASSIE R DEMPS | ROCHESTER-28-006 |
| 013291282 | MARY T HESSLER | RIGA-60-004 |
| 014195475 | JOAN M ROBY-DAVISON | ROCHESTER-26-011 |
| 014321865 | OTTO W BRUNO | IRONDEQUOIT-53-003 |
| 018026753 | DANIEL T KENNELLY | ROCHESTER-24-015 |
| 018095436 | CHRIS P PRYOR | GREECE-50-098 |
| 018095437 | MICHAEL W PRYOR | GREECE-50-098 |
| 018139175 | FREDERICKA A MACEK | HENRIETTA-52-017 |
| 018808731 | MORRIS W BICKWEAT | MENDON-54-001 |
| 018933790 | DAVID S GOLDFARB | MENDON-54-002 |
| 020135094 | JANE A FORD | ROCHESTER-24-017 |
| 020213207 | JENNIFER M HEAPHY | WEBSTER-63-005 |
| 022103230 | KAREN J DEVAY | PARMA-56-005 |
| 100063272 | KATELYN C ROORDA | RIGA-60-003 |
| 100071195 | SANTOS E CRUZCARDONA | ROCHESTER-21-001 |
| 100076293 | SARAH J JOHNSTON | BRIGHTON-45-034 |
| 100085470 | TIFFANY L RICE | PENFIELD-57-013 |
| 100087307 | JUSTINE M HAYES | ROCHESTER-25-010 |
| 100098285 | MICHAEL P HAROLD | ROCHESTER-25-012 |
| 100100638 | DRORAH O SETEL | ROCHESTER-26-003 |
| 100104177 | VICTORIA W BAHL | WEBSTER-63-033 |
| 100136357 | AMANDA W MCGINNIS | GATES-49-014 |
| 100143680 | STEPHEN E ROLL | ROCHESTER-17-003 |
| 100150625 | REBECCA L KREUZER | MENDON-54-007 |
| 100166078 | JOANNE Y CORSICA | PERINTON-58-003 |
| 100198725 | EMEM ESTHER IKPOT | ROCHESTER-29-011 |
| 100216869 | ISAIAH A SANTIAGO | ROCHESTER-26-011 |
| 100240133 | RENE M GARCIA | ROCHESTER-22-005 |
| 100278970 | JOSHUA C OWENS | BRIGHTON-45-034 |
| 100298311 | PATRICK M CASEY | ROCHESTER-23-006 |

### Moved members (2)

| Voter ID | Name | From | To |
| --- | --- | --- | --- |
| 018852295 | JOHN PERTICONE | IRONDEQUOIT LT 53 ED 7 | IRONDEQUOIT LT 53 ED 1 |
| 100198749 | CAROLINE A DELANEY | PENFIELD LT 57 ED 1 | PENFIELD LT 57 ED 2 |

### Field changes (7)

Same committee assignment; name or address fields changed:


**100024132** — MILTON J PICHARDO (ROCHESTER LT 26 ED 6)

- `res address1`: "683 RIDGEWAY AVE" → "302 RIVER ST"
- `res zip`: "14615" → "14612"

**015052524** — LORETTA A FEDELE (GREECE LT 50 ED 57)

- `res address1`: "572 BLACK WALNUT DR" → "141 MILL LNDG"
- `res zip`: "14615" → "14626"

**015067656** — PHILIP A FEDELE (GREECE LT 50 ED 57)

- `res address1`: "572 BLACK WALNUT DR" → "141 MILL LNDG"
- `res zip`: "14615" → "14626"

**018278905** — STEVEN W KLAFEHN (HAMLIN LT 51 ED 5)

- `res address1`: "1513 CHURCH RD" → "128 BARRY ST"
- `res city`: "HAMLIN" → "BROCKPORT"
- `res zip`: "14464" → "14420"

**100126318** — MADELINE G CALOGERO (HENRIETTA LT 52 ED 9)

- `res address1`: "11 BONESET TRL APT D" → "27 OAK MILLS XING"
- `res city`: "NORTH CHILI" → "WEST HENRIETTA"
- `res zip`: "14514" → "14586"

**100101525** — CROSS M BAUER (IRONDEQUOIT LT 53 ED 37)

- `res address1`: "420 LAFAYETTE RD" → "89 VAYO ST"

**008786479** — PAULA J RANDALL (RIGA LT 60 ED 2)

- `name`: "REBECCA B WALTHER" → "PAULA J RANDALL"

### Added members (104)

Grouped by committee:

#### BRIGHTON-45-003 (1)

| Voter ID | Name |
| --- | --- |
| 100033862 | AMANDA A ANDERA |

#### BRIGHTON-45-007 (1)

| Voter ID | Name |
| --- | --- |
| 100067752 | ABIGAIL L ROSEN |

#### BRIGHTON-45-009 (2)

| Voter ID | Name |
| --- | --- |
| 002428024 | BRUCE G CONRAD-REINGOLD |
| 100047336 | RACHANA J MARWAHA |

#### BRIGHTON-45-020 (1)

| Voter ID | Name |
| --- | --- |
| 000023511 | JOANNE F KATZMAN |

#### BRIGHTON-45-034 (2)

| Voter ID | Name |
| --- | --- |
| 100380451 | EMILY S OSTER |
| 000255493 | JONATHAN E KYLE |

#### BRIGHTON-45-035 (1)

| Voter ID | Name |
| --- | --- |
| 100254382 | PRIYA SAMPATH |

#### CHILI-46-001 (1)

| Voter ID | Name |
| --- | --- |
| 100006361 | KATHRYN M DAVIS |

#### CHILI-46-005 (1)

| Voter ID | Name |
| --- | --- |
| 100030732 | NANCY J BLUM |

#### CHILI-46-006 (1)

| Voter ID | Name |
| --- | --- |
| 000022302 | JENNIFER M PAXSON |

#### CHILI-46-009 (1)

| Voter ID | Name |
| --- | --- |
| 100080243 | BENJAMIN R BANTA |

#### CHILI-46-017 (1)

| Voter ID | Name |
| --- | --- |
| 100248761 | BARBARA A BOWEN |

#### CHILI-46-022 (1)

| Voter ID | Name |
| --- | --- |
| 100108263 | EMILY A WALLACE-KALOUCH |

#### CHILI-46-024 (1)

| Voter ID | Name |
| --- | --- |
| 100255777 | SAMUEL J WALLACE |

#### EAST ROCHESTER-48-005 (1)

| Voter ID | Name |
| --- | --- |
| 100044299 | DAVID D CIESLINSKI |

#### GATES-49-001 (4)

| Voter ID | Name |
| --- | --- |
| 018535120 | GLORIA A JOHNSON-HOVEY |
| 000174074 | JOSHUA W OSGOOD |
| 100016535 | TRACIE L MCGINNITY |
| 100093873 | VALERIE F FOOTE |

#### GATES-49-006 (1)

| Voter ID | Name |
| --- | --- |
| 020090848 | TERESE M ABRAMS |

#### GATES-49-013 (1)

| Voter ID | Name |
| --- | --- |
| 100061180 | KATHERINE ARISUMI |

#### GREECE-50-001 (1)

| Voter ID | Name |
| --- | --- |
| 100263660 | ISABELA A MULCAHY |

#### GREECE-50-036 (1)

| Voter ID | Name |
| --- | --- |
| 100304148 | IAIN A PHILLIPS |

#### HAMLIN-51-002 (2)

| Voter ID | Name |
| --- | --- |
| 008551452 | LISA A ENGLERT |
| 020001934 | TODD M SCHIRMER |

#### HAMLIN-51-005 (1)

| Voter ID | Name |
| --- | --- |
| 026300208 | JODY G LEVINE |

#### HAMLIN-51-009 (1)

| Voter ID | Name |
| --- | --- |
| 000092338 | NATHAN L TREMBLEY |

#### HENRIETTA-52-006 (1)

| Voter ID | Name |
| --- | --- |
| 100383550 | ALEXANDRA COBB |

#### HENRIETTA-52-025 (1)

| Voter ID | Name |
| --- | --- |
| 100178874 | BIJAYA KHADKA |

#### IRONDEQUOIT-53-003 (1)

| Voter ID | Name |
| --- | --- |
| 000248034 | KILEY L BARZ |

#### IRONDEQUOIT-53-005 (1)

| Voter ID | Name |
| --- | --- |
| 100150799 | MYAH G GONZALEZ |

#### IRONDEQUOIT-53-007 (1)

| Voter ID | Name |
| --- | --- |
| 100308602 | DEBRA D MALONE |

#### IRONDEQUOIT-53-012 (1)

| Voter ID | Name |
| --- | --- |
| 020199881 | GARY G WALKER |

#### IRONDEQUOIT-53-041 (3)

| Voter ID | Name |
| --- | --- |
| 100352502 | ANDREW B PLEWINSKI |
| 018298955 | BRIAN E URQUHART |
| 100116920 | ELLANA C MARCUS |

#### PENFIELD-57-022 (1)

| Voter ID | Name |
| --- | --- |
| 100160926 | CLINTON J SWINGLE |

#### PERINTON-58-009 (1)

| Voter ID | Name |
| --- | --- |
| 000124933 | JOSEPH V THON |

#### PERINTON-58-012 (2)

| Voter ID | Name |
| --- | --- |
| 018153116 | DENISE B FORSTER |
| 100165577 | MICHAEL J ROSENBERG |

#### PERINTON-58-014 (1)

| Voter ID | Name |
| --- | --- |
| 000123046 | LORENA M FIORE |

#### PERINTON-58-018 (1)

| Voter ID | Name |
| --- | --- |
| 018258112 | PETER A BONENFANT |

#### PERINTON-58-023 (2)

| Voter ID | Name |
| --- | --- |
| 000187983 | BEVERLY SCHENKER |
| 000191259 | ERIN KY HECKMAN |

#### PERINTON-58-034 (1)

| Voter ID | Name |
| --- | --- |
| 100166527 | CATHERINE A RICHARDS |

#### PITTSFORD-59-006 (1)

| Voter ID | Name |
| --- | --- |
| 100271862 | CAROLINA TORRES |

#### PITTSFORD-59-007 (1)

| Voter ID | Name |
| --- | --- |
| 100315409 | DARSA P MORROW |

#### PITTSFORD-59-010 (1)

| Voter ID | Name |
| --- | --- |
| 100297765 | DAVID A WILKES |

#### PITTSFORD-59-012 (1)

| Voter ID | Name |
| --- | --- |
| 100089814 | MAXIMILLIAN J GORDON |

#### PITTSFORD-59-021 (1)

| Voter ID | Name |
| --- | --- |
| 000156982 | VIKRAM S DOGRA |

#### PITTSFORD-59-024 (1)

| Voter ID | Name |
| --- | --- |
| 100271755 | BONNIE S MACLEAN |

#### PITTSFORD-59-025 (1)

| Voter ID | Name |
| --- | --- |
| 100069875 | HILARIE C LLOYD |

#### RIGA-60-002 (1)

| Voter ID | Name |
| --- | --- |
| 016191164 | REBECCA B WALTHER |

#### ROCHESTER-17-008 (1)

| Voter ID | Name |
| --- | --- |
| 100071365 | SCARLETT L MARKHAM |

#### ROCHESTER-21-001 (1)

| Voter ID | Name |
| --- | --- |
| 100071418 | GLYNIS E JONES |

#### ROCHESTER-21-003 (1)

| Voter ID | Name |
| --- | --- |
| 100052585 | DAVID S SANCHEZ |

#### ROCHESTER-21-008 (1)

| Voter ID | Name |
| --- | --- |
| 000237720 | GARY R JONES |

#### ROCHESTER-21-014 (1)

| Voter ID | Name |
| --- | --- |
| 008184797 | MILLENA E LATIMER |

#### ROCHESTER-21-019 (3)

| Voter ID | Name |
| --- | --- |
| 000247968 | ALYSSA L KAMM |
| 100059078 | ASHLEY M GROSS |
| 100198718 | KEREEM SA BERRY |

#### ROCHESTER-22-002 (1)

| Voter ID | Name |
| --- | --- |
| 001416202 | DIANE C MCKNIGHT |

#### ROCHESTER-23-001 (1)

| Voter ID | Name |
| --- | --- |
| 100026088 | RACHEL S TAYLOR |

#### ROCHESTER-23-003 (1)

| Voter ID | Name |
| --- | --- |
| 000028347 | KARL M DOBOSZ |

#### ROCHESTER-23-006 (1)

| Voter ID | Name |
| --- | --- |
| 100387573 | EMILIANO BRINI |

#### ROCHESTER-23-012 (1)

| Voter ID | Name |
| --- | --- |
| 100100421 | ALISSA M BRENNAN |

#### ROCHESTER-23-016 (1)

| Voter ID | Name |
| --- | --- |
| 008603238 | MELISSA M SANTIAGO |

#### ROCHESTER-24-015 (1)

| Voter ID | Name |
| --- | --- |
| 000241802 | DANIEL F BRENNAN |

#### ROCHESTER-24-016 (1)

| Voter ID | Name |
| --- | --- |
| 000163026 | BENJAMIN H CLARKE |

#### ROCHESTER-24-019 (1)

| Voter ID | Name |
| --- | --- |
| 000242576 | JOSEPH M LEATHERSICH |

#### ROCHESTER-25-001 (2)

| Voter ID | Name |
| --- | --- |
| 000117757 | CHEFFAN L HAGINS |
| 018543334 | VELMA M MEEKS |

#### ROCHESTER-25-002 (1)

| Voter ID | Name |
| --- | --- |
| 000157854 | MARCUS D HARRIS |

#### ROCHESTER-25-009 (1)

| Voter ID | Name |
| --- | --- |
| 005210892 | THERESA HARRIS |

#### ROCHESTER-25-012 (1)

| Voter ID | Name |
| --- | --- |
| 100027618 | LILIANA M RUIZ |

#### ROCHESTER-25-013 (1)

| Voter ID | Name |
| --- | --- |
| 100123365 | MARION J GREEN |

#### ROCHESTER-25-016 (2)

| Voter ID | Name |
| --- | --- |
| 100116617 | FREEMONTA L STRONG |
| 100065504 | JLA H JONES |

#### ROCHESTER-26-003 (1)

| Voter ID | Name |
| --- | --- |
| 100006047 | MIQUEL A POWELL |

#### ROCHESTER-27-002 (2)

| Voter ID | Name |
| --- | --- |
| 014158887 | DANIEL J DEMARLE |
| 000192811 | JAMON R MEEKS |

#### ROCHESTER-27-006 (2)

| Voter ID | Name |
| --- | --- |
| 008849132 | JOSIE T MCCLARY |
| 100336599 | KAREEMBA MCCULLOUGH |

#### ROCHESTER-27-007 (1)

| Voter ID | Name |
| --- | --- |
| 002148532 | KAREN V EMERSON |

#### ROCHESTER-27-011 (3)

| Voter ID | Name |
| --- | --- |
| 022185150 | LASHUNDA C LESLIE-SMITH |
| 000198388 | MONTGOMERY BRYANT |
| 008196080 | MOTASHIA H SMITH |

#### RUSH-61-001 (3)

| Voter ID | Name |
| --- | --- |
| 018969868 | AMBER W CORBIN |
| 012003518 | MARY ELLEN HEYMAN |
| 100068410 | SUSAN M GATTA |

#### RUSH-61-002 (1)

| Voter ID | Name |
| --- | --- |
| 002413455 | KELLI JO EBERLE |

#### RUSH-61-004 (1)

| Voter ID | Name |
| --- | --- |
| 008449972 | JEANNE E MORELLI |

#### SWEDEN-62-003 (3)

| Voter ID | Name |
| --- | --- |
| 100189407 | JASMINE L GREEN |
| 015732485 | MARGARET B BLACKMAN |
| 018918046 | MARGARET L LAPIERRE |

#### SWEDEN-62-005 (1)

| Voter ID | Name |
| --- | --- |
| 100359226 | AMEELIA AA CAMBRIDGE |

#### SWEDEN-62-011 (1)

| Voter ID | Name |
| --- | --- |
| 000259582 | KATHERINE A MARKHAM |

#### WEBSTER-63-006 (1)

| Voter ID | Name |
| --- | --- |
| 100002895 | BRANDON P NUGENT |

#### WEBSTER-63-008 (1)

| Voter ID | Name |
| --- | --- |
| 100256696 | MARIANE D RANDALL |

#### WEBSTER-63-029 (2)

| Voter ID | Name |
| --- | --- |
| 018157462 | MARY S VETTER |
| 018586688 | SVEN VETTER |

#### WEBSTER-63-033 (1)

| Voter ID | Name |
| --- | --- |
| 000174910 | ALEXANDER B SCIALDONE |

#### WHEATLAND-64-001 (1)

| Voter ID | Name |
| --- | --- |
| 000091222 | KERRY K HALLOCK |

---

## Committee Changes

### New committees (16)

| Committee | Members in 2026 |
| --- | --- |
| CHILI-46-001 | 1 |
| CHILI-46-006 | 1 |
| CHILI-46-009 | 1 |
| CHILI-46-017 | 1 |
| CHILI-46-024 | 1 |
| GATES-49-001 | 4 |
| GATES-49-006 | 1 |
| GATES-49-013 | 1 |
| PERINTON-58-009 | 1 |
| PERINTON-58-012 | 2 |
| PERINTON-58-023 | 2 |
| PITTSFORD-59-007 | 1 |
| SWEDEN-62-003 | 3 |
| SWEDEN-62-005 | 1 |
| WEBSTER-63-006 | 1 |
| WEBSTER-63-008 | 1 |

### Disbanded committees (2)

| Committee | Members in 2025 |
| --- | --- |
| PARMA-56-005 | 1 |
| PENFIELD-57-013 | 1 |

### Largest membership size changes (top 20)

| Committee | 2025 | 2026 | Delta |
| --- | --- | --- | --- |
| GATES-49-001 | 0 | 4 | +4 |
| ROCHESTER-21-019 | 1 | 4 | +3 |
| ROCHESTER-27-011 | 1 | 4 | +3 |
| RUSH-61-001 | 1 | 4 | +3 |
| SWEDEN-62-003 | 0 | 3 | +3 |
| ROCHESTER-25-016 | 2 | 4 | +2 |
| ROCHESTER-26-011 | 4 | 2 | -2 |
| ROCHESTER-27-002 | 2 | 4 | +2 |
| ROCHESTER-27-006 | 1 | 3 | +2 |
| ROCHESTER-28-006 | 4 | 2 | -2 |
| BRIGHTON-45-009 | 2 | 4 | +2 |
| GREECE-50-098 | 4 | 2 | -2 |
| HAMLIN-51-002 | 1 | 3 | +2 |
| WEBSTER-63-029 | 2 | 4 | +2 |
| PERINTON-58-012 | 0 | 2 | +2 |
| PERINTON-58-023 | 0 | 2 | +2 |
| ROCHESTER-17-003 | 4 | 3 | -1 |
| ROCHESTER-17-008 | 3 | 4 | +1 |
| ROCHESTER-21-003 | 2 | 3 | +1 |
| ROCHESTER-21-008 | 3 | 4 | +1 |

Total committees with size changes: **93**.

---

## Data Quality Notes

### Duplicate voter IDs in 2025 file (2)


**Voter ID `100058195`** (2 rows):

| Row | Name | Committee | Raw Committee |
| --- | --- | --- | --- |
| 443 | BRENDON V BOUPHACHAY | ROCHESTER-28-004 | LD 028 |
| 788 | BRENDON V BOUPHACHAY | GATES-49-015 | Gates |

**Voter ID `008786479`** (2 rows):

| Row | Name | Committee | Raw Committee |
| --- | --- | --- | --- |
| 1414 | REBECCA B WALTHER | RIGA-60-002 | Riga |
| 1415 | PAULA J RANDALL | RIGA-60-002 | Riga |

- `100058195`: Same person on **two different committees** (Rochester LD 28 and Gates). In a bulk load keyed by voter ID, only one assignment would win (last row in file).
- `008786479`: **Two different names** on the same committee (Riga LT 60 ED 2). The 2026 file resolves this to Paula J Randall only; the diff shows a name field change for this voter ID.

### 2026 file

- Duplicate voter IDs: **0**
- Invalid rows (missing voter id or Serve LT/ED): **0**

---

## Bulk Load Implications

`bulkLoadUtils.ts` is currently configured to load the **2026 file** (`data/Committee File 2026-04-16(1).xlsx`).

If bulk load were run against the 2026 export:

| Effect | Approx. count |
| --- | ---: |
| New committee assignments | 104 |
| Members no longer on any committee | 43 |
| Committee moves within file | 2 |
| Address/name discrepancies vs `VoterRecord` | 7 (+ any not in voter file) |

New 2026 columns (`dob`, `Serve *`) are ignored by import. The existing `pnpm compare-committees` script fails on the 2025 file due to duplicate voter IDs; this report used a duplicate-tolerant analysis instead.

---

## Appendix: Reproduce

```bash
pnpm exec tsx scripts/generate-committee-diff-report.ts > committee-diff.json
```

Script: [`scripts/generate-committee-diff-report.ts`](../scripts/generate-committee-diff-report.ts)
