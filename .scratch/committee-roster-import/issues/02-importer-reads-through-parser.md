# 02: The importer reads through the parser and compares named fields

**What to build:** The import produces exactly the results it produces today, but it no longer
knows anything about column names. It obtains canonical entries from the archived parser and
reconciles from those; the discrepancy comparison receives the entry's `claimed` object rather
than a raw source row plus a list of source-column-to-voter-field pairs.

This is the change that stops each future format change from being absorbed by editing shared
reconciliation logic in place — the reason the previous format is now unreadable. The
comparison helper's historical commented-out column list is deleted rather than revived.

Behaviour is deliberately unchanged: the same five fields are compared against the same
voter-file counterparts, the existing whitespace-collapsing normalization is preserved, and
the discrepancy record's stored keys keep their current names so discrepancy resolution and its
audit metadata are unaffected. Rows the parser rejected are surfaced rather than silently
dropped, and a single rejected row does not abort the import.

**Blocked by:** 01

**Status:** resolved

- [x] The importer takes canonical entries and no longer reads column names, file paths, or a
      workbook library directly
- [x] The discrepancy comparison takes named, already-mapped fields and compares each against
      its voter-file counterpart; the commented-out historical field list is gone
- [x] The same five fields are compared as today, with the same normalization and the same
      stored discrepancy keys
- [x] Rejected rows from the parse are reported by the import rather than discarded, and one
      rejected row does not prevent the remaining rows from importing
- [x] Existing importer and discrepancy tests still pass, retargeted only where they fed
      hand-written raw rows

## Comments

`loadCommitteeLists` is now a five-line adapter: it reads the (still hardcoded) file,
parses it with the archived format from the registry, and hands the canonical entries to
the new `importRosterEntries(entries, actor)` — the importer proper, which never sees a
column name, a file path or a workbook. Ticket 06 replaces the file/format constants with
request input; the seam is already in place for it.

- `findDiscrepancies` now takes `RosterClaimedVoter` and a `DISCREPENCY_FIELDS` table of
  `{ claimedField, discrepancyKey, existingField }`. The five compared fields, the
  whitespace-collapsing normalization and the stored keys (`name`, `res address1`,
  `res city`, `res state`, `res zip`) are unchanged; the commented-out 2024-format list is
  deleted. New unit test: `src/__tests__/api/admin/findDiscrepancies.test.ts`.
- `loadCommitteeLists` returns `{ discrepanciesMap, rejectedRows }` instead of a bare Map,
  and the route adds `rejectedRows` to its response alongside the existing fields. That is
  the one caller-visible change in this ticket.
- **Worth a look:** the missing-voter discrepancy used to stash the raw workbook row under
  `discrepancy.VRCNUM.fullRow`, and the admin discrepancies screen renders it via
  `DiscrepancyTable` — which reads `name`, `ED`, `LT`, `Add1`, `Zip`, i.e. the *2024*
  format's column names. Four of those five have therefore been rendering blank ever since
  the workbook format arrived. `fullRow` is now built by `describeRosterEntry`, in the
  discrepancy record's own vocabulary (`name`, `Add1`, `City`, `State`, `Zip`, `CityTown`,
  `LT`, `ED`, `sourceRow`), which keeps the screen from throwing and incidentally makes
  those four columns render. No UI file was touched. `CommitteeUploadDiscrepancies`'s
  `discrepanciesPrintMap` is still keyed on 2024 names and is left alone: changing the
  discrepancies screen is out of scope here.
- Rejected rows: `loadCommitteeLists` surfaces them, and one rejected row no longer aborts
  the load — the old importer threw `"VRCNUM is undefined"` / `"Invalid committee data"`
  mid-file. Covered by `bulkLoadCommittees.rejectedRows.test.ts`, which drives a real
  workbook buffer through the real parser with `fs` mocked.
- The existing importer test file was retargeted from hand-written raw rows to a
  `rosterEntry({...})` helper; every scenario, prisma mock and audit assertion is otherwise
  untouched. `accumulateCommitteeMember`'s own unit test needed no change.
