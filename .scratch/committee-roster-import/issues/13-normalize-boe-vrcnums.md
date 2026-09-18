# 13: Normalize BOE VRCNUMs before roster reconciliation

**Status:** resolved

**Priority:** P1 — blocks applying the 2026–2028 roster

## Problem

The BOE roster represents VRCNUMs without their leading zeroes, while the voter table stores the
canonical identifier as a nine-digit string. The importer currently passes the source value through
unchanged, so the dry run matches only 406 of 1,470 roster entries and incorrectly reports 1,064
missing voters.

A read-only comparison against the 2026 dev voter file showed that padding to nine digits recovers
1,061 of those records without any collisions. The corrected comparison finds 1,467 voters, leaving
three genuinely missing voters and 41 records with name/address/ZIP differences.

## Change

Normalize the VRCNUM inside the `boe-elected-list` parser, before constructing the canonical
`RosterEntry`:

- Accept only one through nine decimal digits after trimming.
- Left-pad valid values with zeroes to exactly nine digits.
- Leave an already nine-digit value unchanged.
- Reject a row with its `sourceRow` when the value is empty, non-numeric, or longer than nine digits.

Planning, discrepancy creation, membership writes, and audit metadata must all receive the normalized
identifier. Do not change stored voter identifiers or add fuzzy matching in the importer.

## Tests and verification

- Parser tests cover a short numeric VRCNUM, an already canonical VRCNUM, non-numeric input, and an
  overlong value.
- Existing comma- and tab-delimited fixtures continue to parse with the same row counts and committee
  assignments.
- The real local roster still parses 1,470 entries with zero rejected rows.
- Against the current dev voter file, a dry run reports 1,467 matched voters and only three
  missing-VRCNUM discrepancies. Field discrepancies remain visible rather than being normalized away.
- `dryRun: true` performs no writes, and the existing importer, response-contract, and discrepancy
  tests remain green.

## Out of scope

- Rewriting historical voter or committee data.
- Automatically resolving the three genuinely missing voters or the remaining field discrepancies.
- General fuzzy identifier matching or changing the canonical `RosterEntry` shape.

## Comments

Done. `parseBoeElectedList` now normalizes column 1 before constructing a `RosterEntry`:
trimmed 1–9 digit values are left-padded to nine digits, an already nine-digit value is
unchanged, and empty / non-numeric / overlong values reject that row with its `sourceRow`.
Planning, discrepancies, memberships and audit metadata keep consuming `entry.vrcnum`, so
they all receive the canonical identifier without importer-side matching.

Parser tests cover a short numeric VRCNUM (`12345` → `000012345`), an already canonical
value, non-numeric input, and a ten-digit value. The comma- and tab-delimited fixtures still
parse with the same row counts and committee assignments.

Verified against the real local files, counts only: both the delivered `.txt` and converted
`.csv` parse to 1,470 entries and 0 rejections. A `planRosterImport` dry run against the
current dev voter file reports `matchedVoters: 1467`, 3 missing-VRCNUM discrepancies, and 41
records that still have name/address/ZIP field differences (44 discrepancies in total).
Membership and discrepancy table counts were unchanged by the dry run (1,496 / 62).
Neither real file is in Git.
