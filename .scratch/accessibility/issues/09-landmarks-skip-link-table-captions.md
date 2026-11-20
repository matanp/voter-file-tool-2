# 09 - Landmarks, skip link and table captions

Status: ready-for-agent
Tier: 3 (polish) · Priority: P3
Source: [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md), findings A9, A12, A15

## Problem and fix

- **A9.** Two of three `<nav>` landmarks on admin pages are unnamed, and the admin sidebar has no `aria-current`.
  Label each nav; mark the active link.
- **A12.** No skip link. Add "Skip to main content" as the first focusable element.
- **A15.** Record results, the committee roster and the audit trail tables have no caption or `th scope`. Add
  sr-only captions and scopes. (Seats & Weight already has a caption.)

## Acceptance criteria

- [ ] Every nav is named; the active admin link has `aria-current="page"`.
- [ ] The skip link works on every page.
- [ ] The three tables have captions.
