# 08 - Unlabeled controls, radio groups without fieldsets, odd names

Status: ready-for-agent
Tier: 2 (accessibility and IA batch) · Priority: P2
Source: [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md), findings A7, A8, A13, A14

## Problem and fix

| Finding | Where | Fix |
| --- | --- | --- |
| A7 radio groups lack fieldset/legend | Vacancy Report "Scope" and "Vacancy Filter", other report forms | Wrap each group |
| A8 unlabeled controls | Advanced search "Street" input; filter chip × buttons; audit trail From/To dates and pager arrows; report-card icon buttons in My Reports | Associate a label or add `aria-label` |
| A13 names like "Enter Last Name (part 2)" | Advanced search | Drop "(part N)"; name each field plainly |
| A14 role picker named "Select Choose role"; mobile menu opens focused on its last item | Profile drawer; mobile nav | Fix the label; focus the first item |

## Acceptance criteria

- [ ] A scripted DOM audit of those pages finds no unnamed inputs or buttons.
- [ ] Each radio group is a fieldset with a legend.
