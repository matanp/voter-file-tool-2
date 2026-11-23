# Record Search (`/recordsearch`): makeover review

Evidence: `shots/{dev,leader}/recordsearch*.png`, plus new synthetic shots in `shots/extra-recordsearch/` (`dev/rs-results-top-1280.png`, `dev/rs-advanced-1280.png`, `leader/rs-results-top-375.png`, `leader/rs-advanced-375.png`). In these, 1,234 total matches are mocked and some voters carry an active-committee badge. All code paths below are under `apps/frontend/src/`.

## 1. Top makeover candidates

### A. Results: turn the table into a dense list → detail view. Effort M, impact H
**What it's for:** finding *the right* voter among several who share a name, then reading their contact details and committee status.
**What's wrong at a glance**
- Each row shows only name, DOB and phone. The things that tell two same-name voters apart (address, town, party, ED) are hidden behind a popover. In `rs-results-top-1280` there are three identical "ALEX SAMPLE" rows, and only the DOB separates them.
- Every row has a large outline button labelled "See more details" (`app/recordsearch/VoterRecordTable.tsx:128-143`). Stacked down the page, these make the heaviest column in the table and add no information.
- The table is capped at `max-w-[80vw] table-fixed` (`VoterRecordTable.tsx:68`). At 1280 this leaves about 215px of empty space on the right, and the phone column floats in the middle of the table.
- The detail popover floats over the rows below it (`dev/recordsearch-details-1280.png`). It is an unstyled list of "Label: value" lines where "Town: -" gets as much weight as Party (`VoterCard.tsx:65-114`). You can't keep it open while scanning the list.
- At 375, each bordered card is about 104px tall and repeats the labels "DOB" and "Telephone" (`VoterRecordCardList.tsx:65-85`). Only about 7 voters fit per screen.

**Sketch (desktop ≥lg, using the workspace's split pane)**
```
Record Search                                         [Export ▾]
1,234 voters · showing 100 · First: Alex  Last: Sample  [Edit]
┌──────────────────────────────────────┬──────────────────────────┐
│ ALEX SAMPLE              76  DEM  ●   │ ALEX SAMPLE   DEM  Member │
│ 100 Example St, Exampletown · ED 1    │ Exampletown · LD 17 · ED 6│
│▌ALEXA SAMPLE             73  REP      │ ── Contact ─────────────  │
│ 110 Sample Ave, Exampletown · ED 2    │ Phone   (tap to call)     │
│ ALEX SAMPLE              61  DEM  ●   │ Email   (mailto)          │
│ 150 Example St · ED 6                 │ ── Address ─────────────  │
│ …                                     │ ── Districts ───────────  │
│            Load 100 more              │ LD · ED · AD · SD · CD    │
│                                       │ Voter ID · Reg date       │
│                                       │ [Open committee →]        │
└──────────────────────────────────────┴──────────────────────────┘
```
- **Rows:** two lines. Line 1 is the name, then age (more glanceable than a DOB, which stays in the detail pane), then a small neutral party pill. Line 2 is muted text: street address, town and ED. When the search included a field that isn't shown (district, reg date and so on), that value goes on line 2, so `createSmartFieldsList` no longer adds a whole column for each searched field (`lib/searchFieldUtils.ts:79`).
- **Committee membership:** replace the long gray pill "Committee: TOWN · LD 17 · ED 6" (`CommitteeMembershipBadge.tsx:26`) with a compact dot or a "Member" chip on line 1. The full committee label belongs in the detail pane, with a link to that committee in `/committees`.
- **Interaction:** the whole row is the click target, with a selected-row accent bar like the workspace's ED list. Remove the per-row button.
- **Phone (375):** same two-line rows, divided by hairlines instead of bordered cards, about 56px each, so roughly 12 per screen. Tapping a row opens the existing full-height sheet. Put the voter's name in the sheet title instead of "Voter details" followed by a second heading (`VoterRecordCardList.tsx:111-125`). Make the phone number and email `tel:`/`mailto:` links; Leaders on phones will want to call.
- **Where the workspace pattern does *not* fit:** results are a flat ranked list, not a town→ED tree, so there are no collapsible groups or seat dots. Filter chips should not be used to narrow results on the client, because the search runs on the server and is paged 100 at a time. Instead, show the active criteria as chips in the header (see B).

### B. Page shell: compact header, search pinned on top, results visible sooner. Effort S–M, impact H
**What's wrong:** a pink band holds a centered green 2xl "Record Search" heading, then a divider, then a second green 2xl heading "Voter Records" (`RecordsList.tsx:190-208`, `.primary-header` at `styles/globals.css:64`). At 375, the first result starts about 470px down, more than half the first screen (`leader/rs-results-top-375.png`). The match count appears only at the very bottom, after Load More (`ResultsPager.tsx:42-44`). The admin's Export button is a big green button centered between the heading and the table (`RecordsList.tsx:209-243`), and its "too many records" explanation appears only on hover.

**Sketch:** reuse the workspace header pattern (`app/committees/workspace/CommitteeWorkspaceHeader.tsx:34-37`):
- Header: "Record Search" at text-lg, then one stat line ("1,234 voters · showing 100"), then the active criteria as small chips (`First: Alex ×`).
- Export becomes an outline button on the right of the header for Admins. When there are too many records, the reason shows inline as muted text.
- First name, Last name and Search sit on one compact row at 1280, and as two inputs side by side at 375. Drop the white shadow card on pink (`VoterRecordSearch.tsx:139`) and use the workspace's neutral background.
- After a search on a phone, collapse the form to a one-line summary with an **Edit** button, so the results take the screen.
- Replace the empty state "Submit a search query to see results." (`RecordsList.tsx:278-286`) with a muted hint such as "Search by name, or use Advanced for address, district, party…".

### C. Advanced builder: criteria as chips, not stacked cards. Effort M–L, impact M
**What's wrong:** at 1280 the builder is a narrow column, about 500px wide, inside the pink band. Each criterion is a tall shadowed block: the Name row alone is about 230px tall (`dev/rs-advanced-1280.png`, `components/search/SearchRow.tsx:50`). The remove buttons are solid red destructive squares (`SearchRow.tsx:96`), which look alarming for a harmless action. There are also two competing primary buttons, a dark "Add Search Criteria" and a green "Submit", and the simple mode calls the same action "Search" (`VoterRecordSearch.tsx:233-258`).

**Sketch:** one row of chips such as `Name: Alex Sample ×` `Street: Example St ×`, then `+ Add filter`. The add button opens a popover containing the field picker and its inputs, which becomes a bottom sheet at 375. Below the chips, a single **Search** button. The × on each chip is a ghost icon. This matches the workspace filter chips (`app/committees/workspace/CommitteeFilters.tsx:135-137`) and shrinks the builder from about 700px tall to about 80px. It ranks lower because most users are probably on the name box.

## 2. Other findings

| Page | Issue | Evidence | Suggested fix | Effort | Impact |
|---|---|---|---|---|---|
| Results | Switching to advanced mode keeps the old results with nothing showing which criteria produced them | `dev/rs-advanced-1280.png` | Criteria chips in the header (B); dim the results while the criteria have unsubmitted edits | S | M |
| Results | "Load More" and "Jump to Top" sit in a gray footer bar inside the table | `VoterRecordTable.tsx:149-162`, `ResultsPager.tsx:31-41` | A single quiet "Load 100 more" link at the end of the list; the count moves to the header | S | L |
| Detail | Every field gets equal weight: "Town: -", "State: NY" and "Zip" read the same as Party and Phone | `VoterCard.tsx:65-114` | `dl` with muted labels in sections (Contact / Address / Districts); hide empty fields | S | M |
| Detail | The popover is `w-max` and covers neighbouring rows | `VoterRecordTable.tsx:140` | Detail pane (A); in shared table uses, a side drawer | M | M |
| Phone cards | Committee badge wraps and adds a full line to each card | `leader/rs-results-top-375.png`, `CommitteeMembershipBadge.tsx:31` | Compact "Member" chip; full label in the sheet | S | M |
| Phone cards | The phone number can't be tapped, either in the card or in the sheet | `VoterCard.tsx:77-82` | `tel:`/`mailto:` links in the detail view | S | M |
| Search | Pink band and green 2xl headings clash with the quiet neutral palette of `/committees` | `RecordsList.tsx:190,192,207` | Neutral background, `text-lg font-semibold` heading | S | M |
| Nits | Dark Search button vs green Submit; the "Advanced search →" link floats under the form; names in all caps take a lot of width at 375 | `VoterRecordSearch.tsx:181,251,288-299` | One primary button style; put the mode toggle on the same line as Search, styled as a segmented "Name / Advanced" control | S | L |

## 3. Shared-component / design-system implications
- **`VoterRecordTable` is shared.** It is also used by the committee request form, AddCommitteeForm, admin discrepancies, the petition form and voter-list reports (5 files). Build a new `VoterResultList` primitive (a two-line row plus selection) beside it rather than restyling it in place; then move the other screens over to it.
- **`VoterCard` is shared.** It also renders the workspace drawer's voter detail (`app/committees/workspace/drawer/VoterDetailsView.tsx:68`), so a sectioned `dl` redesign improves `/committees` too.
- **Extract a `PageHeader`** (title, stat line, actions, criteria chips) from `CommitteeWorkspaceHeader`. The legacy `.primary-header` style (`globals.css:64`) is the old look throughout the app.
- **Missing Badge variants:** a neutral party pill, a committee-member chip, and a removable filter chip (lifted from `CommitteeFilters`).
- **Reuse the workspace split pane:** `useIsDesktop` and the list→detail layout (`app/committees/workspace/CommitteeWorkspace.tsx:100`) should become a generic `ListDetailLayout`, which would serve record search as well.
