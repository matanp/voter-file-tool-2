# Fix Plan: Reconcile Seats and Weights When `maxSeatsPerLted` Changes

Source finding: P2 - Changing maxSeatsPerLted does not reconcile existing seats or weights.

## Confirmation

Confirmed. The governance config PATCH route updates only the singleton `CommitteeGovernanceConfig` row and its audit log. It does not create missing seats, remove or hide excess seats, or recompute persisted seat weights.

This conflicts with Governance Config 2.2, which says `maxSeatsPerLted` affects capacity checks, seat model creation, and `seatWeight = ltedWeight / maxSeatsPerLted`.

## Evidence Checked

- `apps/frontend/src/app/api/admin/governance-config/route.ts`
  - Lines 141-193: transaction only updates/creates config and writes a governance config audit event.
- `apps/frontend/src/app/api/lib/seatUtils.ts`
  - Lines 39-78: `ensureSeatsExist` creates missing seats only when called and returns if count is already greater than or equal to max.
  - Lines 119-142: `recomputeSeatWeights` recomputes weights, but the governance config route does not call it.
- `apps/frontend/src/app/api/committee/roster/buildSeatRosterRows.ts`
  - Lines 83-92: roster uses persisted seats if any exist and only synthesizes seats when none exist.
- `apps/frontend/prisma/schema.prisma`
  - Lines 386-398: `Seat` has no retired/inactive field, so decreasing max seats needs an explicit policy.
- `docs/SRS/SRS_ADDITIONAL_REQUIREMENTS_Governance_Config.md`
  - Lines 35-46: max seats affects capacity, seat creation, and weight calculation.

## Target Behavior

- Increasing max seats creates missing `Seat` rows for every active-term committee and recomputes weights.
- Decreasing max seats never silently strands active or petitioned seats outside the configured active-term range.
- Roster, capacity, and designation weight views agree after the config update.
- Config update and active-term reconciliation happen in one transaction and are audited.
- If `maxSeatsPerLted` changes while no active `CommitteeTerm` exists, return a clear 422 and do not update the config. Non-seat config changes may still proceed without an active term.
- Historical terms are intentionally not reconciled in this fix; add historical reconciliation later only with a separate product policy.

## Implementation Plan

1. Add a reconciliation helper.
   - Suggested location: `apps/frontend/src/app/api/lib/seatReconciliation.ts`.
   - Export `reconcileSeatsForMaxSeatsChange(tx, { termId, oldMaxSeats, newMaxSeats })`.
   - Return a structured summary:
     - `direction: "increase" | "decrease" | "unchanged"`
     - `committeeCount`
     - `createdSeatCount`
     - `deletedSeatCount`
     - `recomputedCommitteeCount`
   - Throw a typed conflict error for blocked decreases, with deterministic counts and a small sorted sample of affected committees.
   - Operate only on `CommitteeList` rows where `termId` is the active term ID passed by the route.

2. Fetch active-term context only when max seats changes.
   - In `PATCH /api/admin/governance-config`, determine `maxSeatsChanged` after loading the current config or before creating the singleton.
   - If `maxSeatsChanged`, call `findActiveTerm()` before opening the transaction.
   - If no active term exists, return `422` with a stable body such as:
     - `success: false`
     - `error: "Cannot change maxSeatsPerLted without an active committee term"`
     - `fieldErrors.maxSeatsPerLted`
   - Do not call throwing `getActiveTermId()` from the route; use the non-throwing path so this does not become an accidental 500.

3. Increase path, `oldMaxSeats < newMaxSeats`.
   - Scope all reads and writes to `CommitteeList.termId = termId`.
   - Prefer a batched/set-oriented implementation instead of an unbounded per-committee interactive loop:
     - Fetch active-term committees with existing seat numbers.
     - Build missing `{ committeeListId, termId, seatNumber }` rows for `1..newMaxSeats`.
     - Insert with `seat.createMany({ skipDuplicates: true })` in chunks if needed.
     - Recompute weights for active-term committees.
   - If reusing `ensureSeatsExist(committee.id, termId, { tx, maxSeats: newMaxSeats })` and `recomputeSeatWeights(committee.id, { tx, maxSeats: newMaxSeats })`, batch committees and set an explicit transaction timeout because the naive helper loop is roughly five queries per committee.
   - Include created-seat count and recomputed-committee count in the governance config audit metadata.

4. Decrease path, `oldMaxSeats > newMaxSeats`.
   - Before updating the config, check for blockers:
     - Active-term active `CommitteeMembership` rows with `termId = termId`, `status = ACTIVE_MEMBERSHIP_STATUS`, and `seatNumber > newMaxSeats`.
     - Active-term committees whose active member count for `termId = termId` is greater than `newMaxSeats`.
     - Active-term `Seat` rows with `termId = termId`, `seatNumber > newMaxSeats`, and `isPetitioned = true`.
   - If blockers exist, return 409 or 422 with a deterministic error listing counts and a small sample of affected committees. Do not update the config.
   - If no blockers exist, delete only excess vacant, non-petitioned active-term seats where:
     - `Seat.termId = termId`
     - `Seat.seatNumber > newMaxSeats`
     - `Seat.isPetitioned = false`
     - no active `CommitteeMembership` in the same `committeeListId`/`termId` has that `seatNumber`
   - Recompute weights for remaining active-term committees.

5. Wire into `PATCH /api/admin/governance-config`.
   - Load current config before constructing `updateData`.
   - If `currentConfig.maxSeatsPerLted !== parsed.data.maxSeatsPerLted`, call the reconciliation helper inside the same transaction as the config update and audit write.
   - Use an explicit transaction option for the reconciliation path, for example:
     - `prisma.$transaction(async (tx) => { ... }, { timeout: 30_000, maxWait: 10_000 })`
   - If implementation uses set-oriented SQL and local benchmarking proves the default is enough, document that in the PR. Otherwise keep the explicit timeout.
   - Add reconciliation summary to `GOVERNANCE_CONFIG_UPDATED` audit metadata.
   - Keep `logAuditEventOrThrow`.

6. Roster safety net.
   - After reconciliation exists, persisted seats should match max for simple cases.
   - Still consider filtering roster seats to `seatNumber <= maxSeatsPerLted` only if product decides to keep excess rows for history. With the conservative delete/reject policy above, this should not be necessary for active-term display.

7. Tests.
   - Unit test the helper:
     - 4 -> 6 creates seats 5 and 6 for committees missing them.
     - 4 -> 6 fills gaps if seats 1, 2, and 4 exist.
     - 4 -> 2 rejects when an active-term active membership has seat 3 or 4.
     - 4 -> 2 does not reject because of a historical-term active membership with seat 3 or 4.
     - 4 -> 2 rejects when an active-term seat 3 or 4 is petitioned.
     - 4 -> 2 does not reject because of a historical-term petitioned seat 3 or 4.
     - 4 -> 2 deletes vacant non-petitioned active-term seats 3 and 4.
     - 4 -> 2 leaves historical-term seats unchanged.
     - Weight recomputation uses `ltedWeight / newMaxSeats`.
   - Route tests:
     - PATCH calls reconciliation only when max changes.
     - PATCH for non-seat config fields succeeds without an active term.
     - PATCH changing `maxSeatsPerLted` returns clear 422 when no active term exists.
     - PATCH returns deterministic conflict response when decrease is blocked.
     - Audit metadata includes reconciliation summary.
   - Roster regression:
     - Existing committees render 6 seats after 4 -> 6.
     - Existing committees render 2 seats after allowed 4 -> 2.
   - Follow `skills/test-type-safety/SKILL.md`: prefer typed fixtures matching selected Prisma shapes, `jest.mocked`, and Zod parsing for public API response assertions.

## Verification

- Run `pnpm --filter voter-file-tool test -- governance-config seatUtils roster`.
- Run `pnpm --filter voter-file-tool exec tsc --noEmit --pretty false`.
- Manually inspect a roster after increasing and decreasing max seats in a seeded dev database with an active term.
- If the helper uses the existing per-committee seat utilities, test against a realistic active-term committee count or document why the chosen transaction timeout is sufficient.

## Illegible-Bug Checklist

- Trust boundary: route remains `withPrivilege(Admin)`.
- Negative auth: route tests preserve unauthenticated and insufficient-privilege coverage for governance config PATCH.
- State race: config update, reconciliation, and audit run in one transaction.
- Validation: decrease conflicts and no-active-term errors are deterministic and do not partially update state.
- Data scope: all blocker and delete queries are scoped to the active `termId`.
- Audit/state invariants: audit row records old config, new config, and reconciliation summary.

## Review Resolution

- Issue 1 is addressed in Implementation Plan steps 1, 3, and 4 by scoping every reconciliation read/write, blocker query, and delete to the active `termId`.
- Issue 2 is addressed in Implementation Plan steps 3 and 5 by requiring a batched/set-oriented approach or an explicit transaction timeout with documented scale expectations.
- Issue 3 is addressed in Target Behavior and Implementation Plan step 2 by fetching active-term context only when `maxSeatsPerLted` changes and returning a clear 422 if no active term exists.
- Issue 4 is accepted as informational: `recomputeSeatWeights` remains safe without a redundant `termId` filter because `committeeListId` is term-scoped.

## Prior Review Notes

Claude reviewed this plan on 2026-07-05 and verified the core approach, helper signatures, weight formula, lack of a `Seat` retired/inactive field, and roster behavior against current code.

The review originally raised three implementation refinements: term-scope decrease blockers/deletes, avoid a fragile all-committee transaction, and handle the no-active-term path explicitly. Those refinements are now incorporated into the Target Behavior, Implementation Plan, Tests, Verification, and Illegible-Bug Checklist above.
