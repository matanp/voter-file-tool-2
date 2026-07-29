# UI Polish Technical Plan

**Date:** 2026-07-29  
**Scope:** Technical changes that make UI polish, consistency, responsiveness, and empty-state quality easier to maintain.

---

## Purpose

The current UI has strong product functionality and a useful set of shadcn/Radix primitives, but polish is still too dependent on each page author hand-composing layout, headings, empty states, and responsive behavior. The result is visible drift across Record Search, Committees, Reports, Admin, and auth/loading states.

This plan focuses on small UI infrastructure changes that reduce repeated decisions and make the cleaner design the default path.

---

## Guiding Principle

Make polished UI the path of least resistance.

Pages should not need to remember exact combinations of `w-full p-4`, `max-w-6xl mx-auto`, `primary-header`, `m-10`, bare loading text, or local empty-state markup. Those decisions should live in shared components with good defaults and narrow escape hatches.

---

## Recommended Near-Term Changes

### 1. Add Shared Page Layout Primitives

**Problem:** Top-level pages use inconsistent containers, margins, headings, and background treatments. Examples include full-width pages, centered pages, `m-10`, `m-4`, `bg-primary-foreground`, and `primary-header`.

**Add:**

- `PageShell`
- `PageHeader`
- `PageSection`
- `SectionHeader`
- `Toolbar`

**Suggested API:**

```tsx
<PageShell maxWidth="7xl">
  <PageHeader
    title="Record Search"
    description="Find voters by name, address, district, or registration fields."
    actions={<Button>Export</Button>}
  />
  <PageSection>{children}</PageSection>
</PageShell>
```

**Default behavior:**

- Consistent page padding across mobile and desktop.
- Consistent max-width options: `none`, `5xl`, `6xl`, `7xl`.
- Consistent title scale and description styling.
- Optional `actions` slot that wraps cleanly on mobile.
- No page-level card wrapping by default.

**Initial targets:**

- Record Search
- Committees
- Reports
- Admin pages
- Scoped report pages

---

### 2. Add Shared State Components

**Problem:** Loading, sign-in, permission-denied, no-data, and no-results states are often bare text. This makes important states feel unfinished and causes copy/layout drift.

**Add:**

- `EmptyState`
- `LoadingState`
- `PermissionState`
- `SignInRequiredState`
- `ErrorState`

**Suggested API:**

```tsx
<EmptyState
  title="No pending committee requests"
  description="New requests will appear here after leaders submit committee changes."
  action={<Button asChild><Link href="/committees">View committees</Link></Button>}
/>
```

**Default behavior:**

- Uses card or bordered panel treatment consistently.
- Supports optional icon, title, description, primary action, and secondary action.
- Has compact and full-page variants.
- Can replace raw strings like `Loading...`, `Please sign in to continue`, and `No pending committee requests found`.

**Initial targets:**

- `PageSignInRequired`
- `AuthCheck`
- `AdminPageAccessDenied`
- `/committees/requests` empty/error states
- Committee selector initial/empty states
- Report list empty/error states where not already using a polished pattern

---

### 3. Replace `primary-header` With Component Variants

**Problem:** `primary-header` encodes color and size, but not semantic hierarchy. It is used for page titles, section titles, and compact panel headings, which makes typography feel uneven.

**Change:**

- Keep `primary-header` temporarily for compatibility.
- Move new work to `PageHeader` and `SectionHeader`.
- Gradually remove direct use of `primary-header`.

**Recommended variants:**

- Page title: `text-2xl font-semibold tracking-tight`
- Section title: `text-lg font-semibold`
- Panel title: `text-sm font-medium`
- Supporting copy: `text-sm text-muted-foreground`

**Initial targets:**

- Record Search headings
- Committee Selector headings
- Report generation pages
- Search query display

---

### 4. Add Responsive Form Layout Primitives

**Problem:** Search criteria rows use `w-max` and horizontal flex layouts that overflow on mobile. Similar risk exists wherever forms hand-roll control rows.

**Add:**

- `FormPanel`
- `ResponsiveFieldRow`
- `FormActions`
- `CriteriaCard` or `SearchCriteriaRow`

**Default behavior:**

- `w-full`, `min-w-0`, and max-width by default.
- Stacks labels/inputs on mobile.
- Switches to compact row layout at `md` or `lg`.
- Keeps remove/action buttons aligned without causing overflow.
- Uses icon buttons for row-level remove actions.

**Initial target:**

- Record Search criteria rows.

**Secondary targets:**

- Add Committee search/results flow.
- Committee request form.
- Voter list report configuration.

---

### 5. Extract Committee Detail Panels

**Problem:** Committee detail currently mixes inline admin controls, summary blocks, raw tables, member cards, and add-member forms in one long component. This makes the page harder to scan and harder to polish incrementally.

**Add:**

- `CommitteeScopeSelector`
- `CommitteeDetailHeader`
- `CommitteeAdminControlsPanel`
- `PetitionOutcomeContextPanel`
- `DesignationWeightPanel`
- `SeatRosterPanel`
- `CommitteeMembersPanel`

**Default behavior:**

- Each panel owns one concept.
- Panel headings and descriptions are consistent.
- Tables use shared table primitives.
- Empty/loading/error states use shared state components.
- Admin-only controls are visually grouped.

**Initial target:**

- `CommitteeSelector`

This should be a structural extraction first, not a visual redesign. Once concepts are separated, the styling pass becomes much safer.

---

### 6. Standardize Compact Data Tables

**Problem:** Some screens use shared table primitives, while others use raw HTML tables with custom borders and primary-tinted headers. This creates a mixed visual language.

**Add or standardize:**

- `DataTableFrame`
- `CompactTable`
- `KeyValueTable`

**Default behavior:**

- Consistent border, header, row, and overflow behavior.
- Built-in empty state.
- Optional compact density for admin/detail panels.
- Horizontal scroll only inside the table frame, not the whole page.

**Initial targets:**

- Petition Outcome Context table
- Designation Weight Verification table
- Seat Roster table
- Users table if it remains raw HTML

---

### 7. Promote Member/Voter Cards Into Shared Components

**Problem:** `VoterCard` lives under Record Search but is used by Committee UI. It also uses hardcoded `bg-white` and `text-gray-*` styles.

**Change:**

- Move voter/member display into a shared component area.
- Split generic voter identity display from committee-specific actions.

**Suggested components:**

- `VoterSummaryCard`
- `CommitteeMemberCard`
- `VoterContactBlock`

**Default behavior:**

- Uses semantic tokens: `bg-card`, `text-card-foreground`, `text-muted-foreground`.
- Avoids fixed `min-w-[600px]`.
- Supports compact and detailed variants.
- Keeps actions outside the card body or in a consistent footer slot.

---

### 8. Create A Lightweight Design Lint Script

**Problem:** Many polish regressions are detectable as repeated class/name patterns, but reviewers have to rediscover them manually.

**Add:**

```bash
pnpm ui:lint
```

**Initial warnings:**

- `w-max` in page/form layout components.
- Fixed narrow containers like `w-96`.
- Large fixed min-widths like `min-w-[600px]`.
- Page-level `m-10` or `m-4`.
- Hardcoded `bg-white`, `text-gray-*`, `bg-gray-*` outside approved base UI primitives.
- Raw `Loading...` / `Loading…`.
- Bare sign-in, permission, or no-data strings.
- Raw `<table>` outside approved table components.
- Direct use of `primary-header`.

**Rollout approach:**

1. Start as warnings only.
2. Print file, line, matched pattern, and suggested component.
3. Allow explicit inline exceptions for intentional cases.
4. Promote a small subset to CI failures only after the initial cleanup.

This is not a substitute for design review, but it turns obvious drift into cheap maintenance.

---

## Suggested Implementation Order

### Phase 1: Shared Shells And States

1. Add `PageShell`, `PageHeader`, `PageSection`, and `SectionHeader`.
2. Add `EmptyState`, `LoadingState`, `PermissionState`, `SignInRequiredState`, and `ErrorState`.
3. Refactor the auth/loading/permission surfaces first.
4. Refactor Reports and scoped report pages to use the shared page shell.

**Why first:** It improves visible polish quickly and creates the vocabulary for later page work.

### Phase 2: Record Search Responsiveness

1. Add responsive form/criteria primitives.
2. Refactor `VoterRecordSearch` and `SearchRow`.
3. Remove `w-max` and mobile horizontal overflow.
4. Convert Record Search headings and empty states to shared components.

**Why second:** Record Search is a primary workflow and currently has the most obvious mobile/polish issue.

### Phase 3: Committee Detail Structure

1. Extract selector, summary, admin controls, petition context, seat roster, members, and add-member sections.
2. Replace raw committee detail tables with shared compact table components.
3. Convert member cards to responsive shared components.
4. Normalize empty/loading states inside each panel.

**Why third:** Committee UI is functionally rich; extraction lowers the risk of visual cleanup.

### Phase 4: Design Lint

1. Add warning-only script.
2. Run it locally and capture current findings.
3. Fix the highest-value warnings.
4. Document allowed exceptions.

**Why fourth:** The shared primitives should exist before the lint script recommends them.

---

## Deferred Work

### Playwright Visual Smoke Checks

Defer automated screenshot and responsive checks until after the first shared-shell and Record Search cleanup pass.

Potential future checks:

- Key pages render at desktop and mobile widths.
- No document-level horizontal overflow on mobile.
- Auth/loading/empty states render with shared state components.
- Core routes can produce screenshots in local development.

Recommended first targets:

- `/recordsearch`
- `/committees`
- `/reports`
- `/admin`
- Scoped report generation pages

### Storybook Or Component Preview

Defer Storybook or a lightweight component preview until the shared UI primitives stabilize.

Potential future preview targets:

- `PageShell`
- `PageHeader`
- `EmptyState`
- `PermissionState`
- Search criteria row
- Committee member card
- Compact data table
- Report card

This becomes more valuable after the reusable components exist; adding it before then risks documenting unstable local patterns.

---

## Non-Goals

- Do not redesign the product brand.
- Do not change authorization or backend behavior.
- Do not introduce a new component library.
- Do not make broad visual changes before shared primitives exist.
- Do not convert every screen in one large pass.

---

## Success Criteria

- New pages can use shared shell/header/state components without custom layout decisions.
- Record Search has no mobile horizontal overflow.
- Auth, loading, permission, and empty states feel intentional instead of bare.
- Committee detail code is organized by product concept rather than one long visual flow.
- Hardcoded colors and ad hoc headings are reduced in high-traffic screens.
- A warning-only lint script can surface obvious UI consistency regressions.

