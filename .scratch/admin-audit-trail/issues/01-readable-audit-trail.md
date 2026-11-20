# 01 - Make the admin audit trail readable

Status: needs-triage
Tier: 2 (accessibility and IA batch) · Priority: P2
Source: [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md), finding I4

## Problem

- Prod audit trail page 1 is all "Seat Petitioned (Backfill)" rows.
- Rows name records by raw ID ("Committee seat cmu6hnk2").
- The audit trail says "Member Activated" where the workspace History tab says "Added" for the same event.

## Fix

1. Hide system and backfill rows by default, with a filter to show them.
2. Render human names: "Brighton LD 45 ED 2 seat 3" instead of IDs.
3. One vocabulary for membership events, shared with the History tab (`api/lib/membershipHistory.ts`).

## Open question

Which wording wins, History's ("Added") or the audit trail's ("Member Activated")? Recommend History's, since Leaders
see it.

## Acceptance criteria

- [ ] Default view starts with user actions.
- [ ] No raw IDs in the default columns.
- [ ] The same event has the same name on both pages.
