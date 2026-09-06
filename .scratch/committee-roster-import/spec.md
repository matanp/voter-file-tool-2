# Committee roster import: one parser per format, plan before apply

Status: ready-for-agent

## Problem Statement

The roster for the 2026–2028 Committee Term arrived from the county Board of Elections in a
format the importer cannot read. Three things block it, and only the first is obvious.

**The importer reads exactly one file.** The path is hardcoded and the parse is `xlsx`-only.
Nothing in the request selects a file, so putting the new file next to the old one changes
nothing. The endpoint is also disabled entirely under Vercel, because it reads from the
working directory.

**The format's column names are load-bearing throughout the importer.** Committee identity
is read as `Committee` / `Serve LT` / `Serve ED`, VRCNUM as `voter id`, and the
discrepancy comparison is keyed on `name` / `res address1` / `res city` / `res state` /
`res zip`. None of the first four exist in the new file. This has happened before: the
comparison helper still carries the previous format's field list, commented out directly
above the current one. Each format change has been absorbed by editing shared logic in
place, which is why the previous format is now unreadable.

**The new file passes every structural check while being semantically misaligned.** Its
header row declares 52 columns and every one of its 1470 data rows has 52 fields, with no
quoting. But the names do not line up with the values: column 1 is headed `voter` and holds
the VRCNUM, column 2 is headed `id` and holds the full name, and the five declared
`res addressN` slots correspond to only two in the data. Reading it by header name — the
way the current importer reads a workbook — yields `name` = a street address and
`res city` = empty for every row. The import would not error. It would flag all 1470
members as discrepancies and remove every existing membership it failed to match.

That last failure mode is the reason this is urgent beyond the new file. The importer
removes memberships by absence — anyone in the database but not in the file is marked
`REMOVED` — and it writes as it goes. There is no way to find out what an import will do
except to let it do it. An Admin pointing the importer at a misread file destroys the
roster, and the only tests that touch this code mock the parse layer away entirely, so no
test would have caught it.

## Solution

Separate reading a file from reconciling a roster, and let an Admin look before it writes.

A **roster parser** turns one file of one known format into a canonical list of roster
entries — VRCNUM, committee identity, the attributes the county claims about the person,
and how they got their seat. One parser per format, each a plain function from bytes to
entries, each tested against a real trimmed sample of the file it reads. Nothing downstream
knows what a column is called.

The importer then takes those entries and produces an **import plan**: which memberships it
would activate, which it would remove, which rows disagree with the voter file, and which
rows it could not read at all. An Admin can request the plan without applying it. Applying
is a second, explicit step over the same plan.

The Admin says which format the file is, rather than the system guessing. There are two
formats and one of them will never legitimately be imported again, so the choice is cheap
to make and expensive to get wrong.

## User Stories

1. As an Admin, I want to import the 2026–2028 elected roster from the Board of Elections
   file as delivered, so that I do not have to hand-convert it into the previous format.
2. As an Admin, I want to state which format the file I am importing is, so that the system
   never silently misreads one format as another.
3. As an Admin, I want to be offered only formats that are currently importable, so that I
   cannot select a format belonging to a Committee Term that is already loaded.
4. As an Admin, I want to request an import plan without applying it, so that I can see what
   the import will do before it changes anything.
5. As an Admin, I want the plan to tell me how many memberships would be activated, so that
   I can sanity-check the number against the roster I was handed.
6. As an Admin, I want the plan to tell me how many memberships would be removed and who
   they are, so that a misread file announces itself as a mass removal before it happens.
7. As an Admin, I want the plan to list rows that disagree with the voter file, so that I
   know the size of the discrepancy queue before committing to work through it.
8. As an Admin, I want the plan to list rows that could not be read, with the row number and
   the reason, so that I can go back to the county about specific lines.
9. As an Admin, I want a single unreadable row not to abort the import, so that one bad line
   out of 1470 does not cost me the whole load.
10. As an Admin, I want to apply an import after reviewing its plan, so that the write is a
    decision I made rather than a side effect of asking a question.
11. As an Admin, I want an import to record members as having won their seat by primary when
    the file says they were elected, so that the committee roster reflects how people
    actually got there.
12. As an Admin, I want an import to record members as appointed when the file says the
    Executive Committee appointed them, so that mid-term appointments remain distinguishable
    from elected members.
13. As an Admin, I want committee identity to be read correctly from a format that packs
    city, legislative district and election district into one field, so that members land in
    the right Committee.
14. As an Admin, I want city and town names normalized consistently regardless of which
    format supplied them, so that the same Committee is not created twice under two
    spellings.
15. As an Admin, I want an import to apply to the active Committee Term, so that loading a
    new roster does not disturb a term that has already been reconciled.
16. As an Admin, I want the import to refuse to run when there is no active Committee Term,
    so that entries are never attached to the wrong term.
17. As an Admin, I want a voter who appears in two committees in the same file to be raised
    as a discrepancy rather than assigned to one arbitrarily, so that I resolve the conflict
    myself.
18. As an Admin, I want a voter already active in another committee for this term to be
    raised as a discrepancy, so that the import cannot quietly move someone.
19. As an Admin, I want a committee whose file rows exceed the configured seat maximum to
    stop the import with a clear message naming that committee, so that I can correct the
    file rather than silently overfill.
20. As an Admin, I want a row whose VRCNUM is not in the voter file to become a discrepancy
    rather than a membership, so that the import never invents a member.
21. As an Admin, I want the removals an import performs to remain attributable in the audit
    log, so that a later question about a missing member has an answer.
22. As a developer, I want to add support for a future Board of Elections format by writing
    one parser and registering it, so that a format change never again requires editing
    reconciliation or discrepancy logic.
23. As a developer, I want a parser's correctness proven against a real sample of the file it
    reads, so that a misaligned header is caught by a test rather than in production.
24. As a developer, I want the parser for the previous term's format kept and tested but not
    offered for import, so that a local database can still be seeded from it without an
    Admin being able to fire it at the wrong term.
25. As a developer, I want the discrepancy comparison to receive named, already-mapped
    fields, so that it stops carrying one commented-out column list per historical format.
26. As a developer, I want computing what an import would do to be separable from performing
    it, so that the plan can be tested without asserting on database writes.

## Implementation Decisions

### The canonical entry is the seam

One shape sits between every parser and the importer. It carries exactly what the importer
needs and nothing else:

- `vrcnum` — the VRCNUM, as a trimmed string
- `committee` — `cityTown`, `legDistrict`, `electionDistrict`, already normalized
- `claimed` — `name`, `address1`, `city`, `state`, `zip`; the attributes the county asserts,
  which the importer compares against the voter file
- `membershipType` — `PETITIONED` or `APPOINTED`
- `sourceRow` — the 1-based row number in the source file, for reporting rejections

`claimed` deliberately mirrors the fields the discrepancy comparison uses today, under
format-neutral names. `membershipType` is **required**, not optional: all three formats the
repo has ever seen carry it. A future format that cannot supply it is a new situation to
confront then, not to default past now.

A parse returns both the entries it read and the rows it rejected:
`{ entries, rejected: [{ sourceRow, reason }] }`. Parsers do not throw on bad rows. They
throw only when the file as a whole is not the declared format.

### Format registry

A flat map from a format identifier to `{ label, status, parse }`, where `status` is
`current` or `archived`. Two entries:

- **`committee-export-xlsx`** (`archived`) — the `Committee` / `Serve LT` / `Serve ED`
  workbook. Covers both the 2025-05-15 and 2026-04-16 files: the latter is a strict
  superset, adding `dob` and the `Serve CD/SD/AD/LD` breakout, so one parser reads both.
  `membershipType` derives from `election type`: a value beginning `Primary Election` maps
  to `PETITIONED`, one beginning `Executive Committee Appointed` maps to `APPOINTED`, and
  anything else rejects the row. The `Committee` value containing `LD ` means Rochester —
  this heuristic belongs to this parser and moves into it.
- **`boe-elected-list`** (`current`) — the Board of Elections "Elected County Committee
  List" delimited export.

The 2024 `DemocraticCommitteeExport` format (`LT Description` / `LT` / `ED` / `Add1` /
`City` / `Zip` / `Pet-Apt`) is **not** implemented. It describes the same Committee Term as
the archived workbook format, which represents that term more completely, so it has no
consumer. The commented-out field list referencing it is deleted rather than revived.

### Format selection is an explicit input, never sniffed

The request names the format. Content detection is out — the new file demonstrates that a
wrong-format read can satisfy every structural check while producing garbage, and the
consequence is mass membership removal rather than an error. Only formats with status
`current` are accepted from the API; `archived` parsers are reachable only from scripts and
seeding. Requesting an archived format returns a validation error naming it as archived.

### The Board of Elections parser reads by position, not by header

This is the central correctness decision. The file's header row does not correspond to its
data rows, so header-keyed access is wrong even though it appears to work. The parser reads
fixed column positions and validates the shape rather than trusting the header:

| Position | Meaning |
| --- | --- |
| 1 | VRCNUM |
| 2 | full name |
| 3 | residential address line 1 |
| 5 | residential city |
| 6 | residential state |
| 7 | residential zip |
| 26 | office name — committee identity |
| 25 | official type |

The parser must assert the file's shape before trusting positions, and throw if the
assertion fails: a uniform field count across all rows, and every data row's office-name
field matching the committee-identity pattern. It must not accept a file whose header row
happens to declare the expected names.

Committee identity is parsed out of the office-name field, which has the form
`TOWN/LT/ED-CC-Party` (e.g. `PERINTON/058/014-CC-Democratic`). Split on `/`, take the town
verbatim, and strip the trailing `-CC-<party>` from the election-district segment. Both
district segments are zero-padded and parse as base-10 integers. Town names arrive already
uppercase and are spelled out for every town including Rochester, so this parser needs no
Rochester special case.

`official type` is `ELECTED` for every row in the delivered file, mapping to `PETITIONED`.
An `APPOINTED`-equivalent value is mapped if present; an unrecognized value rejects the row.

### Normalization belongs to parsers

`cityTown` is uppercased by the parser, not the importer. Format quirks — the Rochester
heuristic, zero-padded districts, trailing whitespace on names and party — are resolved
before the entry leaves the parser. The importer receives values it can use directly.

### The discrepancy comparison takes named fields

The comparison helper currently takes a raw source row plus a list of source-column-to-
voter-field pairs. It changes to take the canonical `claimed` object and compare each field
against its voter-file counterpart. The existing normalization — collapsing runs of
whitespace before comparing — is preserved, as are the current five compared fields and the
name and address derivations they compare against. The commented-out historical field list
is removed. The discrepancy record's stored keys keep their current names so that existing
discrepancy resolution and its audit metadata are unaffected.

### Membership type stops being hardcoded

The importer currently writes `APPOINTED` for every membership it creates and falls back to
`APPOINTED` when reactivating. It instead uses the entry's `membershipType`. Against the
enum's meaning — `PETITIONED` for a seat won through the petition and primary process,
`APPOINTED` for a vacancy filled by Executive Committee vote — the current behaviour is
wrong for the large majority of members: the active term's file has 1238 primary-elected
against 321 appointed, and the incoming file is entirely elected.

Existing memberships are **not** rewritten by this change. Reactivation of an existing
membership keeps that membership's recorded type when it has one, and takes the entry's type
only when it does not. Correcting the already-loaded term is a separate piece of work.

### Plan and apply

The importer splits into two stages over the same data.

**Planning** reads the database and computes, without writing: the entries that would
activate a membership, the currently-active memberships absent from the file that would be
removed, the entries that would become discrepancies and why, the parser's rejected rows,
and counts of each. It performs the same checks the importer does today — voter exists,
voter not already active in another committee for the term, no voter assigned to two
committees within the one file, per-committee capacity against the configured seat
maximum — and records each as a planned outcome rather than acting on it. Capacity overflow
remains a hard failure of the whole import, surfaced on the plan.

**Applying** takes a plan and performs the writes, preserving the current behaviour: upsert
each committee, ensure seats exist, remove absent memberships with the existing removal
reason and audit event, activate or create memberships with seat assignment, write
discrepancy records, and emit the same audit events with the same metadata. Row-level
locking on the committee, and the transaction boundaries around each committee's
reconciliation, are unchanged.

The plan is data, not a database record. It is computed and returned within one request;
persisting import runs is out of scope. Because a plan is computed against a database that
could change before it is applied, applying recomputes rather than trusting a plan sent back
by the client — the client-supplied plan is not an input to the write.

### API contract

`POST /api/admin/bulkLoadCommittees` remains Admin-gated and keeps its existing environment
guard. It gains a validated request body, added to the shared validators package alongside
the existing committee discrepancy schema:

- `format` — a current format identifier
- `fileName` — the file to read, resolved within the existing local data directory
- `dryRun` — boolean, defaulting to `true`

A dry run returns the plan and writes nothing. `dryRun: false` applies. The default is the
safe one: an operator who omits the flag gets a plan, not a mass removal.

The response carries the plan in both cases — counts, removals, discrepancies and rejected
rows — plus, when applied, confirmation of what was written. The existing response fields
that consumers depend on are preserved where they still have meaning.

Reading the file from the local data directory is retained deliberately. Moving to presigned
upload is a separate piece of work, and folding it in here would couple a correctness fix to
an infrastructure change.

## Testing Decisions

A good test here asserts on what a caller observes and would survive a rewrite of the
internals. For a parser that means: given these bytes, these entries and these rejections.
For planning it means: given these entries and this database state, these activations,
removals and discrepancies. Neither should assert on intermediate maps, call ordering, or
the shape of accumulator structures.

**Parsers are tested against real files.** This is the most important decision in this
section. Every existing test that touches importing mocks the workbook library out
completely and feeds hand-written objects to the reconciler, which means no test in the repo
exercises column mapping — the exact defect that motivates this work. Each parser gets a
committed fixture: a genuine excerpt of the real file, trimmed to roughly twenty rows,
preserving the original header row, delimiter, padding and quirks verbatim. Tests assert the
canonical entries produced from it.

Each parser is tested for: correct committee identity from its own encoding; correct VRCNUM;
correct `claimed` fields mapped to the right values; correct `membershipType` for each value
the format uses; a malformed row rejected with its row number rather than throwing; and — for
the Board of Elections parser specifically — a regression test that a header-keyed read would
have failed, asserting that `claimed.name` is a person's name and `claimed.city` is a city
for a row where the declared header would have yielded an address and an empty string.

A file of the wrong format submitted under a format identifier throws rather than producing
entries. The archived format is rejected by the request schema.

**Planning is tested with the existing mocked-Prisma approach.** The current importer test
file is the prior art and its scenarios carry over, retargeted from "these writes happened"
to "the plan says this": a clean roster activating memberships, a voter missing from the
voter file becoming a discrepancy, a voter active in another committee becoming a
discrepancy, a voter appearing twice in one file becoming a discrepancy, a currently-active
member absent from the file being planned for removal, and a committee over the seat maximum
failing. The mock helpers for voter records, memberships, audit assertions and the default
active term are reused rather than reinvented.

**Applying keeps the existing write assertions.** The membership create, membership update
and audit log assertions in the current importer test file continue to hold, now driven from
a plan. One new assertion: a created membership carries the entry's `membershipType` rather
than a constant.

**Route-level tests follow the existing endpoint pattern.** The privilege-gating test that
already covers this endpoint stays. New cases: a dry run returns a plan and performs no
writes; omitting `dryRun` behaves as a dry run; an invalid or archived format is rejected
with a validation error; and the no-active-term case still returns its existing status.

The pure accumulation helper that has its own small unit test today keeps it if it survives
the refactor; if planning absorbs it, its cases move up to the planning tests rather than
being dropped.

## Out of Scope

- **Presigned upload.** The file continues to be read from the local data directory, and the
  existing environment guard stays. Confirmed as separate work.
- **The `CommitteeImport` run record.** Storing format, filename, content hash, actor and
  counts per import, and scoping discrepancy records to an import, is a separate spec. The
  current behaviour — deleting all unresolved discrepancies at the start of every run, with
  a globally unique VRCNUM on the discrepancy record — is left as it is, including its
  clobbering of unresolved discrepancies across runs.
- **Correcting `membershipType` on the already-loaded 2024–2026 term.** The 1238 memberships
  currently recorded as appointed that were primary-elected stay as they are.
- **A parser for the 2024 `DemocraticCommitteeExport` format.** Not implemented; see
  Implementation Decisions.
- **Any import user interface.** The endpoint has no caller in the repo and is driven
  directly. The plan is an API response, not a screen.
- **Content sniffing or format auto-detection**, including as a pre-selection hint.
- **Changing discrepancy resolution**, the seat model, capacity rules, or audit event
  vocabulary.

## Further Notes

The format history is worth recording, because it sets the expected rate of change and it
justifies keeping the archived parser rather than deleting it. Three formats have arrived
since 2024, but they map to Committee Terms rather than to eras: the 2024 export, the
2025-05-15 workbook and the 2026-04-16 workbook all describe the 2024–2026 term, and the new
Board of Elections list is the first file for 2026–2028. With one file per term, the steady
state is roughly one parser per term — about one every two years, each retirable when its
term is. That is a low enough rate that a registry of plain functions is the right amount of
structure, and no plugin or schema-versioning machinery is warranted.

The archived parser earns its place for a second reason beyond seeding. With a single parser
the canonical entry shape is unfalsifiable — there is no way to tell whether it is genuinely
format-neutral or merely a rename of one format's columns. A second parser reading a
structurally different file, tested against a real fixture, is what proves the seam.

The new file is internally clean once read positionally: 1470 rows, all `NY`, all `ELECTED`,
all VRCNUMs numeric, no duplicate VRCNUMs, no quoted fields, 21 distinct towns. The
difficulty is entirely in its header row, which is why the shape assertion in the parser
matters more than the usual amount of input validation.

Prior analysis of this file, written against the tab-delimited variant it was converted
from, exists in the repo's docs as a format reconciliation note. Its conclusions about
committee identity, the absent Rochester special case and the unchanged discrepancy fields
hold. One correction: it recommends reading by header name, having caught only the first two
columns being mislabelled. In the comma-delimited file in the data directory the
misalignment extends further — the declared residential address columns do not correspond to
the data either — so header-keyed reading is unsafe for that file regardless. Whether the
tab-delimited original aligned beyond the first two columns is unverified; that file is no
longer in the data directory.
