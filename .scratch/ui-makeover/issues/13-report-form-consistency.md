# 13 - Report form consistency: outlier forms and control styling

Status: ready-for-agent

Blocked by: 01, 04, 08

Part of [ui-makeover](../spec.md).

## Problem

The six scoped report forms match each other. Three outliers each look like a different app:
- **`/petitions`** (`app/petitions/page.tsx:34`, `GeneratePetitionForm.tsx:194-470`):
  - white background where the other forms are pink
  - a 16px left margin vs 80px elsewhere
  - pink-boxed search strips
  - mixed label sizes
- **`/committee-reports`:** loud green accordion headings, 8 identical "Select All" buttons, and about 3,000px of checkboxes at 375.
- **`/voter-list-reports`:** with no search, a lone card with no link back to Record Search.

Across the forms:
- **Mixed control styling:**
  - the Format label sits inline, touching a native browser select (`ScopedReportForm.tsx:345-351,433`)
  - labels are inline on some controls and stacked on others
  - checkboxes and radios mix native and component versions (6/6 and 4/3)
  - focus rings disagree: green on `Input`, which references a nonexistent `border-primary-200`; slate on `Select`; blue in the workspace
- **Inconsistent button label:** Sign-In Sheet says "Generate PDF" where the others say "Generate Report".

## Proposal

- Labels always above controls.
- One styled native `Select` for simple enums; the Radix Select or ComboBox only where search is needed.
- `Checkbox`/`RadioGroup` components everywhere.
- One focus ring: blue-600 (spec "Decisions").
- Full-width primary action at 375.
- Bring the three outlier forms onto the scoped-form shell's spacing and headings.
- `/voter-list-reports` empty state gets a "Go to Voters" action (via 06).

## Acceptance

- At 1280 and 375, the 9 report pages share one header, spacing and control style.
- One focus ring app-wide.

Evidence: reviews/reports.md §1C and §2; reviews/design-system.md §1 "Form controls".

## Comments

### 2026-11-21 - triage

Ready for agent. Focus ring decided: blue-600 app-wide, so it stays separate from green primary buttons. Added 08 as a blocker, because both edit `ScopedReportForm` and its mount points.
