# 06 - Cleaner mobile layout, especially name search

Status: ready-for-human

## Ask (verbatim)

> People are gona want cleaner mobile version, especially for searching names

## Decisions (2026-11-15)

- Pages in scope: **record search** and **the committee pages**. These are the pages leaders use on phones.
- Record search gets a quick name box **alongside** the existing criteria builder, on every width. The
  builder isn't hidden on mobile.

## Scope

### Committee pages: covered elsewhere, not rebuilt here

The committees workspace (`app/committees/workspace/`) was designed for phones: list ↔ detail navigation
below `md`, a full-screen action drawer, a sticky actions column in the roster, and no horizontal overflow
at 375px. That work is tracked in `.scratch/committees-workspace/`:

- [15](../../committees-workspace/issues/15-responsive-and-accessibility-verification.md): the agent
  pass is done. The human pass (15b, a real iOS Safari and Android Chrome phone on real data) is still open.
- [16](../../committees-workspace/issues/16-cutover-and-cleanup.md): cutover. Until then, `/committees`
  only shows the workspace when `COMMITTEES_WORKSPACE=1`. Otherwise it renders the legacy
  `CommitteeSelector`, which has no mobile layout.

Production has `COMMITTEES_WORKSPACE=1` (confirmed 2026-11-15), so leaders and admins see the workspace,
not the legacy page. The remaining committee work is 15b (the real-phone pass) and 16 (cutover). Nothing on
the committee pages is rebuilt here.

### App header (both pages)

Workspace ticket 15 found that at 375px `app/components/header.tsx` scrolls sideways inside itself, so
**Reports** and **View Profile** start off-screen. Fix it here: wrap the tabs or move them into a menu
below `lg`, so every nav item can be reached at 375px without scrolling sideways.

### Record search (`app/recordsearch/`)

Problems found by reading the code (not yet confirmed in a browser):

1. The criteria form doesn't shrink. The form is `w-max` (`VoterRecordSearch.tsx`), and each `SearchRow`
   puts the field combobox, value input and remove button side by side (`components/search/SearchRow.tsx`).
2. Results are a fixed-layout table (`VoterRecordTable.tsx`: `max-w-[80vw] table-fixed`, Name 24ch
   plus DOB/phone 15ch each plus a "See more details" button column) inside an `m-10` container
   (`RecordsList.tsx`).
3. Voter details open in a `Popover` holding a two-column `VoterCard` (`max-w-lg`). It's cramped and
   awkward to tap.
4. The export tooltip is a fixed `w-96`, wider than a phone (`RecordsList.tsx`).
5. A name search takes add-row → pick "Name" in a combobox → type → submit.

Changes:

- **Quick name box.** A first/last name search at the top of record search, above the criteria builder,
  at every width. Submitting it runs the same `/api/fetchFilteredData` search (`firstName` / `lastName`
  fields) and fills the same results list. The criteria builder stays below it, unchanged in behavior.
  Decide during implementation whether the name box and the builder combine into one query or run as
  separate searches, and write the choice under Comments.
- **Criteria rows stack** below `sm`: field picker on one line, value input full-width under it, and the
  remove button still reachable.
- **Results as cards below `md`.** Each card shows name, DOB, phone and the searched fields, and tapping it
  opens the full `VoterCard` in a full-height sheet (`ui/sheet`, as the committee drawer does) instead of
  the popover. The table stays as it is at `md` and up. Load More / Jump to Top / the record count still work.
  Once [08](08-record-search-committee-badge.md) adds committee membership to results, it goes on the
  card too.
- **`VoterCard`** goes to a single column below `sm`.
- **Margins and tooltip:** reduce `m-10` to a 16px gutter on phones, and cap the export tooltip at the
  viewport width.

### `app/components/RecordSearchForm.tsx` (committee add/request, petitions)

Its Voter ID / first / last inputs and button share one row that never wraps. Stack them below `sm`, and
replace the JS `width > 760` placeholder switch with CSS breakpoints. This form is used inside the committee
drawer flows, so it's part of "committee pages" on a phone.

## Acceptance criteria

- [x] Production's `COMMITTEES_WORKSPACE` setting is recorded: it's on (2026-11-15). The committee
      pages need only 15b and 16.
- [x] At 375px the header shows every nav item without sideways scrolling.
- [x] Record search has a first/last name box above the criteria builder. Submitting it returns matching
      voters, and the criteria builder still works as before.
- [x] At 375px record search has no horizontal page overflow (`scrollWidth == clientWidth`) before a
      search, with results, and with the detail sheet open.
- [x] Below `md`, results are cards, and tapping one opens the voter's full details in a sheet. At `md`
      and up the table is unchanged.
- [x] Criteria rows and `RecordSearchForm` stack below `sm`, with every control reachable and usable.
- [x] Existing record search tests pass. There are new tests for the name box query and for the card/sheet
      rendering below `md`.
- [x] Screenshots at 375 / 768 / 1280 are linked under Comments.

## Notes

- Ticket 05 was split: 08 adds committee membership to record search results, and 07 adds a
  committee-scoped name search. Build 07's result list card-first
  so it doesn't need its own mobile pass.
- See also `.scratch/ui-page-consistency/` and `.scratch/accessibility/`. Neither covers mobile.

## Comments

**2026-11-15, baseline screenshots.** These are from local `next dev` against the local Docker DB, signed in as
the local Leader (Rochester LD 17) and a Developer, at 375×812, 768×1024 and 1280×800 in headless Chromium.
"Overflow" means `scrollWidth/clientWidth` on the document. The screenshots show real voter details, so they
aren't committed. They're in the gitignored `data/leader-feedback-2026-11-11-06-mobile-baseline/`: record search
at the top level, plus `legacy-committees-flag-off/` and `workspace-flag-on/`. File names are
`<page>-<user>-<width>.png`, and `recordsearch-results-*` / `recordsearch-details-*` come from the "John Smith"
search as the Leader. To retake them, use `apps/frontend/.claude/skills/run-frontend/`.

| Page | 375 | 768 | 1280 |
|---|---|---|---|
| Record search, empty form | **441/375**. The centered `w-max` criteria form is wider than the screen, so its left edge (the field picker combobox) is cut off and **can't be scrolled to** | fits | fits |
| Record search, "John Smith" results | 441/375. The table shows Name and part of DOB. Phone and the details button sit behind a sideways scroll inside the table | Results fit, but the "See more details" column is clipped at the right edge | fits |
| Record search, details popover | The popover runs off the right edge, cutting off address/city/LD/ED | fits | fits |
| Legacy `/committees` (flag off), Leader | Fits. The roster stacks as ED/Seat/Name, and the dropdown sits above a long roster | fits | fits |
| Legacy `/committees` (flag off), Admin | **524/375**. The pending-requests banner and the "Generate Committee Roster Report" button share one row that doesn't wrap | fits | fits |
| Workspace `/committees` (`COMMITTEES_WORKSPACE=1`), Leader and Admin | Fits. The list → detail view with **Back to committees** works, the roster's `⋯` menus are reachable, and the detail view fits | fits | fits |
| App header (every page) | The tabs scroll sideways inside the header. Only "Record Search" and part of "Committee List" are visible | fits | fits |

Also seen: on record search, a typed name only becomes a chip when the input loses focus, so the first tap on
**Submit** is used up by that blur and a second tap is needed. That's worse on touch screens. Treat it as part
of the quick name box work: Submit should use whatever is typed in the input.

Takeaways: the record search fixes in Scope stand as written. On committees, the legacy page is broken for
admins on phones and fine for leaders, while the workspace is fine for both. Turning the workspace on and
finishing 15b/16 covers committees.

**2026-11-15.** Production has `COMMITTEES_WORKSPACE=1`. The legacy admin overflow above doesn't reach
users, so on phones the committee pages are already in the "fits" state. That leaves record search and the
app header for this ticket.

**2026-11-15, built (branch `mobile-record-search`, uncommitted).** Ready for human review.

- **Name box + builder: one query.** The name box's values join the builder's Name row
  (`src/lib/quickNameSearch.ts`). The backend builds one `in` filter per field, and a later entry for the
  same field replaces an earlier one, so appending a second Name row would quietly drop one. Joined values
  match like extra chips (any listed name). Blank name box: the builder runs exactly as before. The name
  box is plain inputs, so the first Submit (or Enter) uses what's typed. That fixes the two-tap problem for
  name searches. Builder chips still add on blur, as before. Ctrl/Cmd+Enter now goes through the same path,
  so it also updates the export context.
- **The builder still starts with a Name row**, so on phones it sits right under the name box. It was kept
  for "builder unchanged" and the existing tests. Dropping it from record search's initial rows is a
  one-line follow-up if the duplication bothers people.
- **Header:** below `md` the tabs are hidden behind a hamburger next to View Profile. It opens a
  top sheet (`Sheet side="top"`) with the pages as full-width rows and the current page highlighted;
  picking one or pressing Escape closes it. From `md` to `lg` the tabs are one row of compact tabs sized to
  their text (Developer/Admin with 4 tabs and the DB badge fits at 768). At `lg` and up the header is
  unchanged. (The first version used a 2-column tab grid on phones; replaced on 2026-11-16 at review.)
- **Results:** below `md`, `VoterRecordCardList` (cards showing the table's fields, a full-height sheet with
  `VoterCard`, Load More / Jump to Top / count). The table renders from `md` up, unchanged. Both are in the
  DOM and CSS picks one. The loading skeleton's `min-w-[800px]` now applies only from `md` up.
- **`RecordSearchForm`:** stacks below `sm`. The `width > 760` switch is gone, so placeholders are always
  the short "Voter ID / First Name / Last Name", including on desktop. The unused `useWindowSize` hook was deleted.
- **Not changed:** at 768 the table's "See more details" column is still clipped (pre-existing; the
  ticket keeps `md`+ as is).

Screenshots (gitignored, real voter data): `data/leader-feedback-2026-11-11-06-mobile-after/`. Record
search as the Leader at 375/768/1280 (empty, "John Smith" results, details), and `developer/` for the
4-tab header and `/petitions` (`RecordSearchForm`). Every one measured `scrollWidth == clientWidth`. Compare with
`data/leader-feedback-2026-11-11-06-mobile-baseline/`: at 1280 and 768 the header, table and popover
match, and the only difference is the new name box. Retake with
`apps/frontend/.claude/skills/run-frontend/steps/record-search-quick-name.mjs`.

Tests: `src/__tests__/lib/quickNameSearch.test.ts`,
`src/__tests__/components/recordsearch/{QuickNameSearch,VoterRecordCardList}.test.tsx`. Full frontend
jest: 136 suites, 2024 tests passing. `tsc` and `eslint` are clean.

**2026-11-15, PR.** https://github.com/matanp/voter-file-tool-2/pull/151. Its screenshots use made-up voters
(`steps/record-search-synthetic.mjs` mocks `/api/fetchFilteredData`). They're on the `pr-assets` branch under
`mobile-record-search/`, because an existing `pr-assets` branch rules out a `pr-assets/mobile-record-search` branch.
