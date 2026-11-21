# 05 - Promote workspace components to shared primitives

Status: needs-triage

Blocked by: 03, 04

Part of [ui-makeover](../spec.md).

## Problem

The pieces that make the workspace scannable live under `app/committees/workspace/`, so other pages can't reuse them. Meanwhile the shared `Tabs`, `Sheet` and `DropdownMenu` primitives are barely used (2, 5 and 4 files).

## Proposal

Move these to `components/ui/` (or `components/layout/`), generalised just enough for the page tickets that consume them:

| Primitive | Source in workspace | First consumers |
|---|---|---|
| `PageHeader` compact variant: title, `stats` (`·`-joined), `actions` | `CommitteeWorkspaceHeader.tsx:34-46` (fold into the existing `components/layout/PageHeader.tsx`) | every page |
| `FilterChip` / `ChipGroup` | `CommitteeFilters.tsx:135-137` | 07, 12, 16, 17 |
| `ProgressDots` + `Ratio` (x/y, `tabular-nums`) | `CommitteeGrid.tsx:164` | 10, vacancy/weight views |
| `ListRow` / `GroupedList` (sticky collapsible headers, selected bar, meta slot, mobile chevron) | `CommitteeGrid.tsx:47-108` | 07, 09, 16 |
| `UnderlineTabs` | `CommitteeTabs.tsx:60-66` | admin users, 16 |
| `ListDetailLayout` (desktop split, mobile list → detail with back) | `CommitteeWorkspace.tsx:100`, `useIsDesktop`, `useHeightBelowNav` | 09, 16 |
| `ActionDrawer` shell (step heading, body, sticky footer, outcome alert) + `RowActionMenu` (⋯) | `drawer/drawerParts.tsx` | 07, 08 |

## Acceptance

- The workspace imports these from the shared location, with no visual or behavioural change. Its existing tests pass unchanged.
- Each primitive has a short usage comment and a test where it has logic (selection, collapse).

Evidence: reviews/design-system.md §2 "Core primitives"; every lane's §3.
