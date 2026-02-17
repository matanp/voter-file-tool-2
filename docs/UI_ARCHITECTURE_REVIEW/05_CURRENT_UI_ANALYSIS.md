# UI Architecture Review — Current UI Analysis

**February 2026**

This document adds **codebase-derived findings** about the actual frontend UI: layout patterns, responsive behavior, design consistency, and UX friction points. It complements the SRS-gap-driven work in earlier documents with observations from the live implementation.

---

## 1. Layout & Container Inconsistency

| Page              | Container / Layout                 | Notes                               |
| ----------------- | ---------------------------------- | ----------------------------------- |
| Home              | `container mx-auto px-4 py-16`     | Centered, consistent                |
| Committees        | `w-full p-4`                       | Full width, no max-width            |
| Record Search     | No outer container; content `m-10` | Inconsistent margins                |
| Reports           | `w-full p-4 space-y-6`             | Full width                          |
| Admin Data        | `w-full m-4 h-full`                | Different margin token              |
| Committee Reports | `max-w-6xl mx-auto p-4`            | Constrained; differs from others    |
| Petitions         | `w-full p-4`                       | Full width                          |
| Requests          | `w-96 m-4`                         | **Fixed 384px width** — very narrow |

**Recommendation:** Standardize on a shared page layout wrapper (e.g. `max-w-7xl mx-auto px-4 py-6`) or document the intentional variance. Fix Requests page width — `w-96` truncates accordion content; consider `max-w-2xl` or `w-full max-w-3xl`.

---

## 2. Responsive Design

### 2.1 Problem Areas

| Component                      | Issue                    | Impact                                                                        |
| ------------------------------ | ------------------------ | ----------------------------------------------------------------------------- |
| CommitteeSelector member cards | `min-w-[600px]` per card | Forces horizontal scroll on tablets/phones; cards don't stack                 |
| Requests page                  | `w-96`                   | Fixed narrow width; poor on wide screens                                      |
| AdminDataClient tabs           | `grid-cols-5`            | "Committee Upload Discrepancies" label may wrap awkwardly on narrow viewports |

### 2.2 Working Patterns

- **Header:** `overflow-x-auto` for overflow; SignInButton moves on `lg:` breakpoint
- **QuickActions:** `sm:grid-cols-2 lg:grid-cols-4` — responsive grid
- **Reports page:** `flex-col xl:flex-row` — stacks My Reports / Public Reports on smaller screens
- **HeroSection:** `flex-col sm:flex-row` for CTA buttons

### 2.3 Recommendation

- Replace member card `min-w-[600px]` with responsive grid (e.g. `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3`) or allow cards to shrink with `min-w-0`
- Add responsive breakpoints for Admin tabs (stack or scroll on narrow screens)

---

## 3. Design System & Visual Consistency

### 3.1 Token Usage

- **globals.css** defines semantic tokens: `--primary`, `--muted-foreground`, `--destructive`, etc.
- Dark mode variables exist but **ThemeProvider is commented out** in layout — dark mode not active

### 3.2 Inconsistencies

| Issue                                           | Location                                                                        | Fix                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| VoterCard hardcodes `bg-white`, `text-gray-800` | RecordsList.tsx                                                                 | Use `bg-card` / `text-card-foreground` or design tokens         |
| Heading sizes vary                              | Multiple pages                                                                  | `text-2xl`, `text-3xl`, `text-5xl` used ad hoc; no shared scale |
| `primary-header` utility                        | Used in AddCommitteeForm, committee-reports                                     | Some pages use inline `text-2xl text-primary font-bold` instead |
| Page backgrounds                                | Record Search: `bg-primary-foreground` on header; committee-reports: whole page | Inconsistent intent (header vs full page)                       |

### 3.3 Recommendation

- Unify heading scale (e.g. `text-2xl` for page titles, `text-lg` for section titles)
- Replace hardcoded colors in VoterCard with design tokens
- Document when to use `primary-header` vs page-specific styles

---

## 4. Loading & Empty States

| Component         | Loading                  | Empty                                                                          |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------ |
| CommitteeSelector | Plain "Loading..." text  | Contextual `noContentMessage()` — good                                         |
| RecordsList       | VoterRecordTableSkeleton | Auth-aware ("Please log in..." vs "Submit a search..." vs "No results found.") |
| ReportsList       | Skeleton cards (3 rows)  | "No reports found" in card                                                     |
| AddCommitteeForm  | "Adding..." on button    | "No results found." after search                                               |
| Requests page     | N/A (server-rendered)    | "No requests found" (returns early)                                            |

**Recommendation:** Replace CommitteeSelector plain "Loading..." with skeleton or spinner for consistency with RecordsList.

---

## 5. Error Handling

- **Primary pattern:** Toast notifications for mutations (`useApiMutation` + `toast`)
- **ReportsList:** Inline error with "Try Again" button — good recovery pattern
- **RecordsList:** Toast for search/load errors; no inline retry
- **No confirmation dialogs** for destructive actions (Remove member, Delete report, Reject request)
- **Error page** (`/error`) exists but styling/experience not audited

---

## 6. Navigation & Links

### 6.1 Header Bug — FIXED

~~`<Link href="admin/data">`~~ → Now `href="/admin/data"`. Previously, when user was on `/committees`, the relative URL resolved to `/committees/admin/data` (404).

### 6.2 Tab Highlighting (already documented)

- Reports: inactive on `/committee-reports`, `/voter-list-reports`
- Committee: inactive on `/committees/requests`

### 6.3 QuickActions Omissions

QuickActions on homepage links to: Record Search, Committees, Petitions, Reports. **Missing:**

- Data (Admin) — intentional? Admins may expect entry point
- Generate Report entry — reinforces report discovery gap

---

## 7. Component Organization & Reuse

| Pattern                     | Status                                                        |
| --------------------------- | ------------------------------------------------------------- |
| RecordSearchForm            | Reused in RecordsList, AddCommitteeForm, CommitteeRequestForm |
| VoterRecordTable            | Reused in AddCommitteeForm, CommitteeRequestForm, RecordsList |
| VoterCard                   | Defined in RecordsList, used in CommitteeSelector — coupling  |
| Card/CardHeader/CardContent | Consistent shadcn usage across Reports, Admin                 |

**Observation:** VoterCard lives in RecordsList but is used by CommitteeSelector. Consider moving to `components/` for clearer ownership.

---

## 8. Accessibility & UX Details

- **aria-busy** on Remove button during loading — good
- **Focus management** in Sheet/Dialog — not audited
- **Keyboard navigation** in ComboBox/cascading selects — not audited
- **ThemeToggle** commented out; dark mode CSS present but unused

---

## 9. Dead or Underused Code

| Item            | Location | Note                      |
| --------------- | -------- | ------------------------- |
| KeyCapabilities | Homepage | Commented out in page.tsx |
| ThemeToggle     | Header   | Commented out             |
| ThemeProvider   | Layout   | Commented out             |

---

## 10. Summary: Additions Beyond SRS Gaps

| Category       | New Finding                                                                           |
| -------------- | ------------------------------------------------------------------------------------- |
| **Bugs**       | ~~Admin Data link `href="admin/data"`~~ — fixed (now `href="/admin/data"`)            |
| **Layout**     | Requests page `w-96` too narrow; page containers inconsistent                         |
| **Responsive** | Member cards `min-w-[600px]` cause horizontal scroll on mobile                        |
| **Design**     | VoterCard hardcoded colors; heading scale ad hoc                                      |
| **Loading**    | CommitteeSelector plain "Loading..." vs skeleton elsewhere                            |
| **Discovery**  | QuickActions omits Data tab; no report generation entry on Reports page (SRS overlap) |
| **Dead code**  | KeyCapabilities, ThemeToggle, ThemeProvider commented out                             |

---

## 11. Recommended Quick Fixes (Current UI Only)

| ID     | Fix                                                                   | Effort |
| ------ | --------------------------------------------------------------------- | ------ |
| ~~U1~~ | ~~Fix Admin Data link: `href="/admin/data"`~~ — **done**              | —      |
| U2     | Widen Requests page: `w-96` → `w-full max-w-2xl` or similar           | 2 min  |
| U3     | Replace member card `min-w-[600px]` with responsive min-width or grid | 15 min |
| U4     | Add skeleton/loading state to CommitteeSelector (match RecordsList)   | 15 min |
| U5     | Replace VoterCard hardcoded `bg-white` with `bg-card`                 | 2 min  |

---

_This analysis is based on static codebase review. Browser-based verification (visual regression, responsive testing, a11y audit) would strengthen findings._
