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

## Principles

From a stakeholder chat on 2026-11-21. Every page ticket checks its design against these.

- **Act where you look.** "People want to see what they want to do the first place they look." Each place that shows a voter, committee, seat, request or report offers the related next step, or a link to where it happens, so a Leader doesn't have to find the same thing again somewhere else. [22](issues/22-cross-link-audit.md) lists the jumps that are missing.
- **Without getting busy.** Use progressive disclosure: next steps live in the detail pane, the drawer or a ⋯ menu, and appear only when they apply and the user may use them. Don't put a button for every action on every row.
- **Accessible by default.** The stakeholder named ADA accessibility as a value. No page ticket may regress keyboard use, focus, labels or screen-reader names, and each one keeps the accessibility requirements of the tickets it supersedes. The committed level of support (for example WCAG 2.1 AA) is decided in accessibility/01. It isn't yet known whether there is a compliance requirement behind this.

## Decisions

- **Direction approved.** A stakeholder review of the prototypes (2026-11-21) liked all of them: app bar and surfaces, reports list, report drawer, record search, home page and requests page.
- **Brand colour: green primary buttons.** `--primary` stays green. Slate is not used for primary actions. Green also marks "filled/success", so status badges must stay distinguishable from primary buttons (shape and label, not colour alone).
- **Nav label: "Voters"** replaces "Record Search" in the app bar. The route stays `/recordsearch`.
- **Dark mode is dropped.** The `ThemeProvider` in `layout.tsx` is commented out, so the existing `dark:` classes never apply. New tokens are light-only, no new `dark:` classes are added, and dead `dark:` classes and `themeToggle.tsx` are removed when their files are touched.
- **Requests page:** ship 11 now as the interim fix. committees-workspace/22 is a separate, later effort.
- **Focus ring: blue-600 app-wide** (13), so focus stays distinct from green primary buttons and success badges.

## Open decisions (for the maintainer)

2. **Product name and branding in the app bar.** There is none today. The home hero says "Political Campaign Tool", and the prototype used "Open Source Politics". Undecided how much MCDC branding to show. 02 ships with a placeholder.

## Build order

The triage, build order and blockers are in [plan.md](plan.md). The critical path is 01 → 04 → 03 → 05 → 07 → 08.

## Related existing tickets

- ui-makeover/19: Leaders pin features to their home page (follows 10).
- ui-makeover/20: voter details show every district in the LTED matrix (pairs with 09).
- ui-makeover/21: Leaders request committee adds and contact updates from voter search (follows 09 and committees-workspace/28).
- ui-makeover/22: audit of the jumps between where Leaders look and what they do ("Act where you look").
- accessibility/01: decides the committed accessibility level that the "Accessible by default" principle points to.
- committees-workspace/22: requests page into the workspace. Ticket 11 is the interim fix.
- record-search-results/03, /04, /06: details column clipped, details-button names, row disambiguation. Ticket 09 supersedes their visual parts.
- reports-polish/01: failed jobs and service errors. Ticket 07 gives them a place in the list.
- accessibility/02: toast cut off by focus move. Ticket 06 touches toasts.

## Comments

### 2026-11-21 - stakeholder review of the prototypes

Prototype branch `proto/ui-makeover` (local, base `b284c5b1`) implemented 01–04 and rough versions of 07–11, shot on an anonymized DB copy. A stakeholder reviewed them on a vote page: liked all updates, chose green primary buttons, said yes to renaming "Record Search" to "Voters", and is undecided on MCDC branding. New asks from the same review became ui-makeover/19, ui-makeover/20, leader-feedback-2026-11/29 and /30, and a comment on committees-workspace/28.

- Before/after page (private Claude artifact): https://claude.ai/artifact/BumQdqZz4W75DbaJtykmtL
- Stakeholder vote page, with saved answers (private Claude artifact): https://claude.ai/artifact/39gG8K3aC4CM1sNj5Y7cCE
- Screenshots, both pages' HTML and the shooting scripts are in the gitignored `data/proto/`. The shots come from `vft_demo`, a local anonymized copy of the dev DB (fake voter and user names, phones, emails and streets).
