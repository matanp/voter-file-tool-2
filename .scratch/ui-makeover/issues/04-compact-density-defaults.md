# 04 - Compact table and control density by default

Status: ready-for-agent

Blocked by: 01

Part of [ui-makeover](../spec.md).

## Problem

The shadcn `Table` has `TableHead` `h-12` and cells `p-4` (`components/ui/table.tsx`), so a row is about 73px. Workspace rows are about 37px (`CommitteeGrid.tsx:108`, `py-2`). `Input`, `Select` and the default `Button` are `h-10`, and the workspace overrides each one to `h-9`/`sm` at the call site.

Record search, admin users, admin discrepancies and the roster tables all show half the rows they could.

## Proposal

- Add a `density` variant (`compact | comfortable`) to `Table`, with compact as the default: header `h-9`, cells `py-2 px-3`.
- Do the same for `Input`, `Select` and `Button` (compact `h-9`), so the workspace overrides become the default.
- Keep `comfortable` (`h-10`, 44px menu tap targets) for phone forms.
- Rule: no card inside a card. A list inside a section is a `divide-y` bordered list.

## Acceptance

- Tables render at about 37–40px per row by default. Workspace call-site overrides are removed with no visual change to `/committees`.
- Tap targets in phone menus and drawers stay ≥44px.

Evidence: reviews/design-system.md §1 "Density".

## Comments

### 2026-11-21

Prototyped on `proto/ui-makeover` and approved in stakeholder review. No changes requested.

### 2026-11-21 - prototype finding

On `proto/ui-makeover`, changing the `Table` defaults globally (header `h-9`, cells `py-2 px-3`) also made the workspace roster rows on `/committees` shorter, because the roster uses the shared `Table` without its own overrides. That breaks the "no visual change to `/committees`" acceptance line. Either give the roster an explicit density or accept and re-check the shorter rows.

### 2026-11-21 - triage

Ready for agent. Build right after 01, before 03, so the three token and primitive tickets land one at a time.
