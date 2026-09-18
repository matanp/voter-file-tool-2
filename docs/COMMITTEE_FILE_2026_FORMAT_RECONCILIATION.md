# Reconciling the 2026-2028 Committee File with `bulkLoadCommittees`

**New file:** `data/Elected County Committee List 2026 - 2028 .txt`
**Format:** tab-delimited `.txt` (BOE "Elected County Committee List" export), 1471 lines
**Old file:** `apps/frontend/data/Committee-File-2025-05-15.xlsx`

## tl;dr

Not a drop-in replacement, but the mismatch is smaller than it first looks. The
discrepancy-detection logic needs **no changes** — its field names happen to
match the new file's headers exactly. What actually needs to change is the
loader's file format and its committee-identity parsing (`Committee` /
`Serve LT` / `Serve ED` columns don't exist in the new file).

## Current loader expectations

`apps/frontend/src/app/api/admin/bulkLoadCommittees/bulkLoadUtils.ts:121-179`:

- Hardcoded path: `data/Committee File 2026-04-16(1).xlsx`, read via `xlsx.read()`.
- Per row, expects:
  - `row.Committee` — town name; `"LD "` substring in it means "Rochester"
  - `row["Serve LT"]` — legislative district (number)
  - `row["Serve ED"]` — election district (number)
  - `row["voter id"]` — VRCNUM (string PK on `VoterRecord`)

None of these four columns exist in the new file.

## New file's header

```
voter  id  name  res address1  res address2  res address3  res address4  res address5
res city  res state  res zip  res zipplus4  mail address1 ... office name  election
nameprefix  firstname  middlename  lastname  namesuffix  ...
```

Sample row:
```
8046793  BASIL C BARRETT   1 BRIMFIELD CIR    FAIRPORT  NY  14450  ...
Democratic  M  7/1/2026  6/30/2028  ELECTED  PERINTON/058/014-CC-Democratic
PRIMARY ELECTION 2026  BASIL  C  BARRETT ...
```

### Gotcha: `voter` / `id` header naming is misleading

- `voter` (1st column) holds the **numeric VRCNUM-like ID** (e.g. `8046793`).
- `id` (2nd column) holds the **person's full name** (e.g. `BASIL C BARRETT`).

Confirmed consistent across multiple sample sections of the file (not just the
first few rows). Old loader code reads `row["voter id"]` (a single xlsx
column header with a space in it) — that doesn't exist here. The VRCNUM
equivalent in the new file is `row["voter"]`, not `row["id"]`.

### Committee identity is packed into `office name`

No separate `Committee` / `Serve LT` / `Serve ED` columns. Instead:

```
office name = "PERINTON/058/014-CC-Democratic"
            =  TOWN   /  LT  /  ED  -CC-PARTY
```

Split on `/`, then strip the trailing `-CC-<Party>` suffix from the ED segment.

Checked multiple Rochester rows specifically (since the old file used an
`"LD "`-substring heuristic to special-case Rochester): the new file spells
`ROCHESTER` out directly in `office name` for every Rochester row sampled
(e.g. `ROCHESTER/025/014-CC-Democratic`, `ROCHESTER/027/009-CC-Democratic`).
So the old `row.Committee?.includes("LD ")` → "Rochester" special case does
not apply to this file format — town names come through plainly for every
town, including Rochester. This is simpler to handle than the old format, not
harder.

## `findDiscrepancies` — no changes needed

`apps/frontend/src/app/api/lib/utils.ts:89-95`:

```ts
const DISCREPENCY_FIELDS = [
  { incomingField: "name", existingField: getName },
  { incomingField: "res address1", existingField: getAddress },
  { incomingField: "res city", existingField: "city" },
  { incomingField: "res state", existingField: "state" },
  { incomingField: "res zip", existingField: "zipCode" },
] as const;
```

All five `incomingField` names (`name`, `res address1`, `res city`,
`res state`, `res zip`) match the new file's headers verbatim.

- `name` vs. `getName()` (`"FIRSTNAME MIDDLEINITIAL LASTNAME"`): sample
  `"BASIL C BARRETT "` → normalized via `.split(" ").filter(Boolean).join(" ")`
  → `"BASIL C BARRETT"`. Matches.
- `res address1` vs. `getAddress()` (`"{houseNum} {street}{ APT n}"`): sample
  `"1 BRIMFIELD CIR"`. Matches.
- `res city` / `res state` / `res zip` — plain string compares against
  `city` / `state` / `zipCode`. Sample `FAIRPORT` / `NY` / `14450`. Matches
  (5-digit zip, no leading-zero concern for Monroe County towns).

This is likely because both files ultimately derive from the same underlying
BOE export system, even though the committee-membership columns differ.

## What actually needs to change

1. **File format/path** — loader hardcodes an `.xlsx` filename and reads via
   `xlsx.read()`. `xlsx.read()` can parse TSV/CSV buffers directly, so this is
   a small change (swap the path, confirm delimiter detection), not a rewrite.
2. **VRCNUM column** — read `row["voter"]` instead of `row["voter id"]`.
3. **Committee identity parsing** — replace the `row.Committee` /
   `row["Serve LT"]` / `row["Serve ED"]` reads with a parse of `office name`:
   split on `/` for town/LT/ED, strip `-CC-<Party>` from the ED segment.
   Drop the `"LD "` → Rochester special case; not needed for this file.
4. No changes needed to `findDiscrepancies` / `DISCREPENCY_FIELDS`.

## Open items before writing the mapping code

- Spot-check a few more distinct sections of the file (different towns/wards)
  to make sure `voter`/`id` column meaning and the `office name` `TOWN/LT/ED-CC-Party`
  pattern hold everywhere, not just in the sampled rows.
- Confirm whether `election` (`"PRIMARY ELECTION 2026"`) or `Sworn In`/`expired`
  dates need to feed into `CommitteeList`/term logic, or are safe to ignore for
  this import.
