# 06 - Vacancy Report: mark original upload as petitioned

Status: resolved

## Ask (verbatim)

> And the Vacancy Report has everyone down as non petitioned members, we need a way to mark everyone from the original upload as petitioned.

## Comments

### 2026-11-01 - related

[14](14-vacant-seats-weighted-export.md) (Vacant Seats with weighted vote) and [12](12-adds-and-deletes-exports.md)
(the Adds `election type` column, petitioned vs appointed) both depend on the petitioned status fixed here.

### 2026-11-17 - reporter confirms source; triage: ready-for-agent

Avi (email): "The original file of members for 2026-2028 are those results", meaning
`data/Elected County Committee List 2026 - 2028 .txt` (BOE elected list, every row `official type` = ELECTED). See
the 2026-11-17 comment on [02](02-weights-per-seat-and-weight-report.md) for the weight rule this feeds.

**Cause:** the `boeElectedList` roster format already maps ELECTED → `membershipType: PETITIONED`, and bulk load
gives each member a `seatNumber`. But nothing sets `Seat.isPetitioned`. Only the petition-outcomes screen does
(`api/admin/petition-outcomes/record`). So the Vacancy Report and Weight Report see no petitioned seats.

**Plan (no manual entry needed from Avi):**

1. Bulk load: when a membership comes in as PETITIONED, set `isPetitioned = true` on its seat for that term.
2. One-time backfill for data already loaded: for the active term, set `isPetitioned = true` on every seat that
   has, or had, a PETITIONED membership (any status). A petitioned seat stays petitioned after its member resigns
   and someone is appointed. Audit-log it.
3. Make sure seat reconciliation and the petition-outcomes screen don't undo the flag.
4. Check against the file: 1,470 petitioned seats across 437 EDs, at most 4 per ED.

Then the Vacancy Report petitioned/non-petitioned split and the Weight Report columns fill in, and the real Weight
Report can go back to Avi in place of the mock-up.

### 2026-11-17 - audit of every write and read path (replaces the plan above)

Paths are under `apps/frontend/src/app/api/` unless written in full. RS means `apps/report-server/src`.

**Reads are fine.** All weight math goes through `computeDesignationWeight`
(`packages/shared-prisma/src/committeeDesignationWeight.ts`). It counts a seat when `Seat.isPetitioned` is set and
an active member of either type occupies it. That matches the chair's rule, and nothing double counts. The
Vacancy Report, the Weight Report totals, the Seats & Weight tab and the roster rollups will be correct once the
flag is set.

**Write paths that leave an ACTIVE PETITIONED member in a seat without the flag:**

1. `admin/bulkLoadCommittees/bulkLoadUtils.ts` `activateMember` (~875-960), both branches, including moves (~1445).
   This is the known bug. It also clears `petitionVoteCount` and `petitionPrimaryDate` on rows that are already
   ACTIVE (~916).
2. `admin/handleCommitteeDiscrepancy/route.ts` (~195-280), both branches. A reactivated PETITIONED member is moved
   to a new seat, so the flag stays on the old seat.
3. `committee/add/route.ts` (~218-280). Admin direct-add can choose PETITIONED.
4. `lib/membershipConfirmation.ts` (~235-265). Latent: `requestAdd` stores a null type today.

The following paths are fine and need no change: exit flows (they leave the seat flagged, as the rule wants),
`ensureSeatsExist`, `missingCommittees`, `seatReconciliation` (a decrease never deletes petitioned seats),
weight recompute, and discrepancy undo. Nothing ever sets the flag back to false. "Immutable for term" is a
convention, not a constraint.

**Fix list:**

1. Add `markSeatPetitioned(tx, committeeListId, termId, seatNumber)` to `lib/seatUtils.ts`. It only ever sets
   true. Call it from paths 1-4 whenever the write leaves `ACTIVE + PETITIONED + seatNumber`.
2. **Blocker before the backfill:** the petition-outcomes screen also uses the flag to mean "outcome already
   recorded". `petition-outcomes/record/route.ts:91` returns 409, and `PetitionOutcomesClient.tsx:69` disables
   the seat. After the backfill, admins could not record any outcome. Give "outcome recorded" its own signal,
   for example an existing outcome membership with that `petitionSeatNumber`. This is
   `docs/SRS/tickets/P2-seat-ispetitioned-overloaded-flag.md` (Option B). Fold that ticket in.
3. `CommitteeSelector.tsx:935` (old page) labels a seat Petitioned or Appointed from the flag. Use the
   occupant's `membershipType` instead.
4. Optional: when a member is reactivated (bulk or discrepancy), reuse their previous seat if it is free. Stop
   clearing the petition fields on rows that are already ACTIVE.
5. Optional: set `petitionSeatNumber` on imported winners so the Petition Outcomes and Changes reports
   (RS `committeeMappingHelpers.ts` ~580-720) include them.

**One-time backfill for the active term.** The SQL must be idempotent. Run a SELECT preview first, then audit-log
the change. Set `isPetitioned = true` on the seat named by any of:

- (a) a membership with `membershipType='PETITIONED'` and a non-null `seatNumber`, any status;
- (b) a non-null `petitionSeatNumber`;
- (c) `AuditLog` `MEMBER_ACTIVATED` rows for a PETITIONED membership, using `afterValue->>'seatNumber'`.

Source (c) is needed because bulk sync removal and replacement set `seatNumber` to null. Expect about 1,470
seats across 437 EDs, at most 4 per ED.

### 2026-11-17 - next steps

Order: (2) separate "outcome recorded" from the seat flag, then (1) add `markSeatPetitioned` to all write paths,
then the backfill (dry run first), then the per-seat weight work in [02](02-weights-per-seat-and-weight-report.md).
All of it before the December weights arrive. Once it lands, send Avi the real Weight Report in place of the
mock-up (`data/weight-report-after.png`). A pending question to Avi on replacement appointees is logged on 02.
It affects only the weight engine, not this ticket.

### 2026-11-18 - built, PR open

PR https://github.com/matanp/voter-file-tool-2/pull/159 (branch `seat-petitioned-flag`). Fix-list items 1–3 are in, along with
the "stop clearing petition fields on rows that are already ACTIVE" half of item 4.

- "Outcome recorded" now has its own column, `Seat.petitionOutcomeRecordedAt`, instead of an existing outcome membership.
  The recorder claims the seat atomically on that column, and the migration copies the lock over for every seat
  already flagged.
- Backfill: `pnpm --filter voter-file-tool db:backfill-petitioned-seats`, dry run by default. `--apply --actor-email` writes
  one audit row per seat. The local dev DB dry run finds 1,426 seats across 431 EDs, at most 4 per ED.
- Open question in the PR: recording a no-winner outcome (all lost, or a tie) still flags the seat petitioned.

Left after merge: run the prod dry run (expect ~1,470 seats / 437 EDs), apply it, then ticket 02.

**2026-11-19, closed.** Shipped in PR #159 (merged 2026-11-19 06:55 UTC). Prod backfill applied 2026-11-18 11:09 PM PT: 1,428 `SEAT_PETITIONED_BACKFILLED` audit rows (expected ~1,470 from the dry-run estimate).
