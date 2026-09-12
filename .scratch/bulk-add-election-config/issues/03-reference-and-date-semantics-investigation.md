# 03 - Investigate date semantics and reference integrity before implementing bulk add

Status: ready-for-agent

Answered 2026-08-30. `spec.md` is unblocked.

Two assumptions in the spec were reasoned from the schema rather than verified against
how the data is actually produced and consumed. Both are cheap to check and expensive to
get wrong at 500 rows a paste. Resolve this ticket before writing the parser.

## Question 1 — what is an election date, semantically?

The spec hand-rolls the parser into `Date.UTC(y, m - 1, d)` and never calls
`new Date(string)`, because `Date.parse("2026-11-03")` resolves as UTC while
`Date.parse("11/3/2026")` resolves as *local* — a list mixing both formats silently
shifts half its dates by a day for any admin west of Greenwich. The existing single-add
route uses exactly that loose `Date.parse` path today.

What to establish:

- **Is UTC-midnight the real contract, or a convention that leaked?** The single-add route
  does `new Date(parsed.date)` then `setUTCHours(0,0,0,0)`, which for a `M/D/YYYY` input
  in a US timezone lands on the day *before* the one typed. Check whether production data
  already contains such off-by-one rows — if so, bulk add will appear to "change" dates
  relative to the existing input, and that difference needs to be an intentional fix with
  a note, not a surprise.
- **Should this be a `@db.Date` column instead of `DateTime`?** These are calendar days
  with no time component. `src/lib/electionDateUtils.ts` exists entirely to defend against
  the `DateTime` representation — every read goes through UTC-component extraction to
  avoid display shifts. If the column became a date, that whole class of bug disappears.
  Decide whether that migration belongs here, in its own ticket, or not at all.
- **Confirm the test approach:** parser tests must run under a non-UTC `TZ`
  (e.g. `TZ=America/New_York`) or they will pass on a laptop and on CI while the bug is
  live in the browser.

## Question 2 — what actually references offices and election dates?

Neither table has an inbound FK. What I found:

- `OfficeName` and `ElectionDate` are read in `src/app/petitions/page.tsx` and passed to
  `src/app/petitions/GeneratePetitionForm.tsx`, which uses them to populate two dropdowns.
  The office dropdown's `value` is the **string** `o.officeName`, and the date is
  serialized via `formatElectionDateForForm`.
- No API route under `src/app/api` other than the two admin config routes references
  `electionDate` at all.

So the selected values appear to flow into petition generation as loose strings rather
than being stored as a relation — but "appear to" is the problem. What to establish:

- **Does anything persist the chosen office name or election date?** Trace the petition
  generation submit path end to end: generated PDF only, or a stored record / report row /
  audit entry that keeps the string?
- **If a value is persisted anywhere, what happens when the source row is renamed or
  deleted?** There is no FK to protect it, so a delete succeeds and any stored reference
  silently dangles.

This is the same unknown that blocks both deferred tickets:
`01-bulk-delete-election-config.md` (deleting could orphan data without erroring) and
`02-case-insensitive-office-name-uniqueness.md` (merging existing case-colliding rows
means repointing whatever references the loser by string value).

## Definition of done

- A `## Answer` section on this file recording, with file/line evidence: whether stored
  off-by-one dates exist, the `@db.Date` decision, whether office/date values are
  persisted anywhere, and what breaks on rename or delete.
- Any correction the answers imply written back into `spec.md`.
- `01` and `02` updated if the reference question turns out to unblock them.

## Answer

Resolved 2026-08-30 from code, in a grilling session on `spec.md`.

### Q1 — what is an election date, semantically?

**No off-by-one rows exist in practice.** The chain is: `DatePicker`
(`src/components/ui/datePicker.tsx`, react-day-picker) yields a **local-midnight** `Date`;
`ElectionDates.tsx:81` sends `newDate.toISOString()`; the route does `new Date(...)` then
`setUTCHours(0,0,0,0)` (`api/admin/electionDates/route.ts:42-43`). For any UTC-**negative**
offset, local midnight is *later the same day* in UTC, so the truncation lands on the day
the admin clicked. Nov 3 2026 at 00:00 EST is `2026-11-03T05:00:00Z`, truncating to
`2026-11-03T00:00:00Z`. Correct.

The failure the spec feared fires only for a UTC-**positive** admin, where local midnight
is the *previous* day in UTC. For a NY county party that is not a realistic history.

So UTC midnight is the real contract, and it is currently reached by two errors cancelling:
a loose `Date.parse` path that happens to be fed an unambiguous ISO instant. The spec now
retires that — see the single-add-route change.

**Caveat, accepted deliberately:** this is reasoned from code, not measured against the
production `ElectionDate` table. The confirming check was deferred as not worth the access:
`SELECT date FROM "ElectionDate"` and look for any value that is not exact UTC midnight.
Run it if a date ever displays a day off. The spec's UTC-*day* matching (below) means a
stray row would be found and skipped rather than silently duplicated, so the deferral is
contained.

**`@db.Date`:** not decided here. It belongs to the `date-handling` effort's tickets 04
(representation) and 05 (persistence shape and backfill), where every calendar-date call
site in the repo is in view — not to whichever feature happens to touch a date first.

**Test approach confirmed:** parser tests run under a non-UTC `TZ`.

### Q2 — what references offices and election dates?

**Nothing persists either value.** Evidence:

- `office` appears nowhere in `prisma/schema.prisma` outside `OfficeName.officeName`.
  `ElectionDate` likewise has no inbound FK.
- `GeneratePetitionForm.tsx:134-144` puts the office **string** and
  `formatElectionDateForForm(date)` into a transient `GenerateReportData.payload`, which
  goes to report-server and is printed into a PDF.
- `src/types/reportMetadata.ts:12` maps `DesignatedPetition -> null`, so the `Report` row
  keeps only `fileKey` / `title` / `description`.
- Petition outcome tracking does not store them either.
  `docs/SRS/tickets/2.6-petition-primary-outcome-tracking.md` (Status: Done): "Use
  `CommitteeMembership` as the canonical record for challengers and outcomes (no separate
  `PetitionRecord` model in v1)." Outcomes attach to `Seat` (`schema.prisma:394`).

**What breaks on rename or delete: nothing.** Renaming or removing an entry changes only
what future dropdowns offer. Already-generated PDFs are immutable snapshots and are
unaffected. This unblocks the orphaning question in `01` and the repointing question in
`02`.

The shape is now named **Reference List** in §Reference data of `apps/frontend/CONTEXT.md`.
Whether to reverse it is recorded, unscoped, in `04`.
