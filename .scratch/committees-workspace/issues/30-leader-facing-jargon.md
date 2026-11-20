# 30 - Plain terms in Leader-facing views

Type: task
Status: needs-triage
Parent: ../map.md
Tier: 2 (accessibility and IA batch) · Priority: P2
Source: [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md), finding I8

## Problem

Leaders see internal terms:

- "VRCNUM" on the Pending tab.
- "Committee's Assembly District 136" next to "LD 45".
- "petitioned vacant" on the roster.

[21](21-leader-visibility-of-pending-vrcnum-and-replacement.md) decided Leaders *should* see the candidate's ID on
Pending; this ticket is only about how it's labeled.

## Fix

- "Voter ID" instead of "VRCNUM".
- Explain or drop the "Assembly District 136" line next to LD 45 (check what it actually shows).
- Coordinate "petitioned vacant" with Group C of
  [leader-petition-visibility/01](../../leader-petition-visibility/issues/01-hide-petition-generation-and-outcomes-from-leaders.md),
  which is still open.

## Acceptance criteria

- [ ] No internal field names in Leader-visible text.
