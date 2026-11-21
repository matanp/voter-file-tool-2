> **Note (2026-11-21):** this review was taken at `1032ac09`. During the review, #180, #182 and #184 merged ui-page-consistency 01–03 (heading semantics, `PageContainer` width caps, "Committees" naming), and the global header moved to `apps/frontend/src/app/components/header.tsx`. ui-page-consistency 01 and 02, described below as `ready-for-agent`, are now resolved. The findings were re-checked against `dcedbdcc`; see [../spec.md](../spec.md).

# Design system: whole app

Scope: `tailwind.config.ts`, `src/styles/globals.css`, `src/components/ui/*`, `src/components/layout/*`, and how pages use them. I counted with grep across `apps/frontend/src` (`.tsx`/`.ts`, skipping tests and `_prototype`) and looked at the screenshots under `shots/dev` and `shots/leader`.

Already covered elsewhere, so not repeated here: ui-page-consistency 01 (heading semantics and scale) and 02 (`PageContainer`/`PageHeader`). Both are still `ready-for-agent`. `PageContainer` and `PageHeader` exist and 6 files use them. Ticket 03 covers naming.

## 1. Current state

**There are two colour systems side by side, and neither one runs the app.**
- **Tokens.** `globals.css:24` makes `--primary` green. Line 25 makes `--primary-foreground` a rose tint (hsl 355.7 100% 97.3%), which is the shadcn green-theme value. It was meant for text on green.
- **Hard-coded slate in the primitives.** The shadcn CLI wrote literal slate colours into `button.tsx:8-22`, `card.tsx:11`, `tabs.tsx`, `table.tsx:76`, `select.tsx:22` and `input.tsx:18`. So `primary` never reaches buttons: the default button is `bg-slate-900`.
- **Usage counts.** 668 ad-hoc palette classes: 129 distinct, in 79 files. By hue: slate 392, blue 76, red 62, amber 54, gray 45, green 24, emerald 7, yellow 6, purple 2. Semantic tokens: `muted*` 307, `primary` 49, `destructive` 59. `border` is used 3 times, because `globals.css` has no `* { @apply border-border }`. Only two hex values appear: `#2563eb` and `#AD6CAA`.
- **What the workspace does.** `app/committees/workspace` uses slate only. Semantic tokens appear 7 times, and `primary` 0 times. Its quiet look comes from *not* using the app's green.

**The page background is pink.** `PageContainer.tsx:34` sets `bg-primary-foreground` on the whole page. Seven more places use it as a "panel" colour, among them `RecordSearchForm.tsx:126`, `ScopedReportForm.tsx:617`, `XLSXConfigForm.tsx:251` and `CommitteeSelector.tsx:700`. Admin pages and the workspace are white. Compare `reports-1280.png` and `sign-in-sheet-reports-1280.png` (rose background) with `committees-detail-1280.png` and `admin-users-1280.png` (white).

**Status colours are reinvented in each feature, with clashing meanings.** There are at least 6 private colour maps:
- `PendingJobsIndicator.tsx:99`: pending is yellow, processing blue
- `ReportCard.tsx:267`: report types get blue, green or gray
- `invites/display.ts:22`: Admin is red, Developer purple, ReadAccess green
- `EligibilityFlagsTable.tsx:65`: pending is amber, dismissed emerald
- `CommitteeSummaryBlock.tsx:20`: full is green, vacant red
- `CommitteeGrid.tsx:135`: pending is amber

"Pending" is yellow in one map and amber in another. Red means both "Admin role" and "failed". The `Badge` component has no success, warning or info variant, so all 26 uses override its colours by hand.

**Type and headings.** Sizes in use: `text-sm` 261, `text-xs` 73, `text-lg` 27, `text-xl` 7, `text-2xl` 5, `text-3xl` 2, `text-5xl` 1. `h1` is written 9 different ways (green `.primary-header`, `.section-header`, `text-lg font-semibold`, …). `CardTitle` defaults to `text-2xl` (`card.tsx:36`), so a card's heading outranks the page's own heading: "Report Jobs" and "My Reports" in `reports-1280.png`. The workspace uses a 3-step scale: `text-lg` title, `text-sm` body, `text-xs` meta.

**Density.** In the shadcn table, `TableHead` is `h-12` and each cell is `p-4` (`table.tsx:76,90`), so a row is about 73px (`recordsearch-results-1280.png`). Workspace rows are `py-2`, about 37px (`CommitteeGrid.tsx:108`), so the workspace fits about twice the rows. `Input`, `Select` and the default `Button` are `h-10`. The workspace overrides them to `h-9`/`sm`. Pages with no density control at all: `admin-eligibility-flags-1280.png` is about 43,000px tall, and `admin-discrepancies-1280.png` is a 540px-wide column of accordions.

**Cards, radius, shadow.** 41 `<Card>`s in 23 files. Cards sit inside cards on the reports hub: Report Jobs → job rows, and My Reports → report cards (`reports-1280.png`). Radius in use: `rounded-md` 53, `-lg` 26, bare `rounded` 26, `-full` 13, `-sm` 11. There are 6 shadow levels, including `shadow-lg` 12 times and a custom `shadow-button-select` on hover. The workspace uses no shadows at all: borders and hairlines only.

**Buttons.** 171 `<Button>` and 23 raw `<button>`. Variants: outline 73, destructive 18, ghost 17, secondary 11, default 2 (written out explicitly). `size="sm"` appears 61 times. The main nav restyles `Button` into 64px grey/green blocks (`header.tsx:75,117`). They are the loudest thing on every page (all screenshots).

**Form controls are mixed.**
- Native `<select>`: 6 in 4 files. The workspace filter is native but styled (`CommitteeFilters.tsx:61`). The report "Format" select uses the browser default and has no gap after its label (`leader/committee-roster-reports-375.png`).
- The Radix `Select` is in 10 files.
- Checkboxes: 6 native, 6 component. Radios: 4 native, 3 component.
- Labels sit inline beside some controls ("City/Town" in `sign-in-sheet-reports-1280.png`) and stacked above others.
- Focus rings disagree. `Input` uses a green ring and references a `border-primary-200` class that does not exist (`input.tsx:18`). `Select` uses a slate-950 ring. The workspace uses a blue-600 outline.

**Icons.** Mostly lucide (46 imports), plus 5 imports from `@radix-ui/react-icons`.

**Primitives shipped but barely used.** `Tabs` is used in 2 files, `Sheet` in 5, `DropdownMenu` in 4. These are the building blocks the workspace is made of.

## 2. Proposed minimal system

**Principle:** the workspace's look becomes the app's look. Neutral surfaces. Colour only for status and for one accent. Small type. Hairlines instead of shadows.

### Tokens (globals.css + tailwind)

| Token | Value / rule |
|---|---|
| `--background` | white. Delete the page-level `bg-primary-foreground`. |
| `--surface-subtle` | slate-50: sticky group headers, side panes, form panels |
| `--foreground` / `--muted-foreground` / `--subtle-foreground` | slate-900 / slate-600 / slate-400 |
| `--border`, `--border-subtle` | slate-200 / slate-100, plus `* { @apply border-border }` |
| `--primary` | slate-900 for actions, matching today's buttons. Green is kept only as `--brand` for the logo or active nav, never for headings. |
| `--selection` | blue-50 background plus a blue-600 inset bar (the workspace's selected row). Also the single `--ring`. |
| `--success` / `--warning` / `--danger` / `--info` | each one a `-bg` (100), `-fg` (800) and `-solid` (500/600) for emerald, amber, red, blue. Amber always means "pending/attention". Red always means "failed/destructive". |

**Type scale (4 steps):**
- page title: `text-lg font-semibold`
- section: `text-sm font-semibold`, or the uppercase `text-xs tracking-wide` group label
- body: `text-sm`
- meta: `text-xs text-muted-foreground`

The home hero is the one exception. `CardTitle` should default to `text-base`.

**Radius:** `rounded-md` for controls and cards, `rounded-full` for chips and dots. Nothing else.

**Shadow:** none inside a page. `shadow-lg` only on overlays (sheet, popover, dropdown).

### Density rules

- **Compact (default for lists and tables):** rows `py-2 px-3` (about 36–40px), controls `h-9`, `gap-2`.
- **Comfortable (forms on phones):** controls `h-10`, 44px tap targets in menus.
- Build this as a `density` variant on `Table` and `Button` rather than repeating the override at each call site.
- No card inside a card. Inside a section, use a bordered list (`divide-y`), not nested `Card`s.
- Lists longer than about 50 rows get a filter or pagination. Long lists group under sticky town/LD headers, as the grid does.

### Core primitives (8)

1. **`PageHeader` (compact):** title, a one-line stat summary built from `·`-joined counts, and a right-hand slot for actions. Promote it from `CommitteeWorkspaceHeader.tsx:34-46` and fold it into ticket 02's `PageHeader`.
2. **`StatusBadge`:** `Badge` gets `success | warning | danger | info | neutral` variants, optionally with an icon and a count (the grid's `⏱2` chip). It replaces the 6 private colour maps.
3. **`FilterChip` / `ChipGroup`:** `aria-pressed` toggle chips (`CommitteeFilters.tsx:137`).
4. **`SeatDots` → `ProgressDots`, plus a `Ratio` (x/y in `tabular-nums`):** glanceable fill state (`CommitteeGrid.tsx:164`). It could also show seat fill on vacancy and weight reports, and on Leader home.
5. **`ListRow` / `GroupedList`:** a dense button row with a selected state, a right-aligned meta slot and a chevron on mobile, under sticky collapsible group headers (`CommitteeGrid.tsx:47-108`).
6. **`SplitPane`:** list on the left, detail on the right. The list can collapse on desktop. On mobile it becomes list then detail with a back button. Build it on `useHeightBelowNav`, `useIsDesktop`, `CommitteeGridPane` and `CommitteeDetailPane`.
7. **`UnderlineTabs`:** a `Tabs` variant with a 2px underline and a sticky strip (`CommitteeTabs.tsx:60-66`). It becomes the default in place of today's grey pill `TabsList` (`admin-users-1280.png`).
8. **`ActionDrawer` and `RowActionMenu`:** a `Sheet` with a step heading, a body, a sticky footer and an outcome alert (`drawer/drawerParts.tsx`), plus a "⋯" `DropdownMenu` per row. Together they take the row of inline buttons off each row.

Also: a single styled native `Select` for simple enums (fast on phones; the workspace already does this), with the Radix `Select` and ComboBox only where search is needed.

## 3. Prioritised migration (biggest lift for least work first)

| # | Change | Effort | Lift |
|---|---|---|---|
| 1 | Remove the rose page background: `PageContainer.tsx:34` → `bg-background`, and swap the 7 panel uses to `bg-muted`/`surface-subtle`. One-line token change; every member page stops looking off-brand pink. | S | H |
| 2 | Quieter global nav: make `header.tsx:75,117` 40px text tabs with an underline or subtle fill instead of the 64px grey/green blocks. Seen on every screen, at both widths. | S | H |
| 3 | De-green the headings: `.primary-header` → `text-lg font-semibold` foreground (`globals.css`). Lowering `CardTitle` to `text-base` fixes the inverted hierarchy on reports, requests and petitions. Do this together with ticket 01. | S | H |
| 4 | Convert the primitives to tokens: replace the slate literals in button, card, tabs, table, select and input with tokens, add the border rule, settle on one focus ring, and remove the dead `border-primary-200`. No visual change except consistent focus; it makes 1–3 stick. | S–M | M |
| 5 | `StatusBadge` and status tokens: replace the 6 colour maps; fixes the yellow/amber pending clash and red meaning both Admin and failed. | M | H |
| 6 | Compact `Table` density, default on: `h-9` header, `py-2 px-3` cells. Record search, admin users, discrepancies and roster tables show about twice the rows. Move "See more details" into a row click or the ⋯ menu. | S | H |
| 7 | Promote `PageHeader`-compact, `FilterChip`, `ProgressDots`, `ListRow`/`GroupedList` and `UnderlineTabs` to `components/ui`; they are copy-out work from the workspace. These unlock the page makeovers: reports hub as a list with filter chips, requests queue as `GroupedList` and a drawer, eligibility flags and discrepancies as grouped lists with chips. | M | H |
| 8 | Flatten cards in cards on `/reports` (`ReportCard` becomes a `ListRow` with a type badge and a ⋯ menu) and `/committees/requests` (`RequestCard`). | M | H |
| 9 | Make `SplitPane` and `ActionDrawer` generic for admin queues (pending review, eligibility flags, meetings → decisions). | L | M (admin) |
| 10 | Form consistency: always stack labels above controls, give the native `Select` the shared style, use `Checkbox`/`RadioGroup` components, and make primary actions full-width at 375px. | M | M |

Nits, in one line: move the 5 `@radix-ui/react-icons` imports to lucide; pick one of `rounded` and `rounded-md`; drop the custom `shadow-button-select` hover; the unused `themeToggle.tsx` and 144 `dark:` classes have nothing to do while there is no toggle, so decide on dark mode before the token pass.
