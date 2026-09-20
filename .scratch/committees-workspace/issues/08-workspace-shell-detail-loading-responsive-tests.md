# 08 - Workspace shell, part 2: detail loading, responsive navigation, tests

Type: task
Status: open
Blocked by: 06, 07
Parent: ../map.md

## Question

Finish plan §6 and the shell-level parts of §10:

- `CommitteeDetailPane` (`CommitteeContextHeader`, `CommitteeSummary`, `CommitteeTabs` with the four tab shells, roster default) loading from the detail endpoint; loading and failed-detail states; empty-term and empty-jurisdiction states.
- Cancel or ignore stale detail requests when selection changes quickly.
- Responsive: desktop ~35–40/60–65 split with a collapsible (toggle, not drag) grid pane and sticky detail header/tabs; mobile/tablet list-to-detail navigation states with **Back to committees**, starting on the list unless a valid committee id is in the URL; no horizontal overflow at 375px.
- Accessibility baseline: one `h1` **Committees**, `h2` for selected-committee context, semantic keyboard-navigable tabs, keyboard-selectable rows.

Tests (plan §12.2): loading/failed detail, switching committees during a pending request, role-specific controls via `actingPermissions`. Tab *contents* are tickets 09–12.
