# 02 - Record search renders every result twice (cards and table)

Status: needs-triage

## Problem

Since PR #151, `src/app/recordsearch/RecordsList.tsx:226-245` mounts both `VoterRecordCardList` (inside
`md:hidden`) and `VoterRecordTable` (inside `hidden md:block`), and CSS shows one. Screen readers are fine,
since `display:none` hides the other from the accessibility tree. But every record renders twice, and each
Load More page (100 records) adds twice the DOM. On a phone after several Load More pages that could be
noticeable.

Found in the blind review of PR #151.

## Options

- **Measure first.** Profile a phone-width search after 3–5 Load More pages. If it's fine, mark `wontfix`.
- **Render one.** Pick the layout with a `matchMedia("(min-width: 768px)")` hook. The catch: server render
  and first paint don't know the width, so pick a default and accept a swap, or render neither until
  mounted. PR #151 deleted the old JS width hook (`useWindowSize`) in favor of CSS, so this goes back on that.
- **Virtualize** the list if the real cost is many rows rather than the duplication.

## Acceptance criteria

- [ ] A measurement (or a decision not to measure) is recorded under Comments.
- [ ] If changed: one layout's rows in the DOM at a time, no layout flash on load at 375 or 1280, and the
      card/table tests still pass.
