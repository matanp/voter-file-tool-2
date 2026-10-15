# 19 - Older petition-outcome events show the current cycle's primary date and seat

Type: task
Status: resolved
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

## Answer

Built in Lane C, on top of ticket 18.

**Read side** (`apps/frontend/src/app/api/lib/membershipHistory.ts`): the `petition_outcome` event now takes `seatNumber` from `metadata.seatNumber` and `primaryDate` from `metadata.primaryDate` only. The date is normalised to ISO, and a missing or unparseable value becomes `null`. Nothing falls back to the membership row. `HistoryMembershipRow` no longer has `petitionPrimaryDate` or `petitionSeatNumber`, so the fallback can't come back by accident. The event schema keeps both fields as `.nullable()`, and `null` is how "not recorded" is sent. The History tab already renders nothing for `null`.

**Correction to the triage premise.** The `record/route.ts:371-378` metadata that the triage cites belongs to the **Seat**-entity `PETITION_RECORDED` row. History never queries that row. The per-candidate **CommitteeMembership** rows, which become the events, recorded `seatNumber` but **not** `primaryDate`. Read literally, the decision would therefore have dropped the primary date from every Admin petition event. So the write side changes too:

**Write side** (`apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts`): both per-candidate `PETITION_RECORDED` writes (update and create paths) now include `primaryDate: primaryDateObj.toISOString()` in their metadata. Per the triage, old rows are not backfilled. Events recorded before this change show no primary date, but the Admin **Election outcomes** section, which reads `petitionContext`, still shows the current cycle's date. Discrepancy-undo rows carry neither field, so they show neither.

Tests:
- `detail.test.ts`, "petition outcome reads only its own audit row": a re-added membership whose current `petitionPrimaryDate`/`petitionSeatNumber` (2026, seat 4) differ from the old event's metadata (2024, seat 2) shows 2024 and seat 2; an old row without the fields shows `null` for both; an unparseable date shows `null`.
- The "assembles…" fixture now carries `primaryDate` in its metadata.
- `record.test.ts` asserts the per-candidate metadata includes `primaryDate`.

## Comments

**2026-10-14, triage: `ready-for-agent`.** `PETITION_RECORDED` audit metadata already records both `primaryDate` and `seatNumber` (`apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:371-378`). Decision: the `petition_outcome` event reads both **only** from its own audit row's metadata. When the metadata lacks one, omit it. Never fall back to the `membership` row, and don't backfill old audit rows. Runs after ticket 18 in Lane C ([lanes.md](../lanes.md)), since both edit `membershipHistory.ts`.
