# 19 - Older petition-outcome events show the current cycle's primary date and seat

Type: task
Status: ready-for-agent
Parent: ../map.md

Found in branch review of `committees-workspace` against `main` (2026-10-14, at `fdddbda`).

## Problem

In `buildHistoryEvents`, the `petition_outcome` event takes:

- `primaryDate` from `membership.petitionPrimaryDate` (`apps/frontend/src/app/api/lib/membershipHistory.ts:380`);
- `seatNumber` from `metadata.seatNumber ?? membership.petitionSeatNumber`.

`membership` is the *current* `CommitteeMembership` row. As the module header says, a re-add clears the earlier lifecycle columns on that row. So a `PETITION_RECORDED` event from an earlier cycle shows the latest cycle's primary date (or none), and, when the audit metadata has no seat, the latest seat. This breaks the History tab's rule that events show only what the audit trail recorded and never approximate (ticket 12).

## Questions for triage

- Does `PETITION_RECORDED` audit metadata (`apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts`) record the primary date? If so, read it from there. If not, should recording start writing it?
- For rows that lack it: omit `primaryDate` (and `seatNumber`) rather than fall back to the membership row. Would we rather show nothing than a date that may be wrong?

## Acceptance

- A `petition_outcome` event never shows a primary date or seat that didn't come from its own audit row (or a provably same-cycle source).
- A test with a re-added membership whose current `petitionPrimaryDate` differs from the old event's.

## Comments

**2026-10-14, triage: `ready-for-agent`.** `PETITION_RECORDED` audit metadata already records both `primaryDate` and `seatNumber` (`apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:371-378`). Decision: the `petition_outcome` event reads both **only** from its own audit row's metadata. When the metadata lacks one, omit it. Never fall back to the `membership` row, and don't backfill old audit rows. Runs after ticket 18 in Lane C ([lanes.md](../lanes.md)), since both edit `membershipHistory.ts`.
