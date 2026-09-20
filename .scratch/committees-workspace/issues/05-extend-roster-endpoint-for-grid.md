# 05 - Extend `/api/committee/roster` into the grid read model

Type: task
Status: open
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
