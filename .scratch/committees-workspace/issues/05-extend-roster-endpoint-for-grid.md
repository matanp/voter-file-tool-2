# 05 - Extend `/api/committee/roster` into the grid read model

Type: task
Status: resolved
Parent: ../map.md

## Question

Execute plan §5 "Grid": extend `GET /api/committee/roster` so one paginated call returns every committee in the caller's scope with what the grid needs, without a second parallel copy of the vacancy/weight math.

- Make `cityTown` optional (all towns for Admin; jurisdictions for Leader); keep and use `cursor`/`limit`.
- Add `committeeListId` and the composite `(cityTown, legDistrict, electionDistrict)` to each `EdRollup` (plan §3.11).
- Add `pendingCount` per rollup; aggregate open-seat, pending, and active-membership counts into `summary`.
- Add available filter values (towns, leg districts).
- Support `includeRows=false`.
- Zod-define and validate the response in `lib/validations/committee.ts`.

Read `skills/auth-check-patterns/SKILL.md` first. Tests per plan §12.1: unauthenticated, insufficient privilege, Leader jurisdiction scoping, cross-jurisdiction ids, PII omission, empty scope, vacancy/pending/missing-weight math. Run the §12.3 commands and checklist before resolving.

## Answer

### What changed

- `apps/frontend/src/lib/validations/committee.ts` — roster block is now fully Zod-defined: `rosterQuerySchema` (`cityTown` optional; `legDistrict`; `cursor`; `limit` default `ROSTER_DEFAULT_LIMIT`=200, max `ROSTER_MAX_LIMIT`=500; `includeRows` "true"/"false", default true; Rochester-needs-LD rule only when `cityTown` is given) and `seatRosterRowSchema`, `edRollupSchema`, `rosterSummarySchema`, `rosterFiltersSchema`, `rosterResponseSchema`. The exported TS types (`SeatRosterRow`, `EdRollup`, `RosterSummary`, `RosterFilters`, `RosterResponse`) are `z.infer` of those schemas.
- `apps/frontend/src/app/api/committee/roster/buildSeatRosterRows.ts` — split into layers without a second copy of the math: `buildEdRollup` (one committee: seat synthesis, occupant index, designation weight, `filled`/`unassignedCount`/`pendingCount`), `buildEdRollups`, `summarizeEdRollups` (fold), and `buildSeatRosterRows` (rows on top of `buildEdRollup`, same signature as before). Input types: `RosterCommitteeCore` (lean, for rollups) and `RosterCommittee` (with voter records, for rows).
- `apps/frontend/src/app/api/committee/roster/route.ts` — see "How it works". Still `withPrivilege(PrivilegeLevel.Leader, ...)`; `includeContact = isAdmin` unchanged.
- `apps/frontend/src/app/api/lib/committeeValidation.ts` — added `PENDING_MEMBERSHIP_STATUS = MembershipStatus.SUBMITTED` (the status `/committees/requests` lists) next to `ACTIVE_MEMBERSHIP_STATUS`.
- `apps/frontend/src/app/committees/CommitteeRosterTable.tsx` — `rows` is optional on the contract now; the table reads `data.rows ?? []`. `CommitteeSelector.tsx` needed no change (it always sends `cityTown`; default page size 200 exceeds any single town's ED count).
- Tests: `apps/frontend/src/__tests__/api/committee/roster.test.ts` rewritten (43 tests) and `CommitteeRosterTable.test.tsx` fixtures updated to the new shape. Responses are parsed with `rosterResponseSchema` (`parseJsonResponseWith`), not cast.

### Response shape

```
GET /api/committee/roster?cityTown=&legDistrict=&cursor=&limit=&includeRows=
{
  scope: { cityTown?: string; legDistrict?: number },
  filters: { towns: string[]; legDistricts: { cityTown: string; legDistrict: number }[] },
  edRollups: EdRollup[],          // one page, ordered (cityTown, legDistrict, electionDistrict)
  summary: { totalSeats, filled, vacant, edCount, unassignedCount, pendingCount, activeMemberCount },
  nextCursor: number | null,      // committeeListId of the last rollup; pass back as ?cursor=
  rows?: SeatRosterRow[]          // omitted when includeRows=false
}
EdRollup = { committeeListId, cityTown, legDistrict, electionDistrict, filled, totalSeats,
             unassignedCount, pendingCount, designationWeight, missingWeightSeatNumbers }
```

Semantics: `filters` describe the caller's *base* scope (active term ∩ Admin county-wide / Leader jurisdictions) before `cityTown`/`legDistrict` narrowing, so a town dropdown does not collapse once a town is picked. `summary` and `edRollups` describe the *requested* scope (base ∩ narrowing); `summary` covers every page. A Leader asking for a town outside their jurisdictions gets an empty result (same no-403 policy as before), with `filters` still listing their own towns.

### How the scope-wide summary is computed and its cost

The route issues, in parallel: (1) one lean `committeeList.findMany` over the whole requested scope selecting only ids, the composite key, `seats {seatNumber,isPetitioned,weight}`, ACTIVE memberships `{seatNumber,membershipType,voterRecordId}`, and a filtered relation count `_count.memberships` for SUBMITTED memberships in the term; (2) a `distinct (cityTown, legDistrict)` query over the base scope for `filters`; (3) the governance config. It runs `buildEdRollups` over all of (1) — the single copy of the vacancy/weight math — and `summarizeEdRollups` folds those rollups into `summary`. Pagination is then a slice of that ordered rollup array (`cursor` = last `committeeListId`, `nextCursor` null on the last page; an unknown cursor is a 400). Only when `includeRows` is true does a page-sized `committeeList.findMany` (scope `where` re-applied, `id IN page`) fetch voter records to build `rows`; this is the only query that touches PII.

Cost: query (1) is O(committees in the requested scope) lean rows per request, whatever the page size — for Admin with no filters that is every ED in the county (~10^3 committees, ~4x that in seats and memberships; no voter-record join), which Prisma fetches as three IN-batched selects. The rows query is O(page). The trade made: a constant three queries and a summary that is by construction the sum of the rollups, versus a handful of DB `count` aggregates that would have re-derived vacancy (seat synthesis, occupied-seat rules) in SQL. One consequence to know: a duplicate-seat data-integrity error anywhere in the requested scope now 409s the whole request (previously only that town's request), because the summary cannot be computed past it; Sentry captures it as before.

### §12.3 checklist

- Trust boundary: `GET` stays `withPrivilege(PrivilegeLevel.Leader, getRoster)`; `pnpm check:api-routes` passes (69 methods / 59 files).
- Negative auth: tests cover unauthenticated (401), insufficient privilege (403, ReadAccess) including with `cityTown` omitted, Leader jurisdiction scoping when `cityTown` is omitted, a Leader requesting a town outside their jurisdiction (empty result, filters stay jurisdiction-bound), Leader with no jurisdictions, and that the page query re-applies the scope filter alongside `id IN`.
- State race: n/a — read-only route, no writes.
- Validation: all five query params go through `rosterQuerySchema` (400 on bad `legDistrict`, `cursor`, `limit`, over-max `limit`, non-boolean `includeRows`, Rochester without LD); response typed by `rosterResponseSchema` and parsed by it in tests. No TS casts in the route (the old `committees as unknown as RosterCommittee[]` is gone).
- Data scope: rollups/summary/rows from `termId` + jurisdiction `where`; filters from the same base `where`; contact only when actual privilege is Admin/Developer, and tests assert the serialized Leader response contains no email/phone, and that `includeRows=false` never issues the voter-record query.
- Audit/state invariants: n/a — no mutation.

### Verification

- `pnpm --filter voter-file-tool test`: 108 suites / 1420 tests pass; 2 suites (9 tests) fail — `api/admin/committeeDiscrepancyMembershipType.test.ts` and `components/committees/CommitteeRequestForm.preflight.test.tsx` — verified to fail identically with my changes stashed (pre-existing on this branch, unrelated to the roster).
- `pnpm --filter voter-file-tool lint`: 0 errors, 13 warnings, none in touched files.
- `pnpm --filter voter-file-tool exec tsc --noEmit`: clean.
- `pnpm check:api-routes`: passed.
- `pnpm --filter voter-file-tool build`: passed (exit 0; Next.js production build completed with no type or compile errors).
