# 05: Parser for the Board of Elections elected-list format

**What to build:** The 2026–2028 roster as delivered by the county Board of Elections parses
into canonical entries, so an Admin does not have to hand-convert it into the previous format.

This file is the reason the whole spec exists: it passes every structural check while being
semantically misaligned. Its header row declares 52 columns and all 1470 data rows have 52
fields, but the names do not line up with the values — column 1 is headed `voter` and holds the
VRCNUM, column 2 is headed `id` and holds the full name, and the five declared `res addressN`
slots correspond to only two in the data. Read by header name, `claimed.name` is a street
address and `claimed.city` is empty for every row, and the import would flag all 1470 members
as discrepancies and remove every existing membership.

So this parser reads fixed column positions and validates the shape rather than trusting the
header. Positions (1-based): 1 VRCNUM, 2 full name, 3 residential address line 1, 5 residential
city, 6 residential state, 7 residential zip, 25 official type, 26 office name. Before trusting
those positions it must assert the file's shape and throw if the assertion fails: a uniform
field count across all rows, and every data row's office-name field matching the
committee-identity pattern. A file whose header row merely declares the expected names must not
be accepted on that basis.

Committee identity comes out of the office-name field, which has the form `TOWN/LT/ED-CC-Party`
(e.g. `PERINTON/058/014-CC-Democratic`): split on `/`, take the town verbatim, strip the
trailing `-CC-<party>` from the election-district segment, and parse both zero-padded district
segments as base 10. Town names arrive uppercase and spelled out for every town including
Rochester, so this parser needs no Rochester special case. `official type` is `ELECTED` for
every row in the delivered file and maps to `PETITIONED`; an appointed-equivalent value is
mapped if present, and an unrecognized value rejects the row.

Registers as `boe-elected-list` with status `current`.

**Blocked by:** 01

**Status:** resolved

- [x] `boe-elected-list` is registered as `current` and parses the delivered file into canonical
      entries
- [x] The parser reads by column position, and asserts uniform field count and office-name
      pattern across data rows before trusting them; it throws when either assertion fails
- [x] A file of another format submitted under this identifier throws rather than producing
      entries, and a header row declaring the expected names is not on its own sufficient to
      accept a file
- [x] Committee identity is parsed out of the office-name field, districts parsed base 10 from
      their zero-padded form, with no Rochester special case
- [x] `ELECTED` maps to `PETITIONED`; an unrecognized official type rejects the row with its row
      number rather than throwing
- [x] A committed fixture holds a genuine excerpt of the real file, roughly twenty rows,
      preserving the original header row, delimiter, padding and quirks verbatim
- [x] A regression test asserts that for a row where a header-keyed read would have yielded an
      address for `claimed.name` and an empty `claimed.city`, the parser yields a person's name
      and a city

## Comments

`boeElectedList.ts`, registered as `boe-elected-list` / `current`. Reads by 1-based column
position (1 VRCNUM, 2 name, 3 address1, 5 city, 6 state, 7 zip, 25 official type,
26 office name) behind a whole-file shape assertion that throws before any position is
trusted: at least one data row; header field count at least 26; every data row's field
count equal to the header's; and every data row's position-26 value matching
`TOWN/LT/ED-CC-Party`. The last check is what catches a file carrying the right header
names over the wrong data — the failure mode that motivates the spec.

- Verified against the real delivered file: 1470 entries, 0 rejections, 21 distinct towns,
  every row `ELECTED` → `PETITIONED`. `ROCHESTER` comes through the ordinary path with no
  special case.
- **Quirk found in the real file:** party casing in the office name is inconsistent —
  both `ROCHESTER/025/014-CC-Democratic` and `ROCHESTER/017/005-CC-DEMOCRATIC` occur. The
  pattern and the `-CC-<party>` strip are case-agnostic, so both parse identically; a
  literal `-CC-Democratic` match would have rejected real rows.
- The regression test computes the header-keyed reading inline and asserts it yields
  `"1 BRIARWOOD CIR"` for `name` and `""` for `res city`, then asserts the parser yields
  `"AVERY C LINDHOLM"` / `"FAIRPORT"` — so a future reader sees why reading by position is
  mandatory rather than stylistic.
- A test proves the header row alone is not evidence: the delivered header over another
  format's data row padded to 52 fields passes the uniform-count check and is caught only
  by the office-name assertion.
- The parser strips a BOM, accepts CRLF and drops trailing blank lines, though the
  delivered file has none of those.
