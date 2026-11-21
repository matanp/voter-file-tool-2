# 09 - Record search results as a dense list with a detail pane

Status: needs-triage

Blocked by: 01, 04, 05

Part of [ui-makeover](../spec.md).

## Problem

- **Rows can't tell same-name voters apart.** Each shows only name, DOB and phone. Address, town, party and ED are hidden in a popover, so three identical names differ only by DOB.
- **A heavy button on every row.** Each row has a "See more details" outline button (`app/recordsearch/VoterRecordTable.tsx:128-143`), the heaviest column on the page.
- **Wasted width.** The table is capped at `max-w-[80vw]`, leaving about 215px empty at 1280.
- **Popover detail.** It covers the rows below it and gives "Town: -" as much weight as Party (`VoterCard.tsx:65-114`).
- **Results start low on phones.** Two green 2xl headings ("Record Search", "Voter Records") put the first result about 470px down. The match count appears only at the very bottom.
- **Tall phone cards.** About 104px each, so about 7 voters per screen.

## Proposal

- **Header:** compact `PageHeader`, e.g. "1,234 voters · showing 100", with the active criteria as chips and Export (Admin) as an outline button in the header. After a search on a phone, the form collapses to a one-line summary with Edit.
- **Rows:** two lines. Line 1 is the name, age, a neutral party pill and a "Member" chip. Line 2 is muted text: address, town, ED, plus any searched field that isn't otherwise shown. The whole row is clickable, with a selected bar.
- **Desktop:** `ListDetailLayout` with a sectioned detail pane (Contact / Address / Districts; empty fields hidden), and a link to the voter's committee in `/committees`.
- **Phone:** hairline rows of about 56px; tapping opens the existing sheet, titled with the voter's name. Phone numbers and emails are `tel:`/`mailto:` links.
- **Shared components:** build a new `VoterResultList` beside `VoterRecordTable`, which has 5 other callers. Then migrate them. `VoterCard` also renders in the workspace drawer, so its sectioned redesign improves `/committees` too.

Supersedes the visual parts of record-search-results/03, /04 and /06. Read them first and keep their accessibility requirements.

## Acceptance

- Same-name voters can be told apart without opening anything.
- At least 12 rows per phone screen.
- No per-row details button.
- The count is visible at the top.
- Verify with `run-frontend` `steps/record-search-synthetic.mjs` (synthetic voters only, for any shot that leaves the machine).

Evidence: reviews/recordsearch.md §1A and §1B.
