# Committee File Diff: 2025 vs 2026

Generated: 2026-05-31

Compares:
- **Old:** `apps/frontend/data/Committee-File-2025-05-15.xlsx` (May 15, 2025)
- **New:** `apps/frontend/data/Committee File 2026-04-16(1).xlsx` (April 16, 2026)

> **Members are pseudonymized.** Committee rosters are voter records, so every voter ID
> in this report is written as `V001`… and every member name as `Member 001`…, each label
> stable throughout the document. Street addresses are redacted; city and ZIP values are
> kept because the changes between them are the point. The labels are report-local — they
> are not derived from the real values and cannot be reversed into them.

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
| V001 | Member 001 | IRONDEQUOIT-53-007 |
| V002 | Member 002 | ROCHESTER-25-001 |
| V003 | Member 003 | ROCHESTER-24-012 |
| V004 | Member 004 | IRONDEQUOIT-53-005 |
| V005 | Member 005 | BRIGHTON-45-021 |
| V006 | Member 006 | CHILI-46-022 |
| V007 | Member 007 | IRONDEQUOIT-53-041 |
| V008 | Member 008 | BRIGHTON-45-020 |
| V009 | Member 009 | BRIGHTON-45-035 |
| V010 | Member 010 | ROCHESTER-23-016 |
| V011 | Member 011 | IRONDEQUOIT-53-041 |
| V012 | Member 012 | ROCHESTER-25-017 |
| V013 | Member 013 | ROCHESTER-28-006 |
| V014 | Member 014 | ROCHESTER-28-006 |
| V015 | Member 015 | RIGA-60-004 |
| V016 | Member 016 | ROCHESTER-26-011 |
| V017 | Member 017 | IRONDEQUOIT-53-003 |
| V018 | Member 018 | ROCHESTER-24-015 |
| V019 | Member 019 | GREECE-50-098 |
| V020 | Member 020 | GREECE-50-098 |
| V021 | Member 021 | HENRIETTA-52-017 |
| V022 | Member 022 | MENDON-54-001 |
| V023 | Member 023 | MENDON-54-002 |
| V024 | Member 024 | ROCHESTER-24-017 |
| V025 | Member 025 | WEBSTER-63-005 |
| V026 | Member 026 | PARMA-56-005 |
| V027 | Member 027 | RIGA-60-003 |
| V028 | Member 028 | ROCHESTER-21-001 |
| V029 | Member 029 | BRIGHTON-45-034 |
| V030 | Member 030 | PENFIELD-57-013 |
| V031 | Member 031 | ROCHESTER-25-010 |
| V032 | Member 032 | ROCHESTER-25-012 |
| V033 | Member 033 | ROCHESTER-26-003 |
| V034 | Member 034 | WEBSTER-63-033 |
| V035 | Member 035 | GATES-49-014 |
| V036 | Member 036 | ROCHESTER-17-003 |
| V037 | Member 037 | MENDON-54-007 |
| V038 | Member 038 | PERINTON-58-003 |
| V039 | Member 039 | ROCHESTER-29-011 |
| V040 | Member 040 | ROCHESTER-26-011 |
| V041 | Member 041 | ROCHESTER-22-005 |
| V042 | Member 042 | BRIGHTON-45-034 |
| V043 | Member 043 | ROCHESTER-23-006 |

### Moved members (2)

| Voter ID | Name | From | To |
| --- | --- | --- | --- |
| V044 | Member 044 | IRONDEQUOIT LT 53 ED 7 | IRONDEQUOIT LT 53 ED 1 |
| V045 | Member 045 | PENFIELD LT 57 ED 1 | PENFIELD LT 57 ED 2 |

### Field changes (7)

Same committee assignment; name or address fields changed:


**V046** — Member 046 (ROCHESTER LT 26 ED 6)

- `res address1`: changed (value redacted)
- `res zip`: "14615" → "14612"

**V047** — Member 047 (GREECE LT 50 ED 57)

- `res address1`: changed (value redacted)
- `res zip`: "14615" → "14626"

**V048** — Member 048 (GREECE LT 50 ED 57)

- `res address1`: changed (value redacted)
- `res zip`: "14615" → "14626"

**V049** — Member 049 (HAMLIN LT 51 ED 5)

- `res address1`: changed (value redacted)
- `res city`: "HAMLIN" → "BROCKPORT"
- `res zip`: "14464" → "14420"

**V050** — Member 050 (HENRIETTA LT 52 ED 9)

- `res address1`: changed (value redacted)
- `res city`: "NORTH CHILI" → "WEST HENRIETTA"
- `res zip`: "14514" → "14586"

**V051** — Member 051 (IRONDEQUOIT LT 53 ED 37)

- `res address1`: changed (value redacted)

**V052** — Member 052 (RIGA LT 60 ED 2)

- `name`: "Member 053" → "Member 052"

### Added members (104)

Grouped by committee:

#### BRIGHTON-45-003 (1)

| Voter ID | Name |
| --- | --- |
| V053 | Member 054 |

#### BRIGHTON-45-007 (1)

| Voter ID | Name |
| --- | --- |
| V054 | Member 055 |

#### BRIGHTON-45-009 (2)

| Voter ID | Name |
| --- | --- |
| V055 | Member 056 |
| V056 | Member 057 |

#### BRIGHTON-45-020 (1)

| Voter ID | Name |
| --- | --- |
| V057 | Member 058 |

#### BRIGHTON-45-034 (2)

| Voter ID | Name |
| --- | --- |
| V058 | Member 059 |
| V059 | Member 060 |

#### BRIGHTON-45-035 (1)

| Voter ID | Name |
| --- | --- |
| V060 | Member 061 |

#### CHILI-46-001 (1)

| Voter ID | Name |
| --- | --- |
| V061 | Member 062 |

#### CHILI-46-005 (1)

| Voter ID | Name |
| --- | --- |
| V062 | Member 063 |

#### CHILI-46-006 (1)

| Voter ID | Name |
| --- | --- |
| V063 | Member 064 |

#### CHILI-46-009 (1)

| Voter ID | Name |
| --- | --- |
| V064 | Member 065 |

#### CHILI-46-017 (1)

| Voter ID | Name |
| --- | --- |
| V065 | Member 066 |

#### CHILI-46-022 (1)

| Voter ID | Name |
| --- | --- |
| V066 | Member 067 |

#### CHILI-46-024 (1)

| Voter ID | Name |
| --- | --- |
| V067 | Member 068 |

#### EAST ROCHESTER-48-005 (1)

| Voter ID | Name |
| --- | --- |
| V068 | Member 069 |

#### GATES-49-001 (4)

| Voter ID | Name |
| --- | --- |
| V069 | Member 070 |
| V070 | Member 071 |
| V071 | Member 072 |
| V072 | Member 073 |

#### GATES-49-006 (1)

| Voter ID | Name |
| --- | --- |
| V073 | Member 074 |

#### GATES-49-013 (1)

| Voter ID | Name |
| --- | --- |
| V074 | Member 075 |

#### GREECE-50-001 (1)

| Voter ID | Name |
| --- | --- |
| V075 | Member 076 |

#### GREECE-50-036 (1)

| Voter ID | Name |
| --- | --- |
| V076 | Member 077 |

#### HAMLIN-51-002 (2)

| Voter ID | Name |
| --- | --- |
| V077 | Member 078 |
| V078 | Member 079 |

#### HAMLIN-51-005 (1)

| Voter ID | Name |
| --- | --- |
| V079 | Member 080 |

#### HAMLIN-51-009 (1)

| Voter ID | Name |
| --- | --- |
| V080 | Member 081 |

#### HENRIETTA-52-006 (1)

| Voter ID | Name |
| --- | --- |
| V081 | Member 082 |

#### HENRIETTA-52-025 (1)

| Voter ID | Name |
| --- | --- |
| V082 | Member 083 |

#### IRONDEQUOIT-53-003 (1)

| Voter ID | Name |
| --- | --- |
| V083 | Member 084 |

#### IRONDEQUOIT-53-005 (1)

| Voter ID | Name |
| --- | --- |
| V084 | Member 085 |

#### IRONDEQUOIT-53-007 (1)

| Voter ID | Name |
| --- | --- |
| V085 | Member 086 |

#### IRONDEQUOIT-53-012 (1)

| Voter ID | Name |
| --- | --- |
| V086 | Member 087 |

#### IRONDEQUOIT-53-041 (3)

| Voter ID | Name |
| --- | --- |
| V087 | Member 088 |
| V088 | Member 089 |
| V089 | Member 090 |

#### PENFIELD-57-022 (1)

| Voter ID | Name |
| --- | --- |
| V090 | Member 091 |

#### PERINTON-58-009 (1)

| Voter ID | Name |
| --- | --- |
| V091 | Member 092 |

#### PERINTON-58-012 (2)

| Voter ID | Name |
| --- | --- |
| V092 | Member 093 |
| V093 | Member 094 |

#### PERINTON-58-014 (1)

| Voter ID | Name |
| --- | --- |
| V094 | Member 095 |

#### PERINTON-58-018 (1)

| Voter ID | Name |
| --- | --- |
| V095 | Member 096 |

#### PERINTON-58-023 (2)

| Voter ID | Name |
| --- | --- |
| V096 | Member 097 |
| V097 | Member 098 |

#### PERINTON-58-034 (1)

| Voter ID | Name |
| --- | --- |
| V098 | Member 099 |

#### PITTSFORD-59-006 (1)

| Voter ID | Name |
| --- | --- |
| V099 | Member 100 |

#### PITTSFORD-59-007 (1)

| Voter ID | Name |
| --- | --- |
| V100 | Member 101 |

#### PITTSFORD-59-010 (1)

| Voter ID | Name |
| --- | --- |
| V101 | Member 102 |

#### PITTSFORD-59-012 (1)

| Voter ID | Name |
| --- | --- |
| V102 | Member 103 |

#### PITTSFORD-59-021 (1)

| Voter ID | Name |
| --- | --- |
| V103 | Member 104 |

#### PITTSFORD-59-024 (1)

| Voter ID | Name |
| --- | --- |
| V104 | Member 105 |

#### PITTSFORD-59-025 (1)

| Voter ID | Name |
| --- | --- |
| V105 | Member 106 |

#### RIGA-60-002 (1)

| Voter ID | Name |
| --- | --- |
| V106 | Member 053 |

#### ROCHESTER-17-008 (1)

| Voter ID | Name |
| --- | --- |
| V107 | Member 107 |

#### ROCHESTER-21-001 (1)

| Voter ID | Name |
| --- | --- |
| V108 | Member 108 |

#### ROCHESTER-21-003 (1)

| Voter ID | Name |
| --- | --- |
| V109 | Member 109 |

#### ROCHESTER-21-008 (1)

| Voter ID | Name |
| --- | --- |
| V110 | Member 110 |

#### ROCHESTER-21-014 (1)

| Voter ID | Name |
| --- | --- |
| V111 | Member 111 |

#### ROCHESTER-21-019 (3)

| Voter ID | Name |
| --- | --- |
| V112 | Member 112 |
| V113 | Member 113 |
| V114 | Member 114 |

#### ROCHESTER-22-002 (1)

| Voter ID | Name |
| --- | --- |
| V115 | Member 115 |

#### ROCHESTER-23-001 (1)

| Voter ID | Name |
| --- | --- |
| V116 | Member 116 |

#### ROCHESTER-23-003 (1)

| Voter ID | Name |
| --- | --- |
| V117 | Member 117 |

#### ROCHESTER-23-006 (1)

| Voter ID | Name |
| --- | --- |
| V118 | Member 118 |

#### ROCHESTER-23-012 (1)

| Voter ID | Name |
| --- | --- |
| V119 | Member 119 |

#### ROCHESTER-23-016 (1)

| Voter ID | Name |
| --- | --- |
| V120 | Member 120 |

#### ROCHESTER-24-015 (1)

| Voter ID | Name |
| --- | --- |
| V121 | Member 121 |

#### ROCHESTER-24-016 (1)

| Voter ID | Name |
| --- | --- |
| V122 | Member 122 |

#### ROCHESTER-24-019 (1)

| Voter ID | Name |
| --- | --- |
| V123 | Member 123 |

#### ROCHESTER-25-001 (2)

| Voter ID | Name |
| --- | --- |
| V124 | Member 124 |
| V125 | Member 125 |

#### ROCHESTER-25-002 (1)

| Voter ID | Name |
| --- | --- |
| V126 | Member 126 |

#### ROCHESTER-25-009 (1)

| Voter ID | Name |
| --- | --- |
| V127 | Member 127 |

#### ROCHESTER-25-012 (1)

| Voter ID | Name |
| --- | --- |
| V128 | Member 128 |

#### ROCHESTER-25-013 (1)

| Voter ID | Name |
| --- | --- |
| V129 | Member 129 |

#### ROCHESTER-25-016 (2)

| Voter ID | Name |
| --- | --- |
| V130 | Member 130 |
| V131 | Member 131 |

#### ROCHESTER-26-003 (1)

| Voter ID | Name |
| --- | --- |
| V132 | Member 132 |

#### ROCHESTER-27-002 (2)

| Voter ID | Name |
| --- | --- |
| V133 | Member 133 |
| V134 | Member 134 |

#### ROCHESTER-27-006 (2)

| Voter ID | Name |
| --- | --- |
| V135 | Member 135 |
| V136 | Member 136 |

#### ROCHESTER-27-007 (1)

| Voter ID | Name |
| --- | --- |
| V137 | Member 137 |

#### ROCHESTER-27-011 (3)

| Voter ID | Name |
| --- | --- |
| V138 | Member 138 |
| V139 | Member 139 |
| V140 | Member 140 |

#### RUSH-61-001 (3)

| Voter ID | Name |
| --- | --- |
| V141 | Member 141 |
| V142 | Member 142 |
| V143 | Member 143 |

#### RUSH-61-002 (1)

| Voter ID | Name |
| --- | --- |
| V144 | Member 144 |

#### RUSH-61-004 (1)

| Voter ID | Name |
| --- | --- |
| V145 | Member 145 |

#### SWEDEN-62-003 (3)

| Voter ID | Name |
| --- | --- |
| V146 | Member 146 |
| V147 | Member 147 |
| V148 | Member 148 |

#### SWEDEN-62-005 (1)

| Voter ID | Name |
| --- | --- |
| V149 | Member 149 |

#### SWEDEN-62-011 (1)

| Voter ID | Name |
| --- | --- |
| V150 | Member 150 |

#### WEBSTER-63-006 (1)

| Voter ID | Name |
| --- | --- |
| V151 | Member 151 |

#### WEBSTER-63-008 (1)

| Voter ID | Name |
| --- | --- |
| V152 | Member 152 |

#### WEBSTER-63-029 (2)

| Voter ID | Name |
| --- | --- |
| V153 | Member 153 |
| V154 | Member 154 |

#### WEBSTER-63-033 (1)

| Voter ID | Name |
| --- | --- |
| V155 | Member 155 |

#### WHEATLAND-64-001 (1)

| Voter ID | Name |
| --- | --- |
| V156 | Member 156 |

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


**Voter ID `V157`** (2 rows):

| Row | Name | Committee | Raw Committee |
| --- | --- | --- | --- |
| 443 | Member 157 | ROCHESTER-28-004 | LD 028 |
| 788 | Member 157 | GATES-49-015 | Gates |

**Voter ID `V052`** (2 rows):

| Row | Name | Committee | Raw Committee |
| --- | --- | --- | --- |
| 1414 | Member 053 | RIGA-60-002 | Riga |
| 1415 | Member 052 | RIGA-60-002 | Riga |

- `V157`: Same person on **two different committees** (Rochester LD 28 and Gates). In a bulk load keyed by voter ID, only one assignment would win (last row in file).
- `V052`: **Two different names** on the same committee (Riga LT 60 ED 2). The 2026 file resolves this to Member 052 only; the diff shows a name field change for this voter ID.

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

The script reads the local (gitignored) data directory and its JSON output carries
real names, addresses and voter IDs. Pseudonymize before committing anything derived
from it, as this report is; do not commit `committee-diff.json` itself.

Script: [`scripts/generate-committee-diff-report.ts`](../scripts/generate-committee-diff-report.ts)
