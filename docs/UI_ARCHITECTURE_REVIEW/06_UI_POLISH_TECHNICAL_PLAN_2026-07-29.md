# UI Polish Technical Plan

**Scope:** Technical changes that make UI polish, consistency, responsiveness, and empty-state quality easier to maintain.
**Related:** [05_CURRENT_UI_ANALYSIS.md](05_CURRENT_UI_ANALYSIS.md), [SRS ticket 3.6 — Mobile & Accessibility Baseline](../SRS/tickets/3.6-mobile-accessibility-baseline.md)

---

## Purpose

The current UI has strong product functionality and a useful set of shadcn/Radix primitives, but polish is still too dependent on each page author hand-composing layout, headings, empty states, and responsive behavior. The result is visible drift across Record Search, Committees, Reports, Admin, and auth/loading states.

This plan focuses on small UI infrastructure changes that reduce repeated decisions and make the cleaner design the default path.

---

## Guiding Principles

1. **Make polished UI the path of least resistance.** Pages should not need to remember exact combinations of `w-full p-4`, `max-w-6xl mx-auto`, `primary-header`, `m-10`, bare loading text, or local empty-state markup.
2. **Extract on evidence, not on anticipation.** Every new component below names its existing call sites. Anything with fewer than two real call sites today is explicitly deferred, not built "for later."
3. **Prefer generalizing what exists over adding a parallel system.** `ScopedReportPageShell`, `components/ui/table.tsx`, and `lib/constants/sizing.ts` already encode partial versions of what follows. Each is addressed explicitly.
4. **Bake in accessibility at creation time.** Retrofitting a11y into shared components after they are adopted everywhere is the expensive order. See [Cross-Cutting: Accessibility](#cross-cutting-accessibility).

---

## Phase 0: Baseline And Quick Fixes

Do this before writing any component. It costs well under an hour and makes every later phase measurable.

### 0.1 Capture the drift baseline

Run and record. These are the numbers the rest of the plan is measured against (from `apps/frontend/src`):

| Signal | Command | Today |
| --- | --- | --- |
| `primary-header` call sites (files) | `grep -rn 'primary-header' . \| grep -v globals.css` | **18 (12)** |
| Raw `<table>` outside `components/ui/table.tsx` | `grep -rn '<table' . \| grep -v 'components/ui/table.tsx'` | **5** |
| `w-max` | `grep -rn 'w-max' .` | **5** |
| Literal `Loading...` / `Loading…` | `grep -rn 'Loading\.\.\.\|Loading…' .` | **10** |
| `bg-white` outside `components/ui/` | `grep -rn 'bg-white' . \| grep -v '/components/ui/'` | **29** |
| `text-gray-*` / `bg-gray-*` outside `components/ui/` | `grep -rn 'text-gray-\|bg-gray-' . \| grep -v '/components/ui/'` | **35** |
| Fixed `min-w-[600px]` | `grep -rn 'min-w-\[600px\]' .` | **1** |

### 0.2 Dark mode: deferred

`ThemeProvider` is **commented out** in [`src/app/layout.tsx:33-38`](../../apps/frontend/src/app/layout.tsx). `components/ui/themeToggle.tsx` is therefore unreachable, and the `.dark` CSS variable block in `styles/globals.css` is unused.

**Policy:** leave it exactly as it is. Do not enable it, and do not rip it out. The machinery stays parked until dark mode is actually a product goal.

Consequences for this plan:

- **No token migration campaign.** The 29 `bg-white` and 35 `*-gray-*` sites outside `components/ui/` are **not** a work item. Their only real payoff is dark-mode correctness, and that payoff is deferred, so converting them now is cost with no return.
- **Semantic tokens are still the rule for new and touched code.** `bg-card`, `text-card-foreground`, `text-muted-foreground` cost nothing extra to write and render identically today. Use them in every new shared component (§1, §2, §4) and in any block a phase already rewrites. This is a ratchet, not a campaign: the count goes down as a side effect of other work and never goes up.
- **Leave `components/ui/` alone.** The base primitives hardcode `bg-white … dark:bg-slate-950` rather than `bg-card` / `bg-popover` (`card.tsx:12`, `popover.tsx:22`, `select.tsx:78`, `dropdown-menu.tsx:50`, `sheet.tsx:34`, `command.tsx:18`). They are stock shadcn, they render correctly in light mode, and fixing them is dark-mode prep. Out of scope.
- **Verification is by eye, not by theme.** Without dark mode there is no cheap way to *see* a token violation, so the ESLint rule in §8 is the only signal — which is a reason to keep that rule scoped to new code (see §8) rather than firing on 64 pre-existing sites.

When dark mode does get picked up, the work is: uncomment `ThemeProvider`, wire `themeToggle`, fix `components/ui/` first, then sweep whatever hardcoded colors the ratchet has not already absorbed.

### 0.3 Page-title typography

**Settled ([Decision 1](#decision-1-page-title-color)):** keep the green brand color. Page titles use `text-2xl text-primary font-bold tracking-tight`, owned by `PageHeader`. §3 is hierarchy-only — section and panel scales drop `text-primary` and use semibold/medium weights as appropriate.

### 0.4 Land the standalone quick fixes first

[05_CURRENT_UI_ANALYSIS.md §11](05_CURRENT_UI_ANALYSIS.md) lists fixes that need no shared primitive and no design decision. Do them in one small PR before any component work:

| ID | Fix | Where | Effort |
| --- | --- | --- | --- |
| U2 | `w-96 m-4` → `w-full max-w-2xl m-4` | `app/committees/requests/page.tsx:103` | 2 min |
| U3 | `min-w-[600px]` → `min-w-0` + responsive grid at the call site | `CommitteeSelector.tsx:1124` | 15 min |
| U4 | Replace `<p>Loading...</p>` with the existing `Skeleton` primitive | `CommitteeSelector.tsx:899` | 15 min |
| U5 | `bg-white` / `text-gray-*` → `bg-card` / `text-card-foreground` | `RecordsList.tsx:275-286` (`VoterCard`) | 2 min |

Notes:

- U2 is the narrowest page in the app at a fixed 384px and is the single highest visible-payoff line in this plan. It is **not** waiting for `PageShell`; §1 will re-home it later.
- U3 and U5 are re-done properly in Phase 3 (§7) when `VoterCard` moves. Doing them now is not wasted — it removes the two worst symptoms earlier, and Phase 3's diff stays the same size.
- U4 is a like-for-like swap to `components/ui/skeleton.tsx`, not the §2 `StatusState` work. It drops the `Loading...` count from 10 to 9.

**Why first:** roughly 35 minutes buys most of the visible improvement in this document, with no new abstractions and nothing to review beyond the diff itself.

---

## Recommended Near-Term Changes

### 1. Shared Page Layout Primitives

**Problem:** Top-level pages use inconsistent containers, margins, headings, and backgrounds. Compare `reports/page.tsx:30` (`w-full p-4 space-y-6`, heading `text-3xl font-bold tracking-tight`), `ScopedReportPageShell.tsx:35` (`min-h-screen bg-primary-foreground` + `max-w-6xl mx-auto p-4`, heading `primary-header`), `committees/requests/page.tsx:103` (`w-96 m-4`), and `recordsearch/RecordsList.tsx:220` (`m-10`). That is four container idioms and at least three heading scales.

**Add — two components, not five:**

- `PageShell` — container, max-width, page padding, background.
- `PageHeader` — title, description, optional `actions` slot.

**Suggested API:**

```tsx
<PageShell maxWidth="6xl">
  <PageHeader
    title="Record Search"
    description="Find voters by name, address, district, or registration fields."
    actions={<Button>Export</Button>}
  />
  {children}
</PageShell>
```

**Default behavior:**

- Consistent page padding across mobile and desktop.
- Max-width options: `none`, `5xl`, `6xl`, `7xl`.
- Consistent title scale and description styling (`text-sm text-muted-foreground`).
- `actions` slot wraps cleanly on mobile.
- No page-level card wrapping by default.

**Generalize, don't duplicate:** [`components/reports/ScopedReportPageShell.tsx`](../../apps/frontend/src/components/reports/ScopedReportPageShell.tsx) is already a near-miss version of this (max-width container, title + description, inline permission branch). `PageShell` must be extracted *from* it, and `ScopedReportPageShell` reimplemented on top — otherwise the codebase ends up with two shells. Its inline permission-denied block at line 27 is an immediate customer for §2.

**There are already two copies of that shell.** [`app/committee-reports/page.tsx:17-40`](../../apps/frontend/src/app/committee-reports/page.tsx) is a near-verbatim duplicate: same `w-full p-4` + `Card` + "You do not have permission to access this page." branch, same `w-full min-h-screen bg-primary-foreground` wrapper, same `max-w-6xl mx-auto p-4` inner container, same `primary-header` + `text-muted-foreground mt-2` header block. So `PageShell`/`PageHeader` clear the two-call-site bar on day one from these two files alone, and the permission branch clears it for §2. Convert both in the same PR; leaving one behind recreates the drift.

**Deferred, not built:**

- `PageSection` / `SectionHeader` — for now, `<Card>` plus the §3 section-title class is sufficient. Revisit if §5's extraction produces a repeated section wrapper worth naming.
- `Toolbar` — no established toolbar pattern exists to consolidate. Build it when a second real use appears.

**Initial targets:** Reports, scoped report pages, Committees, Record Search. Admin pages adopt `PageShell` opportunistically when touched for other work ([Decision 3](#decision-3-admin-pageshell-rollout)) — no dedicated admin migration pass.

---

### 2. One Shared State Component

**Problem:** Loading, sign-in, permission-denied, no-data, and no-results states are frequently bare text. `authcheck.tsx:40` renders `<h1>Loading...</h1>`; `PageSignInRequired.tsx` is 13 unstyled lines; `ScopedReportPageShell.tsx:27` inlines its own permission card; `CommitteeSelector.tsx:899` renders `<p>Loading...</p>`.

**Add — one component with variants, not five sibling components.**

`EmptyState` / `LoadingState` / `PermissionState` / `SignInRequiredState` / `ErrorState` all render the same shape: icon, title, description, primary action, optional secondary action. Five separate files with the same shape is precisely the drift this plan exists to prevent.

```tsx
// One implementation.
<StatusState
  variant="empty" | "loading" | "permission" | "sign-in" | "error"
  size="compact" | "page"
  icon={…}
  title="No pending committee requests"
  description="New requests will appear here after leaders submit committee changes."
  action={<Button asChild><Link href="/committees">View committees</Link></Button>}
/>
```

Thin named wrappers (`<SignInRequired />`, `<LoadingState />`) are fine and encouraged where they make call sites read better — as long as they are three-line re-exports over the single implementation, carrying the right default copy, icon, and ARIA semantics.

**Default behavior:**

- Card or bordered panel treatment, consistent across variants.
- Compact and full-page sizes.
- Correct ARIA per variant (see [Cross-Cutting: Accessibility](#cross-cutting-accessibility)).

**Initial targets:** `PageSignInRequired`, `AuthCheck`, `AdminPageAccessDenied`, `ScopedReportPageShell`'s permission branch, `/committees/requests` empty/error states, Committee selector initial/empty states, report list empty/error states.

**Note on `AuthCheck`:** its own doc comment states it is a client-only gate on *acting* privilege and **not** authorization — real enforcement is `getAdminPageAccess` / `getAuthenticatedPageAccess` in Server Components. Restyling it is fine; the new `PermissionState` treatment must not make that gate look more authoritative than it is, and this refactor must not touch the server-side checks.

---

### 2b. Confirm Destructive Actions

Numbered `2b` to avoid renumbering §3–§8, which are cross-referenced throughout. Scheduled in Phase 1 alongside §2.

**Problem:** Destructive actions fire immediately on click. [`ReportsList.tsx:184`](../../apps/frontend/src/components/reports/ReportsList.tsx) is the clearest case:

```tsx
const handleDeleteReport = async (reportId: string) => {
  void deleteReportMutation.mutate(undefined, `/api/reports/${reportId}`);
};
```

One click, no dialog, no undo. Reject-request is the same shape.

This is the one item in this plan that is not polish — it prevents data loss — and it is cheaper than anything else here because the primitive already exists. [`components/ui/alert-dialog.tsx`](../../apps/frontend/src/components/ui/alert-dialog.tsx) is present and used in exactly **one** place (`app/admin/data/LtedCrosswalkTab.tsx`). The pattern is proven in-repo and simply has not been applied.

**Change:** add a thin `ConfirmDestructiveDialog` wrapper over the existing `AlertDialog` — title, description naming the specific record, confirm/cancel, `variant="destructive"` confirm button, pending state on the confirm action — and wire it to the unconfirmed destructive actions.

**Initial targets:** delete report (`ReportsList.tsx:184`), reject request (`/committees/requests`), and the case tracked by [`docs/SRS/tickets/P2-admin-reference-data-delete-confirmation.md`](../SRS/tickets/P2-admin-reference-data-delete-confirmation.md).

**Explicitly not a target:** committee member removal. It already opens a modal that captures a structured `RemovalReason` and notes (`CommitteeSelector.tsx:118,547`, per SRS 2.5). That flow is richer than a confirm dialog — do not replace it, and do not stack a confirmation in front of it.

**Accessibility:** Radix `AlertDialog` handles focus trap and `role="alertdialog"`. Ensure the confirm button is not the default-focused element, and that the description names the record rather than saying "this item."

---

### 3. Replace `primary-header` With A Typography Scale

**Problem:** `primary-header` encodes color and size but not semantic hierarchy. It is used for page titles (`committee-reports/page.tsx:32`), section titles (`VoterListReportForm.tsx:408`), a form label (`CommitteeSelector.tsx:782`), and accordion triggers (`FieldSelection.tsx:85`) — four hierarchy levels, one class.

**Change — convert all 18 sites in one pass.** At 18 call sites across 12 files, the conversion is mechanical and fits in a single reviewable change. Do not leave a deprecated utility with no removal date.

**Variants** ([Decision 1](#decision-1-page-title-color) settled — keep green):

- Page title: `text-2xl text-primary font-bold tracking-tight` — owned by `PageHeader`, not applied by hand
- Section title: `text-lg font-semibold`
- Panel title: `text-sm font-medium`
- Supporting copy: `text-sm text-muted-foreground`

Also fold in `reports/page.tsx:33`'s `text-3xl font-bold tracking-tight`, which is a third page-title style already in use — normalize to the page-title variant above.

**Initial targets:** all 18 sites. Record Search headings, Committee Selector headings, report generation pages, and `SearchQueryDisplay` are the highest-traffic subset.

---

### 4. Responsive Form Layout Primitives

**Problem:** Search criteria rows use `w-max` and horizontal flex layouts that overflow on mobile — `VoterRecordSearch.tsx:50` (`w-max flex flex-col items-center gap-4`), `RecordSearchForm.tsx:118` (`lg:w-max w-4/5 bg-primary-foreground p-4`), `SearchRow.tsx:47` (`flex gap-4 …` with no wrap or `min-w-0`).

**Add — one component:**

- `ResponsiveFieldRow` — stacks label/input on mobile, compact row at `md`/`lg`. Call sites: `VoterRecordSearch.tsx:50`, `RecordSearchForm.tsx:118`, `SearchRow.tsx:47`.

**Default behavior:**

- `w-full`, `min-w-0`, max-width by default.
- Stacks on mobile; compact row at `md` or `lg`.
- Remove/action buttons aligned without causing overflow; icon buttons for row-level remove, meeting the 44px touch-target minimum.

**Resolve the conflict with `lib/constants/sizing.ts`.** That file is an existing, deliberate convention exporting fixed widths — `SEARCH_INPUT_WIDTH = "w-[200px]"`, `SEARCH_DROPDOWN_WIDTH = "w-[185px]"`, `SEARCH_INPUT_MIN_WIDTH = "min-w-[200px]"`, and others. Those fixed pixel widths are **part of the cause** of the mobile overflow this section is fixing. The plan must state what happens to it or the codebase will run two competing systems:

> **Policy:** convert the width constants to responsive pairs (e.g. `w-full md:w-[200px]`) owned by the new primitives, keep the height/alignment constants as-is, and delete anything the primitives absorb. Update the file's doc comment to say the primitives are authoritative for layout.

**Deferred:** `FormActions`, `FormPanel`, and `CriteriaCard` — `<Card>` plus `ResponsiveFieldRow` covers the current cases. Revisit after Record Search lands. `FormActions` has no existing call sites today; if the Record Search refactor produces two real action rows that want the same alignment, add it then, with the call sites named.

**Initial target:** Record Search criteria rows.
**Secondary targets:** Add Committee search/results flow, committee request form, voter list report configuration.

---

### 5. Extract Committee Detail Panels

**Problem:** [`CommitteeSelector.tsx`](../../apps/frontend/src/app/committees/CommitteeSelector.tsx) is **1411 lines** mixing inline admin controls, summary blocks, three raw `<table>` elements (lines 988, 1038, 1078), member cards, and add-member forms in one component. It uses `primary-header` at three different hierarchy levels and hardcodes `min-w-[600px]` on member cards (line 1124).

**Approach: extract along the seams the file actually has.**

Read the component, extract the concepts it genuinely separates, and let the count fall out. The likely seams — selector, detail header, admin controls, petition outcome context, designation weight, seat roster, members — are a starting hypothesis, not a checklist to satisfy.

**Rules for the extraction:**

- Each panel owns one concept.
- **Structural extraction only — no visual redesign in the same PR.** Styling changes come after, when diffs are small enough to review.
- Panel headings use the §3 scale; empty/loading/error states use §2; tables use §6.
- Admin-only controls are visually grouped.

**Test impact — must be an explicit step, not a surprise.** Two existing suites mock `VoterCard` at its current path:

- `src/__tests__/components/committees/CommitteeSelectorPetitionContext.test.tsx:51`
- `src/__tests__/components/committees/CommitteeSelector.rosterNavigation.test.tsx:49`

Both `jest.mock` `~/app/recordsearch/RecordsList`. Moving `VoterCard` (§7) or splitting the component will break these. Budget for updating the mocks and for keeping assertions pointed at the new panel boundaries; this refactor must not land with reduced coverage.

**Initial target:** `CommitteeSelector`.

---

### 6. Standardize Tables On The Existing Primitive

**Problem:** Some screens use shared table primitives; five sites use raw HTML tables with custom borders and primary-tinted headers — `CommitteeSelector.tsx:988,1038,1078` (`w-full text-sm border border-primary-200`), `UsersClient.tsx:191`, `CandidateOutcomeTable.tsx:46`.

**Change — extend `components/ui/table.tsx`; do not add three new abstractions.**

Five raw tables do not justify `DataTableFrame` + `CompactTable` + `KeyValueTable`, and `KeyValueTable` has no identified call site at all. The shadcn `Table` primitive already exists and already wraps the `<table>` in `overflow-auto`; raw call sites bypass that wrapper.

- Add a `density` prop (`default` | `compact`) to the existing `Table`.
- Ensure horizontal scroll is contained **inside the table frame**, never the page body.
- Add a built-in empty-state slot wired to §2.
- Convert the five raw tables.

Revisit a key-value display component only if a concrete need appears.

**Initial targets:** Petition Outcome Context, Designation Weight Verification, Seat Roster, `UsersClient`, `CandidateOutcomeTable`.

---

### 7. Promote Voter/Member Cards Into Shared Components

**Problem:** `VoterCard` is defined in `app/recordsearch/RecordsList.tsx:258` and imported by Committee UI (`CommitteeSelector.tsx:19`) — a page-level module reaching across features. It hardcodes `bg-white` and `text-gray-*` (`RecordsList.tsx:275-286`) and is wrapped in `min-w-[600px]` at its committee call site.

**Change:**

- Move voter/member display into `components/` (shared), out of `app/recordsearch/`.
- Split generic voter identity display from committee-specific actions.
- Update the two test mocks noted in §5.

**Suggested components:** `VoterSummaryCard`, `CommitteeMemberCard`. (`VoterContactBlock` only if the split actually produces one.)

**Default behavior:**

- Semantic tokens: `bg-card`, `text-card-foreground`, `text-muted-foreground`. This card *is* being rewritten, so it falls under the §0.2 ratchet — convert its `bg-white` / `text-gray-*` while you are in there. Do not expand from here into a broader color sweep.
- Replace `min-w-[600px]` with `min-w-0` plus a responsive grid at the call site.
- Compact and detailed variants.
- Actions outside the card body or in a consistent footer slot.

---

### 8. Design Lint — As ESLint Rules, Not A Separate Script

**Problem:** Many polish regressions are detectable as repeated class/name patterns, but reviewers rediscover them manually.

**Approach:** do not build `pnpm ui:lint`. The repo already runs typed ESLint (`apps/frontend/.eslintrc.cjs`, `pnpm lint`, `pnpm lint:fix`). A second lint command would not get run in practice: it is not in `pnpm lint`, not in CI, and not in editors.

**Instead:** add `no-restricted-syntax` rules matching `JSXAttribute[name.name='className']` string values, at `warn` severity, inside the existing config. This gives file/line reporting, `// eslint-disable-next-line` exceptions, editor squiggles, and CI integration for free. Note that many call sites use `cn(...)` or variables — rules will catch plain string literals first; partial coverage is acceptable.

**Rules:**

| Pattern | Suggested replacement |
| --- | --- |
| `w-max` in page/form layout | `ResponsiveFieldRow` / `w-full min-w-0` |
| Large fixed `min-w-[…px]` (≥400px) | `min-w-0` + responsive grid |
| `bg-white`, `text-gray-*`, `bg-gray-*` outside `components/ui/` — **new/changed files only**, see below | semantic tokens |
| Literal `Loading...` / `Loading…` (bare block-level text, not button labels) | `StatusState` / `Skeleton` |
| Raw `<table>` outside `components/ui/table.tsx` | `Table` |
| `primary-header` | §3 scale |

**Write the rules to be precise, not greedy.** `w-96` alone would flag `admin/loading.tsx:10` (`w-96 max-w-full` on a skeleton bar) and `RecordsList.tsx:206` (a positioned popover) — neither is a bug. Popover/tooltip `w-max` is likewise legitimate. A rule that cries wolf gets disabled wholesale.

**Rules not included** (not expressible precisely enough):

- **Page-level `m-10` / `m-4` → `PageShell`.** `no-restricted-syntax` cannot distinguish a page-root `<div>` from nested elements that legitimately use `m-4`. Container drift is caught by review and by §1 adoption.
- **Bare sign-in / permission / no-data strings → §2 variants.** Lint cannot judge the semantics of arbitrary JSX text. The `Loading...` rule survives only because it is a fixed literal.

**The hardcoded-color rule needs special handling because dark mode is deferred (§0.2).** There are 64 pre-existing sites and no plan to convert them, so a repo-wide rule would emit 64 permanent warnings and train everyone to ignore the lint output. **Settled ([Decision 4](#decision-4-hardcoded-color-lint-scope)):** CI runs color rules only on files changed vs `origin/main` (`git diff --merge-base origin/main`). Local ESLint may still warn on touched files; pre-existing untouched files are not in scope.

**Rollout:**

1. Land as `warn` in the existing config, after Phases 1–3 (layout rules earlier in Phase 2 per implementation order).
2. Fix the highest-value warnings.
3. Promote a small subset to `error` only once the count is near zero.

This is not a substitute for design review, but it turns obvious drift into cheap maintenance.

---

## Cross-Cutting: Accessibility

The shared components are the single best place to bake in a11y — building them first and retrofitting later means touching every call site twice.

**Coordinate with [SRS ticket 3.6 — Mobile & Accessibility Baseline](../SRS/tickets/3.6-mobile-accessibility-baseline.md)**, which is Open and overlaps §4 and §6 directly (44px touch targets, forms stack on mobile, tables scroll horizontally rather than truncate, `aria-live` on async status, `aria-busy` on loading containers). This plan satisfies part of 3.6 via shared primitives; it does not close the full ticket (skip nav, contrast audit, per-page checklists remain separate work).

**Bake into the components at creation:**

- `StatusState` loading variant: `aria-busy="true"` on the container, `role="status"` + `aria-live="polite"` so async transitions are announced.
- `StatusState` error variant: `role="alert"`.
- `ResponsiveFieldRow`: label/input association enforced by the API, not left to callers; icon-only remove buttons require an `aria-label` (the existing `createAccessibilityProps` helper in `lib/searchEventHandlers` already does this — reuse it).
- All interactive elements in new primitives: visible focus ring, minimum 44×44px touch target on mobile.
- `Table`: `<th scope="col">` by default.

Each phase below is done only when the components it introduces satisfy the relevant 3.6 checklist rows.

---

## Implementation Order

### Phase 0: Baseline And Quick Fixes

1. Capture the drift baseline (§0.1).
2. Land the U2–U5 quick fixes (§0.4) in **PR 1** ([Decision 2](#decision-2-phase-1-pr-strategy)).

Dark mode (§0.2) is settled: deferred, left in place, no token campaign.
Page-title color ([Decision 1](#decision-1-page-title-color)) is settled: keep green; `PageHeader` owns `text-2xl text-primary font-bold tracking-tight`.

### Phase 1: Shells And States

Split across three PRs ([Decision 2](#decision-2-phase-1-pr-strategy)):

**PR 1 (Phase 0):** §0.4 quick fixes (U2–U5).

**PR 2 — shells, states, destructive confirm:**

1. Extract `PageShell` and `PageHeader` from `ScopedReportPageShell`; reimplement `ScopedReportPageShell` on top, **and convert `committee-reports/page.tsx`, which is the duplicate second copy** (§1). `PageHeader` uses the settled green page-title classes.
2. Add `StatusState` with its variants and ARIA semantics.
3. Refactor the auth/loading/permission surfaces (`AuthCheck`, `PageSignInRequired`, `AdminPageAccessDenied`, and the permission branch in *both* shell copies).
4. Refactor Reports and scoped report pages onto the shared shell. Admin pages only if already in scope for another change ([Decision 3](#decision-3-admin-pageshell-rollout)).
5. Add `ConfirmDestructiveDialog` and wire the unconfirmed destructive actions (§2b).

**PR 3 — typography (§3):**

6. Convert all 18 `primary-header` sites to the hierarchy scale; page titles route through `PageHeader` where applicable.

§2b rides in PR 2 because it reuses an existing primitive and is the only data-loss item in the plan.

### Phase 2: Record Search Responsiveness

1. Add `ResponsiveFieldRow`.
2. Resolve `lib/constants/sizing.ts` per §4.
3. Refactor `VoterRecordSearch` and `SearchRow`; remove layout `w-max` and mobile horizontal overflow.
4. Land the `w-max` and large-fixed-`min-w` ESLint rules early (§8), and record a manual 375px pass on the five key routes in the PR — see [Mobile Overflow Verification](#mobile-overflow-verification). Do **not** block on Playwright.

### Phase 3: Committee Detail Structure

1. Extract `CommitteeSelector` panels along real seams — structure only, no restyling.
2. Update the two `VoterCard` test mocks; keep coverage ≥ current ([Decision 5](#decision-5-committeeselector-success-metric)).
3. Move `VoterCard` to shared components and split committee-specific actions (§7).
4. Convert the three raw committee tables to the extended `Table` (§6).
5. Normalize empty/loading states inside each panel.

### Phase 4: Lint

1. Add the remaining `no-restricted-syntax` rules at `warn` to the existing ESLint config.
2. Fix the highest-value warnings.
3. Document allowed exceptions.

The primitives should exist before the lint recommends them.

---

## Mobile Overflow Verification

Automated layout overflow checks cannot run in this repo today:

- There is **no Playwright** — no config, no dependency, no e2e directory.
- `jest.config.cjs` sets `testEnvironment: "jsdom"`, and **jsdom implements no layout engine**. `document.documentElement.scrollWidth` is always `0` there.
- The five target routes are auth-gated Server Components. A real browser check needs Playwright *plus* a running dev server, a seeded database, and a session/auth bypass.

**Phase 2 does this instead:**

1. The `w-max` and large-fixed-`min-w` ESLint rules from §8 — static signal for the exact defect.
2. A manual devtools pass at 375px across the five routes (`/recordsearch`, `/committees`, `/reports`, `/admin`, one scoped report page), with the result recorded in the PR description. Roughly ten minutes.
3. Success criterion for the phase is the recorded manual pass, not an automated assertion.

**Separately, as its own ticket:** stand up Playwright with a seeded DB and auth bypass, then add the overflow assertion as its first test. Independent work with its own budget; this plan does not depend on it.

---

## Deferred Work

### Playwright Visual Checks

Standing up Playwright (with a dev server, seeded DB, and auth bypass) is its own ticket — see [Mobile Overflow Verification](#mobile-overflow-verification). The overflow assertion is its first and highest-value test. Screenshot capture and visual diffing come after that, and after Phases 1–2.

Potential future checks:

- Key pages render correctly at desktop and mobile widths.
- Auth/loading/empty states render with shared state components.
- Core routes can produce screenshots in local development.

### Storybook Or Component Preview

Defer until the shared UI primitives stabilize — adding it before then risks documenting unstable local patterns.

Potential future targets: `PageShell`, `PageHeader`, `StatusState`, search criteria row, committee member card, `Table` densities, report card.

### Components Not Being Built Yet

Explicitly out of scope until a second real call site exists: `PageSection`, `SectionHeader`, `Toolbar`, `FormActions`, `FormPanel`, `CriteriaCard`, `DataTableFrame`, `CompactTable`, `KeyValueTable`, `VoterContactBlock`.

---

## Non-Goals

- Do not redesign the product brand. Page titles keep `text-primary` green ([Decision 1](#decision-1-page-title-color)).
- Do not change authorization or backend behavior. Restyling `AuthCheck` must not touch `getAdminPageAccess` / `getAuthenticatedPageAccess`.
- Do not introduce a new component library.
- Do not make broad visual changes before shared primitives exist. (§0.4 is not an exception: those four fixes are single-line, single-site corrections to specific defects, not a visual pass.)
- Do not convert every screen in one large pass.
- Do not create a component with fewer than two real call sites.
- Do not enable dark mode, and do not delete the parked theme machinery (§0.2). Do not open a standalone PR that converts hardcoded colors.

---

## Success Criteria

**Measurable** — targets against the Phase 0 baseline:

| Signal | Today | Target | Phase |
| --- | --- | --- | --- |
| `primary-header` call sites | 18 | 0 | 1 (PR 3) |
| Raw `<table>` outside `ui/table.tsx` | 5 | 0 | 3 |
| `w-max` in page/form layout | 5 | 0 (popover/tooltip `w-max` exempt) | 2 |
| Literal `Loading...` / `Loading…` (bare block-level) | 10 | 9 after §0.4 (U4), 0 by Phase 3 | 0, 1–3 |
| Fixed `min-w-[600px]` | 1 | 0 | 0 (U3) |
| `bg-white` / `*-gray-*` outside `components/ui/` | 29 / 35 | **no target** — monotonically non-increasing only (§0.2 ratchet) | — |
| Horizontal page overflow at 375px on 5 key routes | unverified | manual pass recorded in PR; automated only once Playwright exists as its own ticket | 2 |
| Unconfirmed destructive actions | 2+ (delete report, reject request) | 0 | 1 |
| Duplicate page-shell implementations | 2 (`ScopedReportPageShell`, `committee-reports/page.tsx`) | 1 | 1 |
| `CommitteeSelector.tsx` structure | 1411-line monolith | panels extracted along real seams; no line-count target ([Decision 5](#decision-5-committeeselector-success-metric)) | 3 |
| Component test coverage (`pnpm test:coverage`) | current | ≥ current | 3 |

**Qualitative:**

- New pages can use shared shell/header/state components without custom layout decisions.
- Auth, loading, permission, and empty states feel intentional rather than unfinished.
- Committee detail code is organized by product concept rather than one long visual flow.
- New shared components satisfy the relevant rows of SRS ticket 3.6.

---

## Decisions

All items below are settled. No open decisions block implementation.

| Topic | Decision |
| --- | --- |
| **Dark mode** | Deferred. Leave `ThemeProvider` commented out; no hardcoded-color migration campaign. Semantic tokens on new/touched code only (§0.2). |
| **Search input widths** | Convert `lib/constants/sizing.ts` width constants to responsive pairs owned by `ResponsiveFieldRow`; keep height/alignment constants (§4). |
| **Destructive confirms** | Ship `ConfirmDestructiveDialog` in Phase 1 PR 2 for delete report, reject request, and admin reference-data delete (§2b). Do not add a confirm in front of committee member removal. |
| **Mobile overflow CI** | Manual 375px pass in Phase 2; Playwright is a separate future ticket. |
| **Design lint delivery** | ESLint `no-restricted-syntax` in existing config, not a separate `ui:lint` script (§8). |
| **Decision 1 — Page title color** | **A — Keep green.** `text-2xl text-primary font-bold tracking-tight` on `PageHeader`. §3 is hierarchy-only; section/panel scales do not use `text-primary`. |
| **Decision 2 — Phase 1 PR strategy** | **B — Split.** PR 1: §0.4 quick fixes. PR 2: shells + `StatusState` + destructive confirm. PR 3: `primary-header` / typography (§3). |
| **Decision 3 — Admin `PageShell` rollout** | **A — Opportunistic.** Wrap admin pages only when touched for other work; no dedicated `/admin/*` migration pass. |
| **Decision 4 — Hardcoded-color lint scope** | **A — Changed files only.** CI runs color rules on `git diff --merge-base origin/main` changed files. |
| **Decision 5 — `CommitteeSelector` success metric** | **C — Coverage only.** Test coverage ≥ current after panel extraction; no line-count target. Pragmatic seam-based extraction (§5) is the bar, not a numeric cap. |

### Decision 1: Page title color

**Chosen: A — Keep green.** `text-2xl text-primary font-bold tracking-tight` on `PageHeader`. §3 is hierarchy-only.

### Decision 2: Phase 1 PR strategy

**Chosen: B — Split.** PR 1: §0.4 quick fixes. PR 2: shells + `StatusState` + destructive confirm. PR 3: `primary-header` / typography (§3).

### Decision 3: Admin `PageShell` rollout

**Chosen: A — Opportunistic.** Wrap admin pages only when touched for other work.

### Decision 4: Hardcoded-color lint scope

**Chosen: A — Changed files only.** CI runs color rules on `git diff --merge-base origin/main` changed files.

### Decision 5: `CommitteeSelector` success metric

**Chosen: C — Coverage only.** No line-count target; keep test coverage ≥ current.
