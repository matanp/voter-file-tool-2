## Basis
- **Branch:** `main` · **Commit:** `362e502` · **Date:** 2026-08-09 · **Model:** `qwen3.6`
- **Deliverable:** `docs/WHOLE_APP_DESIGN_UI_REVIEW_qwen3.6_2026-08-09.md`
- **Review run:** `.review/runs/WHOLE_APP_DESIGN_UI_REVIEW_qwen3.6_2026-08-09-362e502`
- **Product files:** 358 · **checksum:** `ec3a0d315b168ef953f3cf3de9c59fb0dbb001adc74033fb5768de19bff54ca2` · **algorithm:** sha256
- **Inventory:** `pnpm review:freeze design-ui` · **Scan profile:** `design-ui`
- **Methodology:** `docs/review/WHOLE_APP_DESIGN_UI_REVIEW_METHODOLOGY.md`
- **Axis:** visual consistency, layout rhythm, spacing, typography scale, card/content treatment, page wrappers, and design pattern standardization across non-admin authenticated pages

## At a glance

| # | Finding | Severity | Blast | Opportunity |
|---|---|---|---|---|
| 1 | Every page uses its own wrapper pattern | High | large | Create unified `PageContainer`, `PageHeader`, `PageSubtitle` components |
| 2 | Heading scale inconsistent across pages | High | large | Standardize heading hierarchy with `primary-header`-like tokens |
| 3 | Committee page: `primary-header` label + `h1` double title (page has `<label>` then `<h1>`) | High | small | Collapse to single heading |
| 4 | Committee page has duplicate "Voter Records" h1s on recordsearch | Medium | small | Fix duplicate headings |
| 5 | Footer on home page is almost invisible | Medium | small | Add visual weight or remove if decorative |
| 6 | Scoped report pages share layout but voter-list form diverges | Medium | medium | Align form structure across report pages |
| 7 | Reports page has no max-width causing stretched content | Medium | large | Constrain to a consistent max-width |
| 8 | Home page quick action buttons use Button as Link with Card-like sizing | Low | small | Create a dedicated `QuickActionCard` component |
| 9 | `GeneratePetitionForm` uses raw `<label>` elements (not `Label` from `components/ui/label`) | Low | small | Audit all reports pages for consistency |

## Subsystem map

| Subsystem | Surfaces | Depth |
| --- | --- | --- |
| Home page | `apps/frontend/src/app/page.tsx`, `components/home/HeroSection.tsx`, `FeaturesGrid.tsx`, `QuickActions.tsx`, `Footer.tsx` | high |
| Record search page | `apps/frontend/src/app/recordsearch/page.tsx`, `RecordsList.tsx`, `VoterRecordSearch.tsx`, `VoterRecordTable.tsx` | high |
| Committee management | `apps/frontend/src/app/committees/page.tsx`, `CommitteeSelector.tsx`, `AddCommitteeForm.tsx`, `CommitteeRosterTable.tsx`, `CommitteeSummaryBlock.tsx`, `VoterCard.tsx` | high |
| Committee requests | `apps/frontend/src/app/committees/requests/page.tsx`, `RequestCard.tsx` | low |
| Reports hub | `apps/frontend/src/app/reports/page.tsx`, `ReportsList.tsx`, `ReportCard.tsx`, `GenerateReportGrid.tsx`, `PendingJobsIndicator.tsx` | high |
| Scoped reports (sign-in-sheet, roster, changes, vacancy, petition-outcomes) | `components/reports/ScopedReportPageShell.tsx`, `ScopedReportForm.tsx`, `scopeReportUiRegistry.ts` | high |
| Voter list reports | `apps/frontend/src/app/voter-list-reports/page.tsx`, `VoterListReportForm.tsx` | high |
| Committee reports XLSX | `apps/frontend/src/app/committee-reports/page.tsx`, `XLSXConfigForm.tsx`, `components/FieldSelection.tsx`, `XLSXConfig.tsx`, `ReportInfo.tsx` | medium |
| Petition generation | `apps/frontend/src/app/petitions/page.tsx`, `GeneratePetitionForm.tsx` | medium |
| Auth pages | `apps/frontend/src/app/auth/invite/[token]/page.tsx`, `auth/access-denied/page.tsx` | low |
| Header nav | `apps/frontend/src/app/components/header.tsx` | low |
| Shared UI | `components/ui/card.tsx`, `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/input.tsx`, `components/ui/dialog.tsx`, `components/ui/table.tsx` | medium |

## Findings

### 1. Every page uses its own page wrapper pattern — no shared PageContainer

**Severity: High · Blast radius: large**
**What & where.** `apps/frontend/src/app/page.tsx` uses `container mx-auto px-4 py-16`; `apps/frontend/src/app/committees/page.tsx` uses `w-full p-4`; `apps/frontend/src/app/reports/page.tsx` uses `w-full p-4 space-y-6`; `apps/frontend/src/app/committees/requests/page.tsx` uses `w-96 m-4 space-y-4`; `apps/frontend/src/app/voter-list-reports/page.tsx` uses `max-w-6xl mx-auto p-4`; `apps/frontend/src/app/committee-reports/page.tsx` uses `max-w-6xl mx-auto p-4`; `apps/frontend/src/app/petitions/page.tsx` uses `w-full p-4`; `ScopedReportPageShell.tsx` uses `max-w-6xl mx-auto p-4` — but `VoterListReportForm.tsx` wraps everything in `space-y-6` inside a card, and `VoterRecordSearch` uses `flex justify-center w-max`.
**Why it hurts.** The same content area (a report form) looks dramatically different depending on the page. Some pages are unbounded (`w-full`), some are narrow (`w-96` at 384px), some have generous padding (`py-16`). There's no visual rhythm across pages and no sense of a consistent page "frame."
**Opportunity.** Create a reusable `PageContainer` (width + padding) and `PageHeader` (title + subtitle) component.
**Evidence.** Reading 13 non-admin page files shows 7+ distinct wrapper patterns. `w-96` on the committee-requests page is especially jarring — it constrains the whole page to 240px wide which makes Accordion items very narrow.

### 2. Heading scale inconsistent across pages

**Severity: High · Blast radius: large**
**What & where.** Home page uses `text-5xl font-bold` (`HeroSection.tsx` L33); records search uses `text-2xl text-primary font-bold` with `primary-header` class (page.tsx records list + `styles/globals.css`); reports hub uses `text-3xl font-bold tracking-tight` (page.tsx L35); scoped reports use `primary-header` (h1 with `text-2xl text-primary font-bold`); `VoterListReportForm` uses `primary-header` inside CardHeader as `h3`; `VoterRecordCard` inside `VoterCard.tsx` uses `text-xl font-medium`.
**Why it hurts.** There are at least three distinct heading styles in use for page titles — `text-5xl`, `text-3xl`, `text-2xl` — with no visual hierarchy between "home page hero," "app page title," and "section title."
**Opportunity.** Define a two-level heading system: `text-2xl` for all app page titles, `text-3xl` only for the home hero, `text-xl` for card/section titles within a page.
**Evidence.** `HeroSection.tsx` uses `text-5xl`; `reports/page.tsx` uses `text-3xl`; `styles/globals.css` defines `primary-header` as `text-2xl`; `committee-reports/XLSXConfigForm.tsx` uses `primary-header`; `VoterListReportForm.tsx` uses `primary-header` as `h3` inside a card header.

### 3. Committee page has both a `<label>` and `<h1>` with the same title text

**Severity: High · Blast radius: small**
**What & where.** `apps/frontend/src/app/committees/CommitteeSelector.tsx` renders `<label htmlFor="district-select" className="primary-header">Committee Selector</label>` immediately above an `<h1 className="primary-header pt-2">` that also reads "Committee Selector" (in `getRosterHeader()` / `getDetailHeader()`).
**Why it hurts.** The page displays "Committee Selector" twice as a heading — once via a `<label>` (semantically wrong, should be a heading or removed) and again via `<h1>`. This is a visual duplication and an accessibility issue.
**Opportunity.** Replace the `<label>` with a descriptive `<h1>` or `<h2>`, and remove the duplicate `<h1>` in `getRosterHeader()`.
**Evidence.** `apps/frontend/src/app/committees/CommitteeSelector.tsx` renders `<label>` then `<h1>` with identical text in the same file. 

### 4. Record search page has duplicate "Voter Records" h1s

**Severity: Medium · Blast radius: small**
**What & where.** `apps/frontend/src/app/recordsearch/RecordsList.tsx` renders `<h1>Voter Records</h1>` with `text-2xl text-primary font-bold` above the results table, but the search form header above it (in `VoterRecordSearch.tsx` or the page wrapper) also displays "Record Search" as a heading. The page structure is: `<div bg-primary-foreground><h1>Record Search</h1><VoterRecordSearch/></div>` then `<div><h1>Voter Records</h1>... </div>`.
**Why it hurts.** Two `h1` elements on one page is semantically wrong (screen readers expect one `h1`), and visually it creates a "title + title" pattern that looks like a section heading when it's the page-level heading repeated.
**Opportunity.** Use `h1` for the page title and `h2` (or a styled subtitle) for the section title.
**Evidence.** `RecordsList.tsx` renders its own `<h1 className="primary-header ...">Voter Records</h1>` as a section header inside the page.

### 5. Home page footer is almost invisible — minimal visual weight

**Severity: Medium · Blast radius: small**
**What & where.** `apps/frontend/src/components/home/Footer.tsx` renders a simple `<div className="mt-16 pt-8 border-t border-border text-center text-muted-foreground">` with two short paragraphs.
**Why it hurts.** The footer is barely distinguishable from the background content — `text-muted-foreground` puts it at ~46% color, and there's no visual separation beyond a thin border line. It feels like an afterthought rather than a deliberate page boundary.
**Opportunity.** Either add more visual weight (dark background, larger text, links) or remove it entirely if it serves no purpose.
**Evidence.** `Footer.tsx` has three lines of text content with no links, no branding, and low-contrast styling.

### 6. Scoped report form pages look similar, but Voter List Report diverges significantly

**Severity: Medium · Blast radius: medium**
**What & where.** `ScopedReportForm.tsx` renders a simple form: name input, format select, scope radio buttons, city/leg district pickers, submit button, status tracker. But `VoterListReportForm.tsx` (voter-list-reports) wraps everything in `Card` + `CardHeader` + `CardContent` + `Accordion` + `VoterRecordTable` + `XLSXConfig` — a completely different structural pattern.
**Why it hurts.** Users who navigate from one report generator to another expect similar UX. The voter-list form has an extra table preview, field selection accordion, XLSX column ordering, auto-download switch — all features that could be on other report pages but aren't. This creates a jarring UX when switching between report types.
**Opportunity.** Either extract the shared parts (name, description, format, status tracker) into a shared `ReportFormShell` and use it across all report pages, or acknowledge that voter-list is special and document why.
**Evidence.** `ScopedReportForm.tsx` starts with `<form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">` (no card, no header). `VoterListReportForm.tsx` starts with `<Card><CardHeader><CardContent><form>...` with multiple `Accordion` sections.

### 7. Reports hub page has no max-width causing stretched content at wide viewports

**Severity: Medium · Blast radius: large**
**What & where.** `apps/frontend/src/app/reports/page.tsx` wraps its content in `<div className="w-full p-4 space-y-6">` — no `max-w-*` constraint. The `ReportsList` component uses `flex flex-col xl:flex-row gap-6` to put "My Reports" and "Public Reports" side by side, and the report grid uses `xl:grid-cols-4`.
**Why it hurts.** On a large monitor (e.g., 1920px+), the content stretches across the full width, making cards too wide to comfortably scan and links too far apart. The home page uses `container mx-auto` which constrains width; the reports page does not.
**Opportunity.** Add `max-w-7xl mx-auto` (or similar) to the reports page wrapper and all scoped report pages that lack it.
**Evidence.** `reports/page.tsx` uses `w-full p-4`; `committee-reports/page.tsx` uses `max-w-6xl mx-auto p-4` (different max-width); `voter-list-reports/page.tsx` also uses `max-w-6xl`; the discrepancy between 6xl and no-max-w is visible.

### 8. Home page quick action Buttons look like cards but function as buttons

**Severity: Low · Blast radius: small**
**What & where.** `apps/frontend/src/components/home/QuickActions.tsx` renders each quick action as a `<Button asChild variant="outline" className="h-auto p-6 flex flex-col gap-2">` containing an icon + title + description. This looks like a card but uses button semantics.
**Why it hurts.** The visual weight of outline buttons with large padding looks more like a card grid item than a button. The text hierarchy (icon + bold title + gray description) matches card patterns but there's no hover/shadow feedback to confirm clickability. Meanwhile `FeaturesGrid.tsx` uses actual `Card` components with the same content structure (icon circle + title + description list) — very similar layouts using different component types.
**Opportunity.** Either create a `QuickActionCard` component that uses Card + Link, or ensure the Button pattern has visible hover feedback (shadow, border-color change).
**Evidence.** `QuickActions.tsx` uses `Button variant="outline" h-auto p-6 flex flex-col gap-2`; `FeaturesGrid.tsx` uses `<Card className="hover:shadow-lg transition-shadow">` — nearly identical structure, different component.

### 9. `GeneratePetitionForm` uses raw HTML `<label>` elements instead of the `Label` component

**Severity: Low · Blast radius: small**
**What & where.** `GeneratePetitionForm.tsx` and ``, `` use raw HTML `<label htmlFor="...">Party:</label>` etc., while the same form should use `<Label htmlFor="...">` from `components/ui/label` for text styling consistency.
**Why it hurts.** The petition form has different label styling (no font-semibold or text-sm from the shared Label component), creating a visual inconsistency with every other form in the app.
**Opportunity.** Replace raw `<label>` with the shared `Label` component throughout `GeneratePetitionForm`.
**Evidence.** `GeneratePetitionForm.tsx` uses `<label htmlFor="party">Party:</label>`, while `ScopedReportForm.tsx` uses `<Label htmlFor="reportName">Report Name</Label>` — same form pattern, different styling.

## Already good

- **Scoped report registry pattern** — `SCOPE_REPORT_UI` / `SCOPE_REPORT_FORM_MESSAGES` / `SCOPE_REPORT_REGISTRY` in `scopeReportUiRegistry.ts` provides a clean single-source-of-truth for all scoped report pages. The pages that consume it (`ScopedReportPageShell`, `ScopedReportForm`) are nearly identical in structure, which is a good sign.
- **Report status tracker** — `ReportStatusTracker` component used consistently across generated report flows (scoped reports, voter-list, petitions) provides uniform pending/complete/error state visualization.
- **Card + content grid pattern** — reports hub grid (`GenerateReportGrid`) and features grid (`FeaturesGrid`) share a similar card-link pattern.
- **Home page hero is strong** — clear hierarchy, good contrast, appropriate visual weight for a landing page.
- **Committee roster table overflow handling** — `CommitteeRosterTable.tsx` and individual tables use `overflow-x-auto` consistently for wide data.
- **Empty state handling** — Most non-admin pages have at least a text-based empty state (e.g., "No results found" vs "Loading...").

## Backlog-only notes

### B1. Committee request page is absurdly narrow (w-96)
**What & where.** `apps/frontend/src/app/committees/requests/page.tsx` wrapping `div` uses `w-96` (384px) as its full-page width, making the accordion items very cramped.
**Why defer.** This is an admin-gated page that's already been excluded from the design review scope. A quick fix would be `max-w-3xl mx-auto`.
**Future direction.** Should be fixed in a layout refactoring pass — it's the most glaring visual inconsistency in the non-admin surface.

### B2. Sign-in button in header has different positions on large vs small screens
**What & where.** `apps/frontend/src/app/components/header.tsx–60` uses `hidden lg:block w-[150px]` for large screens and `lg:hidden` for small screens to position the sign-in button — a responsive workaround that leaves the positioning inconsistent (right-aligned on large, inline on small).
**Why defer.** Small responsive tweak; not a high-leverage visual improvement.
**Future direction.** Consider a fixed-position sign-in button or a header that doesn't need to shift content around.

### B3. Vote list report form is the only page with a voter table preview
**What & where.** `VoterListReportForm.tsx` shows a `VoterRecordTable` preview inside an `Accordion`. Other report pages (sign-in-sheet, vacancy, etc.) don't show data previews.
**Why defer.** Adding table previews to all report forms would be a significant feature addition, not a design nit.
**Future direction.** If other report forms benefit from previews, unify the pattern; if not, remove it from voter-list and use a simpler form like the others.

### B4. Petition form uses raw HTML rather than shadcn/ui primitives
**What & where.** `GeneratePetitionForm.tsx` uses raw `<label>`, `<select>`, `<input>`, `<div>` without the `Input`, `Select`, `Text` components from `components/ui/`.
**Why defer.** Complete rewrite of the petition form component is too expensive for a design-only pass.
**Future direction.** Audit `GeneratePetitionForm` during a broader form standardization effort.

## Not a finding

- **"Committee page has inline `fetch` calls instead of `useApiQuery`"** — This is an interaction/bug concern, not a visual design issue. Route to the frontend-state vector.
- **"Header navigation buttons don't use `primary-header` class"** — They use `h-16 text-xl font-semibold` which is appropriate for nav-sized buttons, not page-title text.
- **"RecordsList component renders voter cards in the same file"** — `VoterCard` being defined in `RecordsList.tsx` is a code organization issue (would be architecture vector), not a visual inconsistency.
- **Dark mode color definitions** — The `dark:` class values in `globals.css` use proper token mapping; dark mode contrast is an accessibility/a11y concern.
- **"QuickActions section uses Button instead of Card"** — This is a deliberate choice (full clickable area, button semantics for navigation). The hover state could use polish (see Finding 8) but the pattern choice itself is acceptable.
