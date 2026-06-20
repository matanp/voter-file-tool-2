# Accessibility and Mobile Baseline Checklist

**Ticket:** 3.6 Mobile and Accessibility Baseline for New Admin/Committee UI  
**Purpose:** Define a minimum accessibility and mobile usability bar for Tier 2/3 UI workflows before release.  
**Scope:** Baseline checklist and audit tracking artifact only (not a full accessibility certification audit).

## Severity Rubric

Use this rubric for any failed checklist item.

| Severity | Definition | Release Impact |
| --- | --- | --- |
| Critical | Blocks core task completion, creates keyboard trap, or prevents screen-reader users from using core workflows. | Must fix before ship |
| Major | Significant usability/accessibility degradation, but workaround exists. | Fix in current or next immediate sprint |
| Minor | Cosmetic or low-risk improvement that does not block core flows. | Can defer with ticket |

## 1. Keyboard Navigation

- [ ] All interactive elements are reachable via Tab key in logical order.
- [ ] Focus is visible on all interactive elements (outline or ring).
- [ ] Modals/dialogs trap focus (Tab cycles within modal, Escape closes).
- [ ] Dropdown menus support arrow key navigation.
- [ ] Forms can be submitted with Enter key.
- [ ] No keyboard traps (user can always navigate away).

## 2. ARIA Labels and Semantics

- [ ] All form inputs have associated `<label>` elements or `aria-label`.
- [ ] Required fields are marked with `aria-required="true"`.
- [ ] Error messages are linked to inputs via `aria-describedby`.
- [ ] Dialog components use `role="dialog"` and `aria-labelledby` (shadcn Dialog does this by default).
- [ ] Tables use `<th>` headers with `scope="col"` or `scope="row"`.
- [ ] Icon-only buttons have `aria-label` (for example: close, delete, menu toggle).
- [ ] Landmark regions (`<main>`, `<nav>`, `<aside>`) are used correctly.

## 3. Status and Announcement

- [ ] Async operations (report generation, form submission) announce status to screen readers via `aria-live="polite"` region or toast announcements.
- [ ] Error messages on form submission are announced (not just visually displayed).
- [ ] Loading states have `aria-busy="true"` on the loading container.
- [ ] Success/failure toasts are announced (Toaster component should handle this; verify).

## 4. Touch Targets and Responsive Layout

- [ ] All clickable/tappable elements are at least 44x44px on mobile (WCAG 2.5.5).
- [ ] Buttons in action menus have adequate spacing (no accidental taps).
- [ ] Tables scroll horizontally on mobile (not overflow-hidden or truncated to unusable width).
- [ ] Forms stack vertically on mobile (no side-by-side inputs that become too narrow).
- [ ] Modals/drawers are usable on mobile (full-width on small screens, dismissible).
- [ ] Admin sidebar hamburger menu works correctly on touch.

## 5. Color Contrast

- [ ] Text meets WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text).
- [ ] Warning badges (`bg-amber-100 text-amber-800`) pass contrast check.
- [ ] Error states (`text-destructive`) pass contrast check.
- [ ] "Coming soon" badges (muted) pass contrast check.
- [ ] Badge text on colored backgrounds passes contrast check.
- [ ] Focus indicators have sufficient contrast against their background.

## Audit Targets

- [ ] CommitteeSelector (`/committees`)
- [ ] Admin Users / Jurisdiction Assignment (`/admin/users`)
- [ ] Audit Trail (`/admin/audit`)
- [ ] Report Forms (3.2, 3.3, 3.4 scope)
- [ ] Meetings (`/admin/meetings`)
- [ ] Petition Outcomes (`/admin/petition-outcomes`)

## Status Legend

- `Pass`: Meets baseline for evaluated criteria.
- `Fail`: Does not meet baseline; requires fix.
- `Partial`: Mixed outcomes; at least one criterion fails.
- `Blocked`: Cannot fully evaluate yet (feature/route not implemented).
- `Not Started`: Audit not run yet.

## Per-Page Pass/Fail Matrix

| Page / Workflow | Keyboard | ARIA/Semantics | Status/Announcement | Touch/Responsive | Contrast | Overall | Notes | Follow-up Ticket |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CommitteeSelector (`/committees`) | Not Started | Not Started | Not Started | Not Started | Not Started | Not Started |  |  |
| Admin Users (`/admin/users`) | Not Started | Not Started | Not Started | Not Started | Not Started | Not Started |  |  |
| Audit Trail (`/admin/audit`) | Not Started | Not Started | Not Started | Not Started | Not Started | Not Started |  |  |
| Report Forms (3.2, 3.3, 3.4) | Blocked | Blocked | Blocked | Blocked | Blocked | Blocked | 3.2 Sign-In Sheet and 3.3 Designation Weight Summary implemented; 3.4 pending. Defer full audit until all report forms exist. |  |
| Meetings (`/admin/meetings`) | Not Started | Not Started | Not Started | Not Started | Not Started | Not Started |  |  |
| Petition Outcomes (`/admin/petition-outcomes`) | Not Started | Not Started | Not Started | Not Started | Not Started | Not Started |  |  |

## Findings Log (Use for Fails/Partials)

| Page | Checklist Area | Finding | Severity | Blocking? | Suggested Fix | Ticket ID |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  | Critical/Major/Minor | Yes/No |  |  |
