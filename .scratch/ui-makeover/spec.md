# UI makeover: bring the rest of the app up to the committees workspace

Written 2026-11-21 from a five-lane design review (record search, reports, app shell/home, design system, admin). Full lane reports are in [reviews/](reviews/). Screenshots were taken locally at 375 and 1280 as Developer and Leader and are kept as "before" shots in the gitignored `data/shots/` (voter PII), next to the reviewer brief (`data/BRIEF.md`). Findings were re-checked against `main` at `dcedbdcc`, after ui-page-consistency 01–03 merged.

## Why the workspace works

Users liked the workspace's left side, where you can scan a lot of information without much text. The review found this comes from a handful of choices that the rest of the app does not make:

- **Neutral surfaces.** It is white and slate, with no green and no tinted page background. Colour appears only for status (seat dots, pending chip).
- **Glanceable encoding instead of words.** `●●●○ 3/4` instead of "3 of 4 seats filled", and count chips instead of sentences.
- **A compact header.** An `text-lg` title, one `·`-joined stat line, and outline actions on the right. No paragraph of description.
- **Dense rows.** About 37px each (`py-2`), against 73px in the shadcn table used everywhere else. That is about twice the rows per screen.
- **List → detail.** Rows are the click target, with a selected-row bar. Actions sit in ⋯ menus and a drawer, not as buttons on every row.
- **Hairlines, not cards.** No shadows and no card inside a card.

## The rest of the app, at a glance

- **Member pages are pink.** `PageContainer.tsx:34` paints the page with `bg-primary-foreground`, the shadcn token meant for *text on green buttons*. One line causes it.
- **The nav is the loudest thing on every screen.** It uses 64px grey and green button blocks in bold `text-xl`. The workspace sits under it looking pasted in.
- **Headings are green and big.** `.primary-header` is `text-2xl text-primary`, and `CardTitle` defaults to `text-2xl`, so card titles outrank page titles on `/reports` and `/committees/requests`.
- **Status colours are reinvented in six places and disagree.** "Pending" is yellow in one place and amber in another. Red means both "Admin role" and "failed".
- **Pages open five different ways.**
- **Lists are tall cards or unpaginated tables.** Each report card is about 280px. `/admin/eligibility-flags` is about 43,000px tall.

## Roadmap (ranked by app-wide lift per effort)

| Phase | # | Ticket | Effort | Impact |
|---|---|---|---|---|
| 1 Foundation | [01](issues/01-neutral-surfaces-and-quiet-headings.md) | Neutral page surfaces, quiet headings | S | H |
| | [02](issues/02-quiet-app-bar.md) | Quiet app bar | M | H |
| | [03](issues/03-status-tokens-and-status-badge.md) | Status colour tokens + `StatusBadge` | M | H |
| | [04](issues/04-compact-density-defaults.md) | Compact table and control density | S | H |
| 2 Primitives | [05](issues/05-promote-workspace-primitives.md) | Promote workspace components to `components/ui` | M | H |
| | [06](issues/06-status-panel-loading-and-toasts.md) | Empty/denied/404/error panel, skeletons, toasts | S–M | M |
| 3 Pages | [07](issues/07-reports-hub-dense-list.md) | Reports hub as one dense list | M | H |
| | [08](issues/08-generate-report-drawer.md) | Generate report in a drawer | M | H |
| | [09](issues/09-record-search-list-detail.md) | Record search results list → detail | M | H |
| | [10](issues/10-signed-in-home.md) | Signed-in home "today" page | M | H |
| | [11](issues/11-requests-page-layout.md) | Requests page overflow and layout | S | H |
| | [12](issues/12-record-search-criteria-chips.md) | Advanced search criteria as chips | M–L | M |
| | [13](issues/13-report-form-consistency.md) | Report form consistency (outlier forms) | M | M |
| 4 Admin | [14](issues/14-admin-upload-overflow.md) | Admin upload pages overflow | S | H |
| | [15](issues/15-admin-home-and-sidebar.md) | Admin home + counted sidebar | M | M |
| | [16](issues/16-admin-review-queues-list-detail.md) | Eligibility flags and discrepancies as list → detail | M–L | M |
| | [17](issues/17-admin-audit-dense-log.md) | Audit trail as a dense log | S–M | M |
| | [18](issues/18-admin-config-and-import-pages.md) | Admin config and import page polish | M | L |

Phase 1 is mostly one-line and token changes. Doing just 01, 02 and 04 would make every page look like it belongs with the workspace.

## Where the workspace pattern does not fit

- **Report results:** no detail pane. A report has nothing to show in one, so View opens the file.
- **Record search:** results are a flat, server-paged list. That means no town → ED groups and no client-side filter chips. Show the active criteria as chips instead.
- **Home:** a jump-off page, not a list you work through. Use cards of the top items, not a split pane.
- **Admin setup and import pages:** written to rarely. They need a clean form layout, not a list → detail split.
- **`/petitions`, `/committee-reports` and `/voter-list-reports`:** too complex for a drawer, so they stay full pages.

## Open decisions (for the maintainer)

1. **Brand colour.** The proposal keeps green only as `--brand` (logo or wordmark, and maybe the active nav), uses slate-900 for primary actions, and reserves green elsewhere for "filled/success". The alternative is to keep green primary buttons.
2. **Product name in the app bar.** There is none today. The home hero says "Political Campaign Tool".
3. **Nav labels.** Should "Record Search" become "Voters"?
4. **Dark mode.** There are 144 `dark:` classes and an unused `themeToggle.tsx`. Decide whether to keep or drop them before the token pass in 01/03.

## Related existing tickets

- committees-workspace/22: requests page into the workspace. Ticket 11 is the interim fix.
- record-search-results/03, /04, /06: details column clipped, details-button names, row disambiguation. Ticket 09 supersedes their visual parts.
- reports-polish/01: failed jobs and service errors. Ticket 07 gives them a place in the list.
- accessibility/02: toast cut off by focus move. Ticket 06 touches toasts.
