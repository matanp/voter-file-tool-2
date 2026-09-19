# 07 - Workspace shell, part 1: flag, grid pane, URL state

Type: task
Status: open
Blocked by: 01, 05
Parent: ../map.md

## Question

Execute the first half of plan §6:

- Server-side `COMMITTEES_WORKSPACE=1` switch in `committees/page.tsx`: off renders `CommitteeSelector` unchanged; on renders `CommitteeWorkspace`. A top-level branch — the workspace never wraps or embeds `CommitteeSelector`.
- `CommitteeWorkspace` owning only filters, selected committee id, selected tab, open action, and loading/error coordination; `CommitteeWorkspaceHeader`, `CommitteeGridPane` (`CommitteeFilters`, `CommitteeGrid`) with narrow domain-shaped props.
- Grid grouped by town with collapsible sections, paginated via the roster cursor; no virtualization or split-pane library.
- URL state `?committee=&tab=&town=&ld=`: `router.replace` for filters/tabs, `router.push` for committee selection; restore an accessible committee from the URL, else first visible on desktop; preserve the Leader single-scope shortcut (`singleCommitteeScope` / `committeeScope.ts`); clear or replace invalid selections after filter changes.

The detail pane may be a placeholder in this ticket; ticket 08 fills it. Tests for URL-driven selection, filtering, and invalid-selection recovery are deliverables here (plan §12.2), not later. Read `skills/auth-check-patterns/SKILL.md` for the role-gated header controls.
