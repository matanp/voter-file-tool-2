# Whole-App Design & UI Review Methodology

**Status:** Vector overlay. Shared manifest, workflow, citations, and Appendix B:
[WHOLE_APP_REVIEW_METHODOLOGY.md](./WHOLE_APP_REVIEW_METHODOLOGY.md).
**Skill:** `skills/whole-app-design-review/SKILL.md`

**Purpose:** Findings-only review at branch tip for **visual consistency, layout, and aesthetic design** of the
non-admin (authenticated user-facing) surfaces. Covers spacing/typography/color consistency across pages,
card/content alignment, visual hierarchy, component reuse/variation, empty/error states, and responsive behaviour.
**Not** an interaction-correctness review (dead-end workflows, state bugs → frontend-state vector) and
**not** an accessibility review (keyboard/aria → accessibility vector). Skip those axes here.

---

## Delta from base

| Topic | Design & UI vector |
| --- | --- |
| **Axis** | Visual consistency & layout quality across authenticated pages. Is the experience cohesive, professional, and well-structured, or are there jarring inconsistencies? |
| **Prefer** | Observable pattern breaks (margin mismatches, inconsistent card treatment, inconsistent headings, off-page overflow, empty states that look broken) and opportunities to establish reusable design tokens/patterns. |
| **Scan profile** | `design-ui` |
| **Deliverable** | `docs/WHOLE_APP_DESIGN_UI_REVIEW_<model-slug>_YYYY-MM-DD.md` |
| **Escalations** | N/A — fold into Findings |

## Run

```bash
MODEL_SLUG=<model-slug> pnpm review:freeze design-ui
pnpm review:scans design-ui
```

## Page scope (non-admin auth surfaces — what we review)

| Page group | Routes | Notes |
| --- | --- | --- |
| Homepage | `/` | Landed page, hero, feature cards, quick actions, footer |
| Record Search | `/recordsearch` | Search form, results table, export button |
| Committees | `/committees` | Committee selector, roster, member cards, forms |
| Committee Requests | `/committees/requests` | Pending request list, request detail |
| Reports Hub | `/reports` | Report jobs grid, report cards, public/my-reports |
| Scoped reports | `/sign-in-sheet-reports` · `/committee-roster-reports` · `/changes-reports` · `/vacancy-reports` · `/petition-outcomes-reports` | ScopedReportPageShell + ScopedReportForm |
| Committee Reports (XLSX) | `/committee-reports` | Field configuration form |
| Designation Weight | `/weight-summary-reports` | Report page |
| Petition Outcomes | `/petition-outcomes-reports` | Report page |
| Petition Generation | `/petitions` | Designating petition form |
| Vacancy Reports | `/vacancy-reports` | Report page |
| Voter List Reports | `/voter-list-reports` | Report page |
| Changes Reports | `/changes-reports` | Report page |
| Auth | `/auth/invite/[token]` · `/auth/access-denied` | Invite flow, access-denied |

**Excluded:** any `/admin/**` pages (admin data hub, governance config, eligibility flags, audit trail, terms, meetings, users).

## Lane emphasis

All lanes review non-admin pages only. Lane A–B overlap; Lane E is admin-only (marked N/A).

- **A (high):** **Page-to-page consistency.** Same elements (cards, headings, tables, forms, badges, buttons) across pages — does the same component look the same, or does a page drift? Typography scale, spacing scale, card padding, border radius, color usage. Layout rhythm (row vs grid, gap sizes).
- **B (high):** **Per-page visual hierarchy.** Page titles, subtitle text, action placement (top of page vs inline), info density (is the page cramped or too sparse?), content alignment (centered vs left-justified inconsistently), empty/error/pending states — do they all fit the visual language?
- **C (medium):** **Report UI visual quality.** ScopedReportForm — field alignment, label/input consistency, format/radio/select widgets, error display, generated status UI, success/preview layouts. XLSXConfigForm — card vs flat form treatment, layout width. Report cards and report grids — alignment, sizing, visual grouping.
- **D (N/A):** Upload/import pages are mostly admin-adjacent; only `/petitions` (petition form) is relevant here, fold into Lane A.
- **E:** N/A (admin-only lane).
- **F (low):** Shared UI components (`components/ui/*`, `components/reports/*`, `components/search/*`) — are shared primitives consistently composed, or do callers override in inconsistent ways?

## Review methodology

### 1. Scan the visual surface per page/group

Read each page and its core components. Note:
- **Typography:** font sizes/hierarchy. Are page titles consistently `text-2xl` or `text-3xl`? Are subtitles consistently `text-muted-foreground`? Any mixing of `primary-header` vs inline `h1` with `text-5xl`?
- **Spacing:** container padding (`p-4` vs `p-6` vs `py-16`), gaps (`gap-4` vs `gap-8`), section margins (`mb-16` vs `mb-6`), consistent rhythm or random?
- **Cards/containers:** card padding (`p-4` vs `p-6`), border radius, shadow usage, hover states — are they consistent?
- **Layout alignment:** left-aligned vs centered content; grid counts (2-col vs 3-col vs 4-col); max-width constraints (`max-w-md` vs `max-w-2xl` vs `max-w-6xl` vs unbounded); page wrapper (`container mx-auto px-4 py-16` vs `w-full p-4` vs `max-w-6xl mx-auto p-4`).
- **Color usage:** primary/secondary/accent vs hardcoded `bg-green-600`, `bg-blue-100`, `bg-amber-50`. Do badges/labels follow a shared palette or drift?
- **State visualization:** loading (skeleton vs spinner vs "Loading..."), empty states (generic text vs styled cards), error states (toast vs inline), success states — consistency?
- **Responsive behavior:** grid breakpoints (`sm:`, `md:`, `lg:`, `xl:`), overflow handling (`overflow-x-auto` vs `overflow-hidden`), mobile breakpoints.

### 2. Cross-page comparison

Compare the same element type across pages:
- **Page wrapper** — is every page using `container mx-auto px-4 py-16` or `max-w-6xl mx-auto p-4` or something custom?
- **Page title + subtitle pattern** — is the pattern `<h1>title</h1><p subtitle>` consistent?
- **Card treatment** — card padding, header/content/footer division, hover/active states.
- **Button patterns** — variant/size conventions for primary actions vs secondary.
- **Form layout** — label/input/error presentation across all forms.
- **Table treatment** — header styling, row hover, borders, overflow handling.

### 3. Identify patterns worth standardizing

Note opportunities to establish reusable patterns (e.g., "every page title + subtitle should be a `<PageHeader>` component"; "card padding should be `p-6` not `p-4` or `p-2`; "all form rows should use `space-y-2`").

## Severity rubric

| Severity | Meaning |
| --- | --- |
| **High** | Visual inconsistency that makes the app feel unpolished or broken — e.g., same element type (card, button, heading) looks different across pages; content overflows or is cut off on standard viewports; page wrapper has no max-width causing stretched content; empty/error states are missing or unstyled; form labels don't connect to inputs. |
| **Medium** | Real pattern inconsistency — e.g., card padding differs across groups (p-2 vs p-6 vs p-4); inconsistent margin rhythm between sections; color used inconsistently (primary for some things, hardcoded greens-blues for others). |
| **Low** | Minor polish — spacing could be tighter/looser; hover states could be more visible; text could use more contrast; minor alignment tweaks within a card. |

Deferred UX ideas (e.g., new animations, icon changes, copy changes) → **Backlog-only** (no severity).

## Not a finding examples

- A page intentionally uses a different layout because the content demands it (e.g., home page hero vs reports grid) — justify the difference in the entry.
- A hardcoded color that matches the token palette exactly — `text-blue-600` on `text-muted-foreground` is close enough.
- Inline `h1` inside a `VoterCard` that lives inside a card — the card context sets its own boundaries.
- Dark mode contrast that's slightly off — route to an a11y review.

## Final checklist

- [ ] Every finding names the specific visual inconsistency with at least two page references.
- [ ] Findings distinguish design nits (CSS/layout/visual) from interaction bugs (drift → frontend-state vector) or a11y gaps (→ accessibility vector).
- [ ] Base [Rules](./WHOLE_APP_REVIEW_METHODOLOGY.md#rules) applied: scope, one-path-per-backtick citations, 8–20 post-merge count.
- [ ] Findings-only: no remediation; Already good + Not a finding present.
- [ ] All findings reference **non-admin** pages only.
