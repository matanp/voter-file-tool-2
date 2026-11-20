# 11 - Sign-in sheet redesign (match the Brighton format)

Status: resolved

## Why

Split from [05](05-monthly-reports-and-sign-in-sheet.md) on 2026-11-01. The reporter attached the sign-in sheet
format they prefer: `data/Brighton_09282026102755.pdf` (gitignored, 19 scanned pages, used at Brighton's 2026
reorganization meeting). Decision: **match their format**, including sort order.

Today's `signInSheet` ([SignInSheet.tsx](../../../apps/report-server/src/components/SignInSheet.tsx)) prints
Letter portrait pages, one or more per ED (25 members per page), with `#`, Name, Address, Signature, Notes, plus
5 blank rows on the ED's last page. Its footer shows generation date, report author, and `Page X of Y`.

## Reference sheet (checked 2026-11-02)

What the Brighton PDF shows, beyond the column list below:

- Page size is **Legal (8.5×14) landscape**, not Letter. (The scan's pages are 612×1008 pt portrait with the
  content turned sideways: it was printed landscape and scanned portrait.)
- Title is two centered lines: `Brighton Committee` (large, bold), then the meeting name
  (`MCDC Reorganization Meeting`, smaller, bold). No meeting date is printed. **The title is on page 1 only.**
  Pages 2-19 start straight at the table header band.
- **The table header band repeats on every page.** Page 1 holds 7 rows (it also carries the title); every later
  page holds 8.
- The table header is a filled dark-blue band with white uppercase text. Body rows have light borders.
- 7 members on page 1, then 8 per page (151 members = 7 + 18 full pages of 8; page 19 is full). Corrected
  2026-11-07: this line first said 8 on page 1 and 7 on page 19. A short last page just ends: no filler rows. Each row is two lines tall (value, then the `[ ] Info correct` / `New email:` / `New phone:` line,
  in smaller grey text). `[ ]` is literal text, not a form control.
- Approximate column widths: ED 4%, Member name 21%, Email 26%, Phone 13%, Member signature 17%, Proxy name
  (print) 10%, Proxy signature 10%. `PROXY NAME (PRINT)` and `PROXY SIGNATURE` wrap to two header lines. There is
  a heavier vertical divider before the proxy columns.
- Names print as `LAST, FIRST M` with no period after the initial. Same-surname members sort by first name
  (e.g. three `WILT`s in first-name order). The reference has no vacancy rows: it lists people, not seats.
- Footer: `Brighton Democratic Committee | 2026 Reorganization Sign-In Sheet | 151 eligible members | Contact info
  as of 9/23/2026`, then `Page 1` on the right. No `of Y`. The footer names the meeting too, and its contact-info
  date (9/23) is earlier than the file's scan date (9/28), so it is probably the data date, not the print date.

## Target format

- **Legal (8.5×14) landscape** pages, matching the reference.
- **One sheet per committee**: a town, or an LD for Rochester. Each committee starts on a new page.
  - Group `CommitteeList` rows by `cityTown` for towns, and by `cityTown` + `legDistrict` when
    `cityTown === 'ROCHESTER'`. A town that spans several LDs is still one sheet.
  - Countywide scope gives one sheet per town plus one per Rochester LD. Jurisdiction `ROCHESTER` with no LD gives
    one sheet per LD.
  - Sheet order: alphabetical by `cityTown`, with Rochester's LD sheets (by LD number) at `ROCHESTER`'s
    alphabetical position. This is the order `fetchSignInSheetData` already returns.
- **Sorted alphabetically by last name across the whole committee**, not grouped by ED. Tie-break on first name,
  then middle initial, then LD, then ED, then `VRCNUM` (so the order is deterministic). Compare case-insensitively
  (`localeCompare(…, 'en', { sensitivity: 'base' })`); null name parts compare as `''`.
- Lists ACTIVE members only. Vacant seats get no row. A member with a pending Exit Report is still `ACTIVE`
  (ADR 0002) and still appears and counts.
- Title block, on the **first page of each sheet only**: `<Committee> Committee`, with a meeting line underneath.
  `<Committee>` is the town name (stored uppercase in `CommitteeList.cityTown`, so it needs title-casing per word:
  `BRIGHTON` → `Brighton`, `EAST ROCHESTER` → `East Rochester`), or `Rochester LD <n>` (unpadded) for Rochester.
  When a Leader's jurisdiction is a town narrowed to one LD, add the LD: `<Town> LD <n> Committee`.
  Decide this from the job's resolved scope (`scope === 'jurisdiction'` and a non-Rochester town with a
  `legDistrict` set), not from the rows. `fetchSignInSheetData` ignores `cityTown` and `legDistrict` on a countywide
  job, and the schema still accepts them there, so a countywide job never gets an `LD <n>` title.
- Meeting line: `<meetingName> — <formatted meetingDate>` when both are given, whichever one is given otherwise,
  and no line when neither is. Format the date as `March 15, 2026`. `meetingDate` is a Calendar Date
  (`YYYY-MM-DD` from an `<input type="date">`): format it from its Y/M/D parts. Don't run it through
  `new Date(iso)`, as today's `formatMeetingDate` does, because that parses as UTC midnight and prints the day
  before on a server in a UTC-negative timezone.
- The table header band repeats at the top of every page of the sheet.
- Columns:
  | Column | Content |
  | --- | --- |
  | ED | serving ED number (`CommitteeList.electionDistrict`), unpadded (`21`, not `021`) |
  | Member name | `LAST, FIRST M SUFFIX` in bold, from `VoterRecord.lastName`, `firstName`, `middleInitial`, `suffixName` (null/blank parts dropped; no period after the initial; drop the comma when the last name or everything after it is empty), with an `[ ] Info correct` line under it |
  | Email on file | resolved member email (see Member contact below), with a `New email:` blank under it |
  | Phone on file | resolved member phone (see Member contact below) formatted `(585) 555-1234`, with a `New phone:` blank under it |
  | Member signature | blank |
  | Proxy name (print) | blank |
  | Proxy signature | blank |
- Member contact: use the Leader-entered value first, then the voter record: `submissionMetadata.email`, else
  `VoterRecord.email`; `submissionMetadata.phone`, else `VoterRecord.telephone`. Each field falls back on its own.
  Leader-entered contact lives only on `CommitteeMembership.submissionMetadata`, because voter imports overwrite the
  `VoterRecord` fields. This is the SRS 2.1a rule (`docs/SRS/SRS_GAPS_AND_CONSIDERATIONS.md`), the tooltip in
  `ContactInfoLabel.tsx` promises it, and `buildSeatRosterRows.ts` already does it.
- Missing email or phone (null or whitespace-only after that fallback) prints **`None on file`** in red italics.
- Phone formatting (applies to the resolved phone, Leader-entered or not): strip non-digits. 10 digits, or 11 starting with `1`, formats as `(585) 555-1234`. Anything
  else prints as stored (trimmed). No phone formatter exists in the report server yet; add it with the other pure
  helpers (see Code map) and unit-test it.
- Fixed rows per page, so the footer never gets pushed off: **7 rows on a sheet's first page** (which also carries
  the title) **and 8 on every later page**, matching the reference. A sheet with `N` members has 1 page when
  `N <= 7`, otherwise `1 + ceil((N - 7) / 8)`. Row height is the same on every page. If the rows cannot fit
  legibly, report the failing fixture and revise this decision and the acceptance expectations together before
  claiming completion.
- Long values must not break the layout: names wrap within their cell, and emails may break anywhere
  (`break-all`). Choose a row height that still fits the fixed row counts when a name or email wraps to a second
  line. Long names and emails shrink to fit two lines instead of growing a third: see
  [Type scale and text fitting](#type-scale-and-text-fitting-2026-11-07).
- Page boxes: the current component gets its page breaks only from each page `div` being exactly paper-sized
  (`w-[8.5in] h-[11in]`). The `page-break` class it renders has no CSS rule anywhere (`src/styles/tailwind.css`
  only has the three `@tailwind` directives). Size each page `div` to `w-[14in] h-[8.5in]` with
  `overflow-hidden`, or add a real `break-after: page` rule. New arbitrary Tailwind classes only reach
  `public/tailwind.css` after `pnpm --filter node-pdf-generation build:css` (the `start` script runs it).
- Header band and red text need `printBackground: true`, which `generatePDFAndUpload` already sets.
- Footer on every page: `<Committee> Democratic Committee | <meetingName> Sign-In Sheet | <N> eligible members |
  Contact info as of <date>` on the left (`Sign-In Sheet` alone when there's no meeting name; `Democratic` is
  hardcoded, as in `CommitteeReport.tsx`), and `Page X` on the right. `N` is the number of ACTIVE members on the sheet, which is
  that sheet's row count, because `fetchSignInSheetData` already filters to `status: 'ACTIVE'` in the active term.
  Page numbers restart at 1 for each sheet.
- Contact-info date: `completedAt` of the latest `Report` with `ReportType: VoterImport` and `status: COMPLETED`
  (set by `apps/frontend/src/app/api/reportComplete/route.ts`; also filter `deleted: false`), formatted `M/D/YYYY`
  in `America/New_York`. `completedAt` is an Instant and the report server has no `TZ` set, so pass
  `timeZone` explicitly. That is when the BOE data in the app was last loaded. Fall back to the generation date
  when there is no completed import (also formatted `M/D/YYYY` in `America/New_York`). Don't use `VoterRecord.lastUpdate`: it's the BOE's per-voter registration
  change date, differs per member, and says nothing about when the contact data was pulled. (The BOE file's own
  export date isn't stored anywhere, so import time is the best available.) Look it up once per job and pass it
  into the HTML generator, so the pure helpers stay DB-free. The date describes the BOE data; a Leader-entered value
  can be newer, and that's fine.
- A committee with no ACTIVE members still gets a sheet: title, header band, no rows, `0 eligible members`,
  `Page 1`. In a town with several `CommitteeList` rows, the sheet is empty only when all of them are.
- No blank rows for walk-ins (theirs has none). Delete the `BLANK_ROWS` constant. It is hardcoded in the
  component, not a schema or registry option, so no schema change is needed for it.
- The report author no longer appears on the page.

## Code map

- Component: `apps/report-server/src/components/SignInSheet.tsx`. Rewrite the props as sheets (committee label +
  sorted rows) and stop passing per-ED committees.
- Transform: `transformToSignInSheetCommittees` (private) and `generateSignInSheetHTML` in
  `apps/report-server/src/utils.ts`. `transformToSignInSheetCommittees` currently builds name/address with
  `convertPrismaVoterRecordToAPI` + `applyCompoundFields`; address is no longer used, so drop it.
  `generateSignInSheetHTML` keeps its role (render + wrap in the HTML shell); change its signature to take the
  resolved scope (`cityTown`, `legDistrict`), `meetingName`, `meetingDate` and the contact-info date, and drop
  `reportAuthor`.
- Pure helpers (grouping into sheets, sorting, title/label, name, phone, Calendar Date formatting, page
  chunking): put them in a module that does **not** import `utils.ts`, e.g. a new
  `apps/report-server/src/signInSheetHelpers.ts` or exported from the component file (the precedent is
  `groupWeightSummaries` in `components/DesignationWeightSummary.tsx`). `utils.ts` imports puppeteer and
  `s3Utils.ts`, which builds an S3 client at import time, and no test imports `utils.ts` today.
- Data: `fetchSignInSheetData` in `apps/report-server/src/committeeMappingHelpers.ts` already loads the full
  `voterRecord` (including `email`, `telephone`, name parts) and the membership's `submissionMetadata` for ACTIVE
  memberships in the active term. No query change is needed.
- Member contact helper: add one pure function, e.g. `resolveMemberContact(membership)` in a new
  `apps/report-server/src/memberContact.ts`, with no runtime imports so both the sign-in sheet transform and
  `committeeMappingHelpers.ts` can use it. `submissionMetadata` is Prisma `Json`, and its TypeScript shape
  (`CommitteeMembershipSubmissionMetadata`) is in the frontend, so narrow it in the helper: only a non-blank string
  counts as a value.
- Committee Roster (same contact gap, fixed here): `mapCommitteesToReportShape` in `committeeMappingHelpers.ts` calls
  `mapVoterRecordToMember(membership.voterRecord)`, which drops the membership. Apply the resolved `email` and
  `telephone` there, before the member is built. The roster PDF and XLSX both read this payload, so that one change
  covers both. The legacy `ldCommittees` report shares this function and gets the same fix, which is intended.
- Worker: the `signInSheet` branch in `apps/report-server/src/index.ts` (~line 317). Change
  `generatePDFAndUpload(html, false, fileName, { format: 'Letter', landscape: false })` to
  `{ format: 'Legal', landscape: true }`. `PDFPageOptions` (`utils.ts`) is a local type whose `format` is
  already `'Letter' | 'Legal'`, so no type change is needed; update its doc comment, which cites sign-in sheets as
  the Letter-portrait example. Call the contact-info date lookup here and pass `meetingName` through from
  `jobData`. Pass `cityTown` and `legDistrict` to the generator only when `scope === 'jurisdiction'`.
- Contact-info date lookup: add the `Report` query (the report server doesn't query `Report` anywhere yet) to
  `committeeMappingHelpers.ts`, not `index.ts`, so it can be tested with that file's existing `../lib/prisma` mock.
  Keep the `M/D/YYYY` formatting and the fallback in a pure helper.
- Schema and registry: `signInSheetReportSchema` (`packages/shared-validators/src/schemas/report.ts`) and
  `SCOPE_REPORT_REGISTRY.signInSheet` (`extraFields: ['meetingDate']`). Add an optional `meetingName` (trimmed
  string, max 100 chars, empty → omitted) to both. `extraFields` is not read by any code today (only declared
  in the registry), so adding it there is for consistency, not wiring. Follow [skills/adding-reports/SKILL.md](../../../skills/adding-reports/SKILL.md)
  steps 3–5: schema, registry `extraFields`, `ScopedReportForm` state/JSX/`buildPayload` (the `meetingDate` input
  is at ~line 503; the `signInSheet` `buildPayload` case is at ~line 256), and the Sign-In Sheet row of
  `docs/SRS/REPORT_PARAMETER_MATRIX.md` (currently "Meeting date (optional)"). Schema tests go in
  `packages/shared-validators/src/__tests__/schemas/report.test.ts`.
- Frontend copy: `pageDescription` / `gridDescription` for `signInSheet` in
  `apps/frontend/src/components/reports/scopeReportUiRegistry.ts` both read "Generate sign-in sheets for committee
  meetings with member names and signature lines." That is still true; optionally mention contact-info
  confirmation and proxies.
- Tests:
  - `apps/report-server/src/__tests__/SignInSheet.test.tsx` uses `renderToStaticMarkup` + `toContain` and has no
    snapshot files. Its current assertions (`LD 01`, `ED 042`, `123 Main St`, `Notes`, the author, `Meeting:`)
    will break, so replace them. Its meeting-date test only checks `March` and `2025`, which hides the
    off-by-one-day bug above; assert the full day.
  - Frontend `apps/frontend/src/app/sign-in-sheet-reports/__tests__/SignInSheetForm.test.tsx` and
    `apps/frontend/src/__tests__/components/reports/ScopedReportForm.test.tsx` gain `meetingName` input and payload
    cases.
  - `apps/report-server/src/__tests__/committeeMappingHelpers.test.ts` already covers
    `mapCommitteesToReportShape` and mocks Prisma: add the roster contact and date lookup cases there.

## Decisions (2026-11-02)

1. Page size: Legal landscape, matching the reference.
2. Meeting name: new optional free-text `meetingName` input. The date still prints when given.
3. "Contact info as of": latest completed voter import, falling back to the generation date (see Target format).
4. `Democratic` in the footer is hardcoded.
5. A committee with no ACTIVE members prints a header-only sheet with `0 eligible members`.
6. A Leader limited to one LD of a town gets `LD <n>` in the title.
7. The name includes the suffix: `LAST, FIRST M JR`.
8. (2026-11-07) Contact is the Leader-entered value first, then the voter record (SRS 2.1a), on the sign-in sheet and
   on the Committee Roster PDF and XLSX.
9. (2026-11-07) Type scale matches the reference everywhere. The title, subtitle, header labels and footer take the
   measured reference sizes. The row text grows to the reference size too, and a name or email that would need a
   third line steps down in size (15.5 → 13 → 11 px) instead of being cut off. The size is chosen on the server
   from font width tables, not measured in the browser, so it survives a later move away from Chrome. Details in
   [Type scale and text fitting](#type-scale-and-text-fitting-2026-11-07).

Known deviation from the reference: Brighton's title says `MCDC Reorganization Meeting` while its footer says
`2026 Reorganization Sign-In Sheet`. With one `meetingName` field, both use the same text (decision 2).

## Type scale and text fitting (2026-11-07)

This follows the Poppler re-verification (see Comments), which found the reference text 7–27% larger than ours.
Start from `0f10f7d` on `sign-in-sheet-redesign` (PR #139) and land it as a new commit on that branch. PR #139
targets `share-committee-member-target-schema`, which was force-pushed on 2026-11-08: before committing, check
that the branch still sits on its base, and stop and report if it doesn't.

### Sizes

Use exact arbitrary values (`text-[19px]`, etc.), not the nearest Tailwind step. The targets are the sizes measured
from the reference at 144 dpi:

| Element | Now | Target |
| --- | --- | --- |
| Title (`<Committee> Committee`) | 24 px (`text-2xl`) | 26 px |
| Subtitle (meeting line) | 16 px (`text-base`) | 19 px |
| Header band labels | 13 px | 15 px |
| Footer | 11 px | 12 px (corrected 2026-11-08 from 14 px; see Comments) |
| Value line (name, email, phone) | 14 px | 15.5 px, or a fitted step (below) for names and emails |
| Second line (`[ ] Info correct`, `New email:`, `New phone:`) | 13 px | 15.5 px, never fitted |

Scale each line height with its size, keeping today's ratio. Row height stays fixed at 0.75 in (72 px), and the
counts stay 7 rows on a sheet's first page and 8 after. The header band and title get taller, so re-check that
page 1 still fits 7 rows plus the footer.

### Fitting long names and emails

Each name and email value gets one of three sizes: **15.5, 13 or 11 px**. Use the largest size at which the value
fits in **2 lines or fewer**. If it still needs more than 2 lines at 11 px, print it at 11 px and let it wrap: 3
lines at 11 px plus the second line still fit in the row. Never truncate, ellipsize or clamp; people sign against
these names and check these emails.

- **Names** wrap at spaces. Simulate the wrap greedily, word by word, against the usable width. A word longer than a
  whole line breaks by character, as `break-words` does. Don't divide total width by line width: a long last name
  followed by a short first name can need 2 lines even when the total is 1.6 lines.
- **Emails** break anywhere (`break-all`), so the line count is total width ÷ usable width, rounded up.
- **Phones** are not part of the decision as discussed, because formatted numbers fit. A phone that doesn't format
  prints raw (see the `extension-…` fixture). Apply the email rule to raw phone values so they can't overflow either.
- **Safety margin:** treat the usable width as 90% of the measured content width.
- **Usable width** comes from constants that the component and the fitter both import: page width, page padding,
  column percentages and cell horizontal padding and borders. Move the column percentages out of the component
  into those constants, so a later column change can't silently break fitting.

### Width tables

- Use **Liberation Sans** advance widths (SIL Open Font License). Production renders with Liberation Sans in place
  of Arial (`fonts-liberation` in `infrastructure/scripts/01-install-dependencies.sh`), and its widths match
  Arial's, so the same table is right on macOS (real Arial) and in production.
- Two tables: **Regular** for emails and phones, **Bold** for names.
- Cover printable ASCII, Latin-1 Supplement and Latin Extended-A, so accented letters in Western names get their
  real width. Any character outside the table (CJK, emoji, anything else) gets the **widest** width in that
  table, so an unknown character can only make text shrink sooner, never overflow.

### Where it lives

- A new pure module in `apps/report-server/src/` (next to `signInSheetHelpers.ts`), with no React, Puppeteer or
  `utils.ts` import, so it can move with a future renderer.
- The component asks it for each name's and email's size and renders `data-sign-in-text-size="15.5" | "13" | "11"`
  on the value element, matching the existing `data-sign-in-*` hooks.
- **No script in the page**, and no change to `generatePDFAndUpload` or any other report.

### Rejected options

- **Measuring in the browser** with an inline script: exact, but it only works in a browser renderer, and
  WeasyPrint, Typst and `@react-pdf/renderer` would not run it. It also fails silently if the script breaks.
- **Plain character count:** less code, but wrong at the edges (`WILLIAMSWORTH` is much wider than `LILLIAN`).
- **Truncating to 2 lines, or tightening spacing to keep 3 lines at full size:** truncation drops part of a name
  people sign against, and 3 lines at 15.5 px don't fit the row.
- **Enlarging only the title, subtitle, header and footer:** leaves the row text 10–19% small, so visual review
  would still fail.

### Checks before and after

- Before choosing the final steps, look at a few pages of the reference (`data/Brighton_09282026102755.pdf`,
  gitignored) to see whether any name wraps there. This is for the record only and doesn't change the decision.
  Follow the private-reference handling in Visual comparison.
- Follow-up, not blocking: once Postgres is running, count real names and emails long enough to need fitting, so
  we know how often it triggers. Note the result in the PR.

## Out of scope

- The Brighton sheet also shows `Email bounced, please update`. We have no bounce data: that would come from the
  planned email-sending work (`.scratch/email-sending/`, Resend delivery webhooks in its ticket 06). The
  follow-up is
  [email-sending 09](../../email-sending/issues/09-voter-email-bounce-flag.md); don't build it here.
- Access stays as it is today (Leader+, jurisdiction-scoped). The Admin-only rule applies to the monthly reports,
  not to this sheet.

## Layout verification (during implementation)

Follow the shared [report layout verification runbook](../../report-layout-verification.md) with this contract.
Run a focused fixture while editing, then the full set on final code and CSS. This is a development check, not
CI. Executable scripts and output stay in ignored scratch storage; the runbook and ticket preserve the recipe.
The goal is the same structure and overall quality as the reference, not a pixel match.

**Validation status:** run `2026-11-07T21-35-30-437Z` passed automated checks and five failure controls using
Swift/PDFKit; visual review is recorded in the first-run notes (see Comments). The saved results still mark visual
review PENDING and need a dated reconciliation. E2E remains unchecked. Poppler is now the standard for subsequent
runs; migration of the local runner and a complete Poppler-backed verification have not yet been validated.

### Render adapter

Call the real `generateSignInSheetHTML` with synthetic fixtures. Inline `public/tailwind.css` in place of its
stylesheet link, asserting exactly one replacement. Copy the current launch args and print options from
`generatePDFAndUpload`, with the worker's intended `{ format: 'Legal', landscape: true }` override and
`printBackground: true`. Call Puppeteer's `page.pdf`, never the upload function. The runbook covers setup,
module resolution, readiness and cleanup.

Importing `utils.ts` imports `s3Utils.ts`, which loads the local `.env` and constructs an S3 client. This is not
an environment-isolated render; never log environment values. The generator itself does not upload. The earlier
1008×612 pt smoke PDF was generated with `[]`, which renders no sheet. It does not validate an empty committee.
The local render does not replace the end-to-end acceptance check of the worker's options and full pipeline.

### Deterministic fixtures

All synthetic; never use real voter data. Assign unique printable surname tokens `MEMBER0001`, etc., first name
`TEST`, email `member0001@example.invalid`, phone `5855550100`, and ED 1 unless overridden. Use disjoint token
ranges across sheets. Pin contact-info date to `9/23/2026`, meeting name to `MCDC Reorganization Meeting`, and omit
meeting date unless specified. Store exact inputs and expected ordered tokens per page in the run manifest,
independently of the production pagination helper. Set metadata explicitly so contact fallback is deterministic.

| Fixture | Expected result / purpose |
| --- | --- |
| Brighton, 151 members | 19 pages; 7 rows on page 1 and 8 on pages 2–19 |
| Brighton, 17 members, then Rochester LD 26 with 1 member | 4 physical pages; 7/8/2 then 1 row; page labels 1/2/3/1 |
| East Rochester LD 26 jurisdiction, 7 members; first name `ALEXANDRA ALEXANDRA ALEXANDRA`, surname token + ` MONTGOMERY MONTGOMERY`, email token + `abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz@example.invalid`; meeting name `Reorganization ` repeated 6 times + `Meeting XX` (100 characters); date `2026-03-15` | Full first page, narrowed-town title, long footer; assert each designated name and email actually spans at least two text lines |
| Brighton, 1 member; email token + `a` repeated 64 times + `@example.invalid`, surname token + ` MONTGOMERY MONTGOMERY`, suffix `JR`, phone `extension-12345678901234567890` | Unbroken values and raw phone; no cell overflow |
| Brighton, 8 members with null email and phone in metadata and voter record | 2 pages (7 + 1); 16 occurrences of `None on file` |
| One Brighton committee with 0 active members, not an empty committee list | 1 page, title, header, footer, 0 body rows |

If the designated wrapping fixture stays on one line, it has not exercised wrapping: record that failure and
adjust its literal values once, saving them in the manifest for all subsequent runs.
Record maximum observed lines per name/email: the first run produced three-line names. Keep those stress inputs
and fit their observed height within the required row height rather than assuming exactly two lines.
With text fitting (decision 9), the wrap fixture's designated names and emails must render at a fitted size
(`data-sign-in-text-size` below `15.5`). That replaces the old "spans at least two lines" proof that the fixture
exercises wrapping.

### Measured checks

Use print media and a 1344×816 viewport (14×8.5in at 96 dpi). First assert expected counts for page boxes, tables,
headers, footers and member rows. Missing selectors fail; they never produce an empty passing loop. Use the
runbook's tolerances and clipping checks. Measure every page and cell, including long-value fixtures:

- Page and cell scroll overflow, text bounds, and clipping by intermediate containers.
- Title/table/footer intersections; table ends above footer; left footer text stays clear of `Page X`.
- Equal member-row heights across all pages and fixtures (including partial last pages).
- Column widths as shares of the table width: normalize the approximate reference ratio 4/21/26/13/17/10/10
  (sum 101), then compare within 2 **percentage points**, not 2 PDF points.
- Type scale (decision 9): the computed font sizes of the title, subtitle, header labels, footer and second lines
  equal their targets. Every name and email takes 2 lines or fewer, unless its `data-sign-in-text-size` is `11`.
  No text anywhere on the sheet is smaller than 11 px.
- New failure control: turn fitting off (every value at 15.5 px). On the wrap fixture this must fail the line-count
  or overflow check.

Check the PDF as well:

- Page count equals the sum across sheets of 1 when `N <= 7`, else `1 + ceil((N - 7) / 8)`, without extra blank pages; each page is
  1008×612 pt.
- Extract per-page text with Poppler `pdftotext`, using the runbook's per-page commands. Check header
  labels, correct `Page X`, and title only on each sheet's first page. A title substring also present in the
  footer cannot serve as the title-presence assertion.
- Compare exact expected ordered member tokens on each page, each once, plus expected contact values and
  missing-contact counts. Normalize wrapping whitespace, not missing characters. This catches omitted or
  duplicated members even when row geometry looks correct.

### Visual comparison

The reference is a scan with no usable text layer (previously measured: 37 characters across 19 pages).
Use Poppler as the standard backend: `pdfinfo` for page count and every page's dimensions, `pdftotext` for
generated per-page text, and `pdftoppm` for PNGs, following the runbook's preflight and commands. Render at
144 DPI, then use `sips -r 270` on the reference PNGs on macOS. The scan's content is sideways with no rotation
flag; rotate only reference renders, not generated landscape pages. Poppler does not add a text layer to the scan.
If Poppler is unavailable, the previously tested macOS fallback is Swift PDFKit (`PDFPage.string`, page bounds,
and `PDFPage.draw(with: .mediaBox, to:)` into a white `CGContext`) plus `sips`. Record fallback use explicitly;
if no equivalent backend or required rotation tool is available, report the affected checks BLOCKED.

View reference pages 1, 2 and 19 beside the matching 151-member fixture pages at the same width. Compare title
size/weight/position, header color/height/text, column proportions and proxy divider, row height and signing
space (reference rows about 0.75in), type sizes, grey second lines, footer position and margins. Also inspect
every page of the remaining fixtures for wrapping, red italic `None on file`, empty-state layout and clipping.

Expected differences: handwriting, scan noise, actual member data, out-of-scope bounce messages, and meeting/footer
wording described in Decisions. Record any other difference as a defect or an explicit decision to revise the target.

Reference images contain real names, contact details and signatures. Keep them in the ignored run directory's
`private-reference/` subdirectory; delete that subdirectory after comparison. Never commit, publish or attach
reference images or side-by-sides to a PR. PR screenshots show synthetic fixtures only.

## Acceptance

- [x] [Layout verification](#layout-verification-during-implementation) comes back clean on every fixture, and the
      hand-off uses the runbook results table for each fixture/check, lists page pairs and remaining visual
      differences, and records successful failure-sensitivity checks. FAIL, BLOCKED or an unrun required check
      leaves this item unchecked.
- [x] End-to-end check: the rendered PDF matches the column layout, sort order, red `None on file`, header band and
      footer above, on Legal landscape pages. Generate one through the Sign-In Sheet page (frontend + report server
      against a seeded DB) for a town and for a Rochester LD with more than 8 members. Confirm the page size is
      14×8.5in landscape (Preview's inspector), the title is on page 1 only, the header band is on every page, and
      no page overflows onto an extra blank page. This needs Postgres and uploads to the R2 bucket in `.env`. If the
      agent can't run it, say so in the hand-off and leave it unchecked for the maintainer; don't skip it silently.
      Screenshots of page 1 and a continuation page go on the PR (seed/test data only, no real voter data).
- [x] Type scale (decision 9): the title, subtitle, header labels, footer and second lines use the target sizes,
      and names and emails fit at 15.5, 13 or 11 px as specified in
      [Type scale and text fitting](#type-scale-and-text-fitting-2026-11-07). The page has no script, and
      `generatePDFAndUpload` is unchanged.
- [x] `SignInSheet.test.tsx` render tests for fitting, through the rendered HTML (`data-sign-in-text-size`), not
      the width tables directly:
      - a short name at `15.5`;
      - a name that needs 3 lines at 15.5 px but 2 at 13 px renders at `13`;
      - a very long name at `11`;
      - a long last name with a short first name, whose total width is under 2 lines but whose wrapped width
        isn't, still steps down;
      - a long email steps down;
      - a value with characters outside the table (CJK or emoji) steps down sooner than the same length in
        ASCII;
      - the second lines are never fitted.
- [x] Layout verification re-run on the final code with all six fixtures and all six failure controls, including
      the fitting-off control. Visual review at 144 dpi re-measures type scale against reference pages 1/2/19,
      and every target element is within about 5% of the reference. The results table is updated in
      `.scratch/report-layout-verification-notes.md`.
- [x] The Verification section of PR #139's description is updated with the type-scale result. Don't push; the
      maintainer pushes.
- [x] Rochester produces one sheet per LD; towns produce one sheet per town (including a town with committees in
      two LDs). Each sheet starts on a new page, and its page numbers restart at 1.
- [x] Unit tests for the pure helpers: grouping (town vs Rochester LD), sort across EDs with tie-breaks, name
      formatting with missing middle initial, and phone formatting (10-digit, 11-digit with leading 1, other/raw,
      empty).
- [x] Unit tests for `resolveMemberContact`: Leader-entered value wins, each field falls back on its own, and null
      metadata or a blank or non-string value falls back to the voter record.
- [x] Committee Roster: a `mapCommitteesToReportShape` test shows a member's Leader-entered email and phone replace
      the voter record values, and a member with null metadata keeps them.
- [x] `SignInSheet.test.tsx` render test covering a member with no email and no phone (`None on file` twice),
      alphabetical ordering across EDs, unpadded ED, the footer count, and no blank rows.
- [x] Pagination test: a 17-member sheet renders 3 pages (7/8/2) numbered `Page 1`-`Page 3` with the header band
      on each and the title once; two sheets in one job restart at `Page 1`; the output has no
      `Page X of Y` and no report author.
- [x] `meetingName` added per [skills/adding-reports/SKILL.md](../../../skills/adding-reports/SKILL.md) (a
      "Meeting name (optional)" input next to Meeting date), with schema tests (accepts, trims, rejects over 100
      chars) and form payload tests.
- [x] Footer date comes from the latest completed, non-deleted voter import, or the generation date when there is
      none, formatted `M/D/YYYY` in `America/New_York` (unit-test the fallback and an import completed late in the
      evening Eastern time, which must not roll to the next day). A lookup test asserts the query filters on
      `VoterImport`, `COMPLETED` and `deleted: false`, and takes the latest `completedAt`.
- [x] Meeting date `2026-03-15` prints `March 15, 2026` regardless of the process timezone.
- [x] Render tests also cover: suffix in the name, the meeting line with name only / date only / both / neither,
      a header-only sheet with `0 eligible members`, the `LD <n>` title for a narrowed town, and no `LD <n>` title
      on a countywide job that carries a stray `legDistrict`.

## Comments

2026-11-07, readiness review: checked against the code at `3702885`. Changed the contact source to follow SRS 2.1a
and added the Committee Roster fix, since both share one helper. Also added the countywide title guard, moved the
date lookup to a testable module, let the end-to-end check pass to the maintainer if the agent can't run it, and
refreshed line numbers.
Start from `3702885` or later: it changes `ScopedReportForm.tsx`, `report.ts` and `utils.ts`, and it may not be on
`main` yet. This ticket file is also untracked, so a fresh worktree won't have it.

2026-11-07, verification-process review: distinguished the empty-list smoke run from layout validation; made
eight rows the consistent acceptance target; added deterministic fixtures, member conservation, missing-selector
failures and a shared runbook. This is a reviewed procedure, not evidence that the verifier or redesign passes.

2026-11-07, implementation: viewing the reference showed 7 rows on page 1 and 8 on pages 2–19, not 8 then 7 as
written above. The user chose to match the reference, so pagination, fixtures and acceptance now use 7 then 8.
Implemented in `0f10f7d` on `sign-in-sheet-redesign` (based on `e4e9847`). Layout verification run
`2026-11-07T21-35-30-437Z` passed all fixtures, the five failure controls and visual review. Runbook field notes are in
`.scratch/report-layout-verification-notes.md`. The end-to-end check is left for the maintainer (needs Postgres and an R2
upload).

2026-11-07, Poppler re-verification (PR #139, `0f10f7d`): run `2026-11-07T23-02-32-254Z` with Poppler 26.11.0 as the
PDF backend, no Swift fallback. All 98 automated checks pass on every fixture, and all five failure controls fail for
the intended reason. Rows are 72 px everywhere, and column shares are within 0.08 pp of the reference ratio. One
extraction change: content assertions use `pdftotext -raw`, because `-layout` interleaves the wrapped lines of
adjacent cells (`PROXY SIGNATURE` and 3-line emails read as missing). `-layout` text is still extracted and saved
for review, and the controls were rerun after the change.
Visual review at 144 dpi (reference pages 1/2/19 against the 151-member fixture, plus all 9 pages of the other
fixtures): layout and geometry match within a few pixels, with no clipping, overlap or empty-state problems. **One
difference is open: type scale.** The reference text is measurably larger (ink width and cap height, reference/
generated): subtitle 1.20, header labels 1.17, second lines 1.19, value line 1.10, title 1.07, footer about 1.27. That
is roughly 19/15/15.5/15.5/26/14 px against the component's 16/13/13/14/24/11 px. The first run viewed at 80 dpi and
did not record this. Because of this FAIL, the layout-verification acceptance item is unchecked again.
Decision needed (maintainer): (1) enlarge the headers, subtitle and footer only, with no row-height impact; (2)
enlarge everything and cap names at 2 lines, since 3-line names do not fit a 0.75 in row at the larger size; or (3)
accept the smaller scale as a known deviation and re-check the item. E2E is still left for the maintainer. Details,
including the results table, are in `.scratch/report-layout-verification-notes.md` under "Second run".

2026-11-07, type-scale decision (maintainer): this resolves the open decision above. Match the reference everywhere,
not one of the three listed options as written. The title, subtitle, header labels and footer take the measured
sizes. The row text grows to 15.5 px, and a name or email that would need a third line steps down to 13 or 11 px
instead of being cut off. The size is chosen on the server from Liberation Sans width tables, not by a script in
the page, because a move away from Chrome is under consideration and an in-page script would not survive it.
Recorded as decision 9 with a full section and acceptance items above. The ticket is back to `ready-for-agent` for
this follow-up only; the earlier checked items stand. The runner and its fixtures live under the gitignored
`apps/report-server/data/`, so do this in the main checkout, not a fresh worktree.

2026-11-08, type-scale implementation: PR #139's old base was rewritten and merged into `main` (#138), so the branch was
rebased onto `main` (`c50dbd3`; the two duplicate commits dropped out, no conflicts) and decision 9 landed as `1461e9a`.
Sizes come from `signInSheetTextFit.ts` with Liberation Sans 2.1.5 width tables (`signInSheetFontWidths.ts`, identical to
macOS Arial for all 319 code points). Geometry moved to `signInSheetLayout.ts`. No script in the page, and
`generatePDFAndUpload` is unchanged.
**Footer target corrected from 14 to 12 px.** Visual review at 144 dpi measured a 14 px footer at 0.83 (width) and 0.87
(cap height) of the reference, while the title matched exactly. The second run's "~1.27" footer ratio was a misread of
light-grey scan text. 12 px brings it within 2-4%. This follows decision 9's rule (the measured reference size); only the
number in the table changed.
Final layout run `2026-11-08T07-42-40-431Z` on clean `1461e9a`: 117/117 automated checks and 6/6 failure controls
(including fitting-off) pass. Visual review passed on run `2026-11-08T07-35-27-933Z`, whose output is byte-identical.
Self-review found that Chrome also breaks names after a hyphen, which the first fitter missed; that's fixed with a test. Every type target is within 5% of reference pages 1/2/19. Results are in
`.scratch/report-layout-verification-notes.md` under "Fourth run". Wrap-fixture names fit at 11 px (3 lines) and emails
at 13 px. Reference check for the record: no name wraps on reference pages 1, 2 or 19.
Real-data follow-up (local DB, counts only): 0 of 2,919 ACTIVE members' names, emails or phones need fitting, and 0 of
495,049 voter records do. E2E is still left for the maintainer. Not pushed.

2026-11-08, closed: PR #139 was merged into `main` (`024e39b`), deployed and tested in production by the maintainer.
That covers the end-to-end check, which was the only item left for the maintainer. Every acceptance item is now checked.
