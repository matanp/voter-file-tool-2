# Bulk add for election offices and election dates

Status: ready-for-agent

`issues/03` is answered — see its `## Answer` for the evidence behind the two claims this
spec used to assume: nothing persists a chosen office or date, and no off-by-one rows
exist. Both are reflected below.

Revised 2026-08-30 after a second grilling pass. The staged preview, the generic
`BulkAddPanel`, the panel-replacing textarea, the `failed` result array and the 500-row cap
are all gone; see the sections below for what replaced them.

Admins currently add office names and election dates one at a time through a single
control on `/admin/election-config`. Loading a real list means dozens of round trips. This
adds a second, opt-in way to add: paste a list, see a live preview of exactly how each line
will land in the database, confirm.

## Current state

- `OfficeName { id, officeName @unique }`, `ElectionDate { id, date @unique }` — Reference
  Lists (see §Reference data in `apps/frontend/CONTEXT.md`), no FKs pointing at them.
  Nothing persists a chosen value: the petition form copies it into a transient report
  payload that is printed into a PDF. Renaming or deleting an entry cannot orphan
  anything (`issues/03`).
- `apps/frontend/src/app/admin/election-config/ElectionOffices.tsx` (an `<Input>` + Add
  button) and `ElectionDates.tsx` (a `<DatePicker>` + Add button), posting to
  `/api/admin/officeNames` / `/api/admin/electionDates`, Admin-gated by `withPrivilege`.
- `ElectionDates.tsx:26` is the only caller of `POST /api/admin/electionDates` in the repo.
- Office duplicate check is case-insensitive at the app layer; the DB unique index is
  case-sensitive (see `issues/02`).
- Dates are normalized to UTC midnight before insert — correctly, but by accident. The
  route's loose `Date.parse` path is safe only because the client feeds it an unambiguous
  ISO instant from a local-midnight picker. This spec retires that (see §Single-add
  route).
- Neither route writes an audit log today; sibling admin routes do.

## Shape of the feature

Each panel keeps the single-add control it has today and gains a **bulk mode** alongside
it. The two are mutually exclusive, switched by a toggle on the panel.

- **Default mode is single-add.** Until an admin flips the toggle, each panel looks and
  behaves exactly as it does now. The daily case is adding one office or one date; the
  paste is a once-a-cycle case, and it does not get to make the common case worse.
- **The `<DatePicker>` stays.** Adding one election date remains a calendar click, not a
  hand-typed `11/3/2026`. Likewise the office `<Input>`.
- **Toggling preserves state.** The pasted text lives in the panel component, not in the
  bulk section, so switching to single-add and back does not discard a 40-line paste. No
  confirmation prompt is needed because nothing is lost.

### `BulkAddSection`

One shared *presentational* component, not a parameterized panel. Its entire interface is:

```
rows: PreviewRow[]        // already parsed, matched and status-tagged
text: string              // the textarea's contents
onTextChange(next: string)
onConfirm()
```

Parsing, normalization, matching against existing records, and the POST all live in the
two panels, because those are exactly the parts that differ. The section renders the
textarea, the count summary, the preview table and the Confirm button, and knows nothing
about offices or dates.

The earlier design passed a line parser, a row renderer, a POST target, an entity noun, a
placeholder, an invalid-row message and a matcher into one generic component — seven
configuration holes for two call sites, which is nearly as much interface as
implementation. Handing the section an already-parsed `rows` array collapses all seven.

### Live preview — no stages

The textarea and the preview table are on screen together. `rows` is a pure function of
the textarea's contents, re-derived on every keystroke (debounced). There is no preview
stage, no one-way handoff, no Cancel, and no discarded-edit semantics, because there is no
second copy of the state to reconcile.

**Paste rules.** Newline-separated only, for both entities — commas are never separators,
because office names plausibly contain them ("Council Member, District 3"). The
placeholder states the rule. Blank and whitespace-only lines are dropped before rows are
built; they are never phantom rows.

**Rows are read-only.** They are not editable inputs. Fixing a line means fixing it in the
textarea, which is where the text already is.

**✕ removes the line from the textarea.** The one mutation a row offers is deletion, and
it is implemented as an edit to the pasted text — the line disappears from the box, and
the preview re-derives as usual. This keeps the text as the single source of truth: there
is no dismissed-set to keep in sync, deletion is visible, and re-pasting or retyping
restores it. It also makes status recomputation fall out for free — deleting one of two
duplicate lines leaves the earlier line as **New**, with no special-case logic.

This behaviour is the most surprising thing in the design to a future reader, so it is
covered by a test that asserts the *textarea contents* changed, not merely that a row
vanished (§Tests).

**Count summary**, one line above the table:

> 12 new · 3 already exist · 0 invalid

The same string is reused for the success toast.

**Table columns:** original text → value that will be stored, plus a status badge.

Row statuses:

- **New** — will be created.
- **Already exists** — matched an existing record; will be skipped. For offices the match
  is case-insensitive, and the row shows what it matched ("Mayor — already exists as
  *mayor*").
- **Duplicate in list** — a second line matching an earlier line in the same paste
  (case-insensitive for offices). First wins; this one is skipped.
- **Invalid** — could not be parsed.

Matching against existing records is done client-side against the list already held in the
panel's local state; no fetch is involved in building the preview.

**Confirm is disabled while any row is invalid**, with the reason on the button ("Fix 3
invalid rows to continue"). When everything is valid the button reads "Add 12 offices".
Confirm is also disabled when there are zero new rows.

Invalid is the only status that blocks. Duplicate and Already-exists are skips where the
admin's intent is still satisfied — the value ends up in the list either way. An invalid
line means the admin asked for something and would get nothing, and a silently swallowed
header row is how a list ends up quietly incomplete. The remedy is cheap: the offending
lines are named in the table, next to the text.

**Line cap: 50**, enforced client-side (an inline error under the textarea, blocking
Confirm) and again server-side. The cap exists to stop a pathological paste, not to
express a supported batch size; a realistic list is dozens. It also bounds the rendered
table and the audit payload (§Audit logging). Raising the constant later is trivial.

### Commit

Confirm POSTs the new rows to the bulk endpoint. On success the preview clears, the
returned records are **merged into the list's local state and re-sorted** — no
`router.refresh()`, no flash — and a toast reports the counts.

Re-sorting matters: the dates list is served ordered by date ascending, so appending a
pasted 2024–2028 range to the end would stack it below 2030 in arrival order and only
repair itself on reload. Use `sortElectionDates` from `~/lib/electionDateUtils` for dates
and `localeCompare` on `officeName` for offices.

If the request fails (network, 500), nothing on screen changes except a destructive toast
— the textarea and preview stay intact so Confirm can be retried.

## Parsing and normalization

### Offices

Trim leading/trailing whitespace. Nothing else — casing preserved as typed
("NYS Assembly" must not be title-cased), internal whitespace untouched, quotes and
trailing commas not stripped.

Matching against existing records and within the batch is **case-insensitive**, matching
what the single-add API already does.

### Dates

Strict allowlist, parsed by hand — **never** `new Date(string)` or `Date.parse`, which
resolve `YYYY-MM-DD` as UTC but `M/D/YYYY` as local and produce off-by-one-day bugs:

- `YYYY-MM-DD`
- `M/D/YYYY` (and zero-padded variants)

Anything else is invalid with the message "use 2026-11-03 or 11/3/2026". Long forms like
`November 3, 2026` are rejected.

Parsed into `Date.UTC(y, m - 1, d)`. Reject values where the components don't round-trip
(2026-02-30). No plausibility window — historic and far-future dates are both allowed
without warning.

The preview's stored-value column shows the **weekday**: `11/3/2026 → Tue, Nov 3 2026`.
NY elections are Tuesdays, so a fat-fingered `11/4/2026 → Wed` is visible at a glance.

### `calendarDateFromLocalDate`

A second small export from the same module, for the single-add path: given the
**local-midnight** `Date` that `<DatePicker>` produces, build the `YYYY-MM-DD` string the
strict parser accepts, using **local** components (`getFullYear` / `getMonth` /
`getDate`).

This replaces the obvious-looking `formatElectionDateForForm(newDate)` at
`ElectionDates.tsx:81`. That function builds `YYYY-MM-DD` from **UTC** components
(`electionDateUtils.ts:105-110`), which is right for its documented input — a `Date` read
back from the DB, which *is* UTC midnight — and wrong for a picker's local-midnight
`Date`, where it happens to give the correct answer only because New York is at a negative
UTC offset. That is the same cancelling-errors pattern `issues/03` diagnosed and this spec
exists to retire; relocating it would not be retiring it.

A local-midnight `Date`'s local components *are* the day the admin clicked, at every
offset.

### Module placement

Both parsers and `calendarDateFromLocalDate` live in one file under
`apps/frontend/src/lib/`, not in `packages/shared-validators`. The `date-handling` effort
will eventually *rewrite* this against whatever representation its ticket 04 picks — that
is a rewrite, not a relocation, so paying cross-package cost now buys a move that will not
happen. The one binding constraint is that **`new Date(string)` and `Date.parse` appear
nowhere in this module**, which is what keeps the later swap to a single file.

## API

New endpoints, Admin-gated the same way as the existing ones:

- `POST /api/admin/officeNames/bulk` — `{ names: string[] }`
- `POST /api/admin/electionDates/bulk` — `{ dates: string[] }`

Response: `{ created: Record[], skipped: string[] }`.

There is deliberately **no `failed` array**. The earlier design carried one "for races",
but no execution path could populate it: a race that loses to the server precheck is a
skip, and a race that beats the precheck raises P2002 — which under a transaction aborts
the whole batch, so `created` would be empty anyway. A field nothing can fill is a lie in
the contract.

Writes use **`createManyAndReturn({ data, skipDuplicates: true })`**, with the precheck and
the create in one `prisma.$transaction`. This is what makes the race benign: a row that
passes the precheck and collides at the DB is skipped by Postgres instead of destroying the
batch, and `created.length < data.length` is exactly how the race surfaces. `skipDuplicates`
keys off the DB's **case-sensitive** unique index, so it is a backstop, not a replacement
for the case-insensitive precheck (`issues/02`).

`createManyAndReturn` is present in the generated client at the pinned `@prisma/client`
5.15.0 with no `previewFeatures` flag set. Smoke-test it at implementation time; if it
turns out to be gated in this build, fall back to `createMany` followed by a re-query for
the ids, and note that the re-query can pick up concurrently created rows.

All-or-nothing remains the intent for anything other than a duplicate: a half-landed paste
is worse than a rejected one.

Server-side: re-run the existing-record check and the 50-row cap; do not trust the
client's preview.

**Match election dates by UTC day, not by exact instant.** Query the day's range
(`gte` day-start, `lt` next-day-start) rather than `where: { date: exactMidnight }`. The
production table is believed to hold only exact-midnight rows, but that was reasoned rather
than measured (`issues/03`), and the equality form fails open: a stray non-midnight row
would be missed by the precheck, pass the `@unique` index (it is a different instant), and
land as a **silent duplicate** — two Nov 3 entries in the dropdown. Day-matching turns that
into an "already exists" skip. Offices keep the case-insensitive match they have today.

Both endpoints `revalidatePath("/petitions")` as the single-add routes do.

### Single-add route

The single-item POST routes stay, and stay in use — the pickers were not removed. But
`electionDates/route.ts` **adopts the same strict parser** rather than keeping its own
`z.string().refine` + `new Date()` path. Two definitions of "a valid election date" in one
tree is the exact duplication the `date-handling` effort exists to stop; shipping a second
one while deferring to that effort would be the worst of both.

This is a deliberate breaking change: the route currently accepts anything `Date.parse`
swallows, including the full ISO instants its own client sends. After this it accepts
`YYYY-MM-DD` and `M/D/YYYY` only. Compatibility here means the route still exists, not that
every string it once took still works.

Accordingly, `ElectionDates.tsx:81` sends `calendarDateFromLocalDate(newDate)` instead of
`newDate.toISOString()`.

The single-add route's existing-record check also matches by UTC day, for the same reason
as the bulk endpoint.

## Audit logging

These are the first audited writes in election config, and one paste can create dozens of
records, so they get logged.

Add two `AuditAction` enum values via migration:

- `OFFICE_NAMES_BULK_CREATED`
- `ELECTION_DATES_BULK_CREATED`

One audit row per batch, written with **fail-open `logAuditEvent`, after the transaction
commits** — not `logAuditEventOrThrow` inside it.

This follows the one existing precedent for this category of write:
`src/app/api/admin/crosswalk/import/route.ts:171`, a bulk admin import of reference data,
whose comment states the rule outright — *"Fail-open: crosswalk import summary is
reference/config telemetry, not membership state."* Office Names and Election Dates are
Reference Lists; by CONTEXT.md's own definition nothing references them and nothing they
touch can be orphaned. A failed telemetry write should not stop an admin loading their
office list.

Fields:

- `entityType`: `"OfficeName"` / `"ElectionDate"`
- `entityId`: `` `bulk-${Date.now()}` `` — synthetic, since a batch has no single record
  id, but **unique per batch**. A constant `"bulk"` would collide every batch onto one key
  in `@@index([entityType, entityId])` and render an entity-id filter useless. Mirrors
  crosswalk's `` `import-${Date.now()}` ``.
- `afterValue`: the created records. "Which 12 offices were added on the 14th?" is the
  question an audit reader actually has, and a bare count cannot answer it. The 50-row cap
  bounds the blob.
- `metadata`: the counts, so the list view can summarize without parsing `afterValue`.

### Registry updates

New enum members and entity types are not free — three places must be updated or the build
and tests break:

- `AUDIT_ACTION_LABELS` (`src/app/admin/audit/auditUtils.ts:5`) is a
  `Record<AuditAction, string>`; a new enum member breaks the build until it is added.
- `AUDIT_ENTITY_TYPE_OPTIONS` (`auditUtils.ts:39`) gains `"OfficeName"` and
  `"ElectionDate"` entries, **kept sorted alphabetically by label** — a test asserts it.
- `LOGGED_ENTITY_TYPES` (`src/__tests__/app/admin/audit/auditUtils.test.ts:101`) gains the
  same two values. The test asserts in both directions: every logged type is offered as a
  filter, and every filter offered is actually logged.

Do not backfill audit logging onto the existing single-add and delete routes — out of
scope.

## Tests

- **Parser / normalizer unit tests, exhaustive.** These are pure functions and hold all
  the risk. Cover: the `M/D/YYYY` vs `YYYY-MM-DD` timezone trap (assert UTC components,
  and run under a non-UTC `TZ`), invalid-date round-trip rejection, blank-line dropping,
  trim-only office normalization, case-insensitive in-batch dedupe, first-wins ordering.
- **`calendarDateFromLocalDate` under both a UTC-negative and a UTC-positive `TZ`.** The
  helper exists specifically to be correct at positive offsets, so a suite that only runs
  at `America/New_York` proves nothing about the thing it was written for.
- **Single-add route test** for the tightened validation: an ISO instant is now rejected,
  `YYYY-MM-DD` and `M/D/YYYY` are accepted, and a stray non-midnight row is matched as
  already-existing by the day-range query.
- **Route tests** for both bulk endpoints, alongside the existing
  `src/__tests__/api/admin/electionDates.test.ts`: happy path, 50-row cap, audit row
  written, privilege gating, and a **race test** — a row that passes the precheck but
  collides at the DB comes back absent from `created` rather than erroring. There is no
  transaction-rollback test: with `skipDuplicates` and fail-open audit logging, no rollback
  path remains.
- **Component tests**, scoped to the four behaviours that carry risk: Confirm is disabled
  while an invalid row is present and enabled once the line is fixed; ✕ **removes the line
  from the textarea** (assert the textarea's contents, not just the row's absence);
  deleting one of two duplicate lines leaves the first as New; invalid rows never reach
  fetch.
- **`auditUtils.test.ts`** updated per §Registry updates.

## Not in scope

- Bulk delete — see `issues/01`.
- Replacing the by-value Reference List shape with real relations — see `issues/04`.
- Making the office-name uniqueness constraint case-insensitive at the DB level — see
  `issues/02`.
- Audit coverage for the existing single-add / delete routes.
- CSV/file upload. Paste only.
- Any change to `CONTEXT.md` or a new ADR. The feature adds no domain term — "bulk add" is
  an affordance and "preview row" is implementation — and the calendar-date parsing
  contract here is superseded by `date-handling` ticket 04 rather than being a
  forever-decision worth recording.
