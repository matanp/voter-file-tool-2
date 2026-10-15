# 17 - Legacy town roster silently truncates at the roster page limit

Type: task
Status: wontfix
Parent: ../map.md

Found in branch review of `committees-workspace` against `main` (2026-10-14, at `fdddbda`).

## Problem

Ticket 05 made `GET /api/committee/roster` paginated: `limit` defaults to `ROSTER_DEFAULT_LIMIT = 200` (`apps/frontend/src/lib/validations/committee.ts:626`), and the response carries `nextCursor`.

The legacy selector, which is still the default `/committees` experience while `COMMITTEES_WORKSPACE` is off, calls the endpoint with only `cityTown` / `legDistrict` (`apps/frontend/src/app/committees/CommitteeSelector.tsx:331`). It sends no `limit` and ignores `nextCursor`. On `main` the endpoint returned every committee in the scope. On this branch a scope with more than 200 EDs loses everything after the 200th rollup, and its seat rows too, with no indication. The `summary` is still scope-wide, so the header totals and the table also disagree.

It probably doesn't happen with today's data (a non-Rochester town with more than 200 EDs, or a Rochester LD that large), but it's a silent regression on the live path.

## Fix

Pick one:

- **Preferred:** follow `nextCursor` in `fetchRoster` until it is null, concatenating `edRollups` and `rows`, the way `useCommitteeGridData` drains pages. Keep the first page's `summary` / `filters`.
- Or pass `limit=ROSTER_MAX_LIMIT` (500). That's simpler, but it only moves the ceiling.

## Acceptance

- A roster scope with more rollups than one page renders every ED in `CommitteeSelector`.
- Test in `apps/frontend/src/__tests__/` that mocks two roster pages and asserts both pages' EDs render.
- First check the largest real scope (max EDs per town, and per Rochester LD, in the active term) and record it in Comments.

## Comments

**2026-10-14, triage: `wontfix`.** `committees-workspace` merges to `main` once, after ticket 16 deletes `CommitteeSelector`, so this regression never reaches a user. Reopen if the branch ever ships before cutover (then do the preferred fix at the end of Lane A in [lanes.md](../lanes.md), since 14 already edits `CommitteeSelector.tsx`).
