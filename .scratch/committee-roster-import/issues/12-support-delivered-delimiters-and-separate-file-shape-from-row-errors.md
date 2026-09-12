# 12: Support the delivered delimiters and separate file shape from row errors

**Status:** resolved

**Priority:** P2 (operational hardening from the branch code review)

**What to fix:** The `boe-elected-list` parser currently treats comma as the only separator. The
app-local converted CSV parses all 1,470 rows, while the delivered tab-delimited `.txt` has the same
52-field positional layout but fails immediately as a one-field file. Supporting both encodings is
lexical decoding inside one known roster format; it is not semantic format auto-detection and does
not remove the Admin's required `format` selection.

The parser also declares every malformed office-name cell a whole-file format error during
`assertShape`. That conflicts with the parser contract that one bad row becomes a rejection while
the remaining roster survives. Recognize the file separately from validating each row:

1. Decode the header as comma- or tab-delimited, accepting only a delimiter that yields the expected
   52-field BOE layout.
2. Require every nonblank physical row to have the same field count as the header.
3. Parse office identity per row; an invalid value rejects that row with its source row number.
4. If no data row contains a valid BOE committee identity, throw a wrong-format error. This keeps the
   existing regression case—an expected header placed over another format's padded data—from being
   accepted while allowing one malformed row among valid rows.

Keep positional reads. Header names are evidence for recognizing the file's layout, never keys for
extracting voter or committee values.

The committed fixtures remain pseudonymized. Update the feature spec and tickets 01/05 to describe
them as structurally faithful pseudonymized excerpts rather than genuine voter rows. Preserve the
privacy boundary; real voter data stays outside Git.

**Blocked by:** None

## Acceptance criteria

- [x] The real local comma-delimited CSV and tab-delimited TXT each parse as 1,470 entries, zero
      rejections, 21 towns and only `PETITIONED` membership types.
- [x] Delimiter selection accepts only comma or tab and only when it yields the expected BOE field
      layout; arbitrary delimiter sniffing is not introduced.
- [x] A file with one invalid office-name row among valid rows returns that row in `rejected` and
      preserves every valid entry.
- [x] A ragged file remains a whole-file error because positional interpretation is unsafe.
- [x] The expected BOE header over uniformly padded wrong-format rows still throws rather than
      returning an all-rejected parse result.
- [x] Parser tests cover both delimiters, CRLF, BOM, trailing blank lines, one bad committee row and
      the wrong-format regression.
- [x] Fixture and spec wording states that committed people and VRCNUMs are invented while column
      order, delimiter, padding, cell types and known layout quirks are preserved.
- [x] No real voter name, address, phone, email, date of birth or VRCNUM is added to Git.

## Out of scope

- Selecting between roster format identifiers automatically.
- Supporting quoted CSV fields or arbitrary delimiters absent from the delivered files.
- Committing the production roster or making the file available under Vercel.


## Comments

Done. `boeElectedList.ts` now chooses its separator from the header row: tab first, then
comma, accepting whichever decodes to exactly the 52-field BOE layout and refusing the file
otherwise. Positional reads are unchanged. The office-name check moved out of `assertShape`
into the per-row loop, so an invalid committee identity rejects that row with its source
row; a file in which *no* row carries a committee identity still throws, which keeps the
header-over-wrong-format regression. Ragged rows and empty files remain whole-file errors.
Blank physical lines (interior or trailing) are skipped without renumbering the rows after
them.

Verified against the real local files, counts only: the delivered tab-delimited `.txt` and
the converted `.csv` each parse to 1,470 entries, 0 rejections, 21 towns, `{PETITIONED}`.
Neither file is in Git.

`scripts/makeRosterFixtures.ts` now emits both `boe-elected-list-2026-2028.excerpt.txt` and
`.csv` from the same invented rows; the parser tests read the `.txt` and assert it parses
identically to the `.csv`, plus CRLF, BOM, trailing and interior blank lines, one bad
committee row among good ones, all-bad rows, ragged rows and a wrong header field count.
