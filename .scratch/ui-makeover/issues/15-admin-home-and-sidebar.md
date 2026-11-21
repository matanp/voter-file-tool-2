# 15 - Admin home and a counted sidebar

Status: needs-triage

Blocked by: 03, 05

Part of [ui-makeover](../spec.md).

## Problem

`/admin` redirects to the Audit Trail (`app/admin/page.tsx:3`). Nothing shows what needs attention, when data was last imported, or which term is active. The only live signal is plain-text "Pending review (2)" in the sidebar (`AdminSidebar.tsx:41-47`).

The sidebar has 14 items at about 40px each, and the active item is solid green. On phones it is a lone floating button at the bottom-left, so you can't tell which page you're on.

## Proposal

- **Landing page:**
  - a compact header (active term · last voter import · last LTED crosswalk)
  - "Needs attention" count cards: pending eligibility flags, discrepancies, pending meeting submissions, missing committees
  - five recent audit rows
- **Sidebar:**
  - about 32px rows
  - `StatusBadge` count pills, amber when non-zero
  - last-imported dates as secondary text on the import items
  - active item as a tinted background with a left bar, not solid green
- **Phone:** admin sections live in the app bar's ☰ sheet (see 02).

## Acceptance

- `/admin` renders a landing page with live counts.
- Counts in the sidebar.
- No floating admin button on phones.

Evidence: reviews/admin.md §1A and §2.
