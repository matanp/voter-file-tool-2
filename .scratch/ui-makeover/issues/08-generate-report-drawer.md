# 08 - Generate a report in a drawer instead of a separate page

Status: needs-triage

Blocked by: 05, 07

Part of [ui-makeover](../spec.md).

## Problem

Each "Generate report" card leads to a full page that is mostly empty space. For a Leader the committee is fixed, so the only real choice is Format: three screens for one dropdown. The workspace's own "Generate report" button also navigates away (`CommitteeWorkspaceHeader.tsx:56`).

## Proposal

- "+ New report" opens a picker, then the existing form in an `ActionDrawer`: right-hand on desktop, full-screen on phones.
- On submit the drawer closes, a toast appears, and a "Generating…" row appears at the top of the 07 list.
- `ScopedReportForm` already drives all six scoped types from one registry (`scopeReportUiRegistry.ts`), so this is mostly about where the form is mounted.
- Keep the existing routes as deep links that open the drawer.
- **Out of the drawer:** `/petitions`, `/committee-reports` (40+ field checkboxes) and `/voter-list-reports` stay full pages. Launch voter list from Record Search.
- **Copy fix:** the Committee Roster description mentions "(admins)" to Leaders (`scopeReportUiRegistry.ts:19-22`).

Read `skills/adding-reports/SKILL.md` first.

## Acceptance

- All six scoped report types can be generated from `/reports` and from the workspace without leaving the page.
- Old URLs still work.

Evidence: reviews/reports.md §1B.
