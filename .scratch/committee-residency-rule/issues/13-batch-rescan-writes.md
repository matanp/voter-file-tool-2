# 13 - Batch the BOE eligibility rescan writes so a prod run finishes in one request

Status: resolved
Type: task
Blocked by: 11

## Why

The ticket 11 prod run on 2026-10-25 had about 1,500 stale `ASSEMBLY_DISTRICT_MISMATCH` flags to
resolve. The first run from `/admin/eligibility-flags` timed out in the browser while the server
kept going in the background. It took two runs to finish.

`runBoeEligibilityFlagging` (`packages/shared-prisma/src/boeEligibilityFlagging.ts`) makes two
sequential round trips for each stale `PENDING` flag:

- an `eligibilityFlag.updateMany` guarded by `status: PENDING`
- an `auditLog.create`

It also applies each `pendingFlagUpdates` entry with its own `updateMany`. For N stale flags and U
refreshed flags, that is 2N + U + 1 write statements, none of them in a transaction. Against Neon,
1,500 flags is far past the client timeout.

The run route (`apps/frontend/src/app/api/admin/eligibility-flags/run/route.ts`) has no
`maxDuration`, so Vercel can also kill it mid-loop. A killed run can leave a flag resolved with no
audit row, because the update and the audit insert are separate and not in a transaction.

Commit `5db65f3` fixed the same problem in the LTED crosswalk and Weighted Table imports. This
ticket takes the same approach.

## To do

1. Replace the per-flag loops with a fixed number of statements:
   - `createMany` for new flags (unchanged)
   - one `UPDATE ... FROM unnest(...)` for refreshed pending flags. Per-row `details` and
     `sourceReportId` values differ, and a null array entry leaves that column as it is.
   - one `UPDATE ... FROM unnest(...) ... RETURNING id` that resolves stale flags, still guarded by
     `status = 'PENDING'`
   - one `auditLog.createMany`, only for the ids that `RETURNING` gave back
2. Keep the behaviour the same:
   - `details` built by `buildRescanResolvedDetails`
   - one audit row per flag actually resolved, with the same contents
   - the PENDING guard, so a concurrent review isn't overwritten
   - the same summary counts. `autoResolved` counts only rows that actually changed.
3. Decide whether to use a transaction (see the decision below).
4. Add `export const maxDuration = 60` to the run route.
5. Update the unit tests, and add a Postgres-backed test (`test:pg`). No existing pg test covered
   the rescan.

### Transaction decision

**Yes: one interactive transaction around all the writes, with a 30 s timeout.** Prisma's default
is 5 s. The reads stay outside it.

- **Atomicity matters here.** The audit log is meant to be a complete, write-once trail (SRS §1.5).
  Without a transaction, a crash or a Vercel kill between the resolve `UPDATE` and the audit insert
  leaves flags resolved with no audit row. A rerun wouldn't repair that, because those flags are no
  longer `PENDING`. With a transaction, a failed run changes nothing, and a rerun is safe because
  the run is idempotent.
- **The cost is small now.** The writes are at most four statements, so the transaction is short
  and holds row locks only on the flags being changed. The old per-flag loop would have held a
  transaction open for minutes, which is why it wasn't an option before.
- **Concurrent reviews are still handled by the guard, not by the transaction.** The pending flags
  are read before the transaction (under READ COMMITTED). A reviewer who decides a flag between
  that read and the `UPDATE` changes its status. The `status = 'PENDING'` guard then skips it, and
  `RETURNING` leaves it out of the audit rows and the count.
- **No transaction is opened when nothing changes.** If `db` is already a transaction client (the
  signature allows `Prisma.TransactionClient`), the writes run on it directly.

## Acceptance

- For N stale flags, the run makes a fixed number of write statements (at most 4), not 2N + U + 1.
- Each flag actually resolved gets exactly one `DISCREPANCY_RESOLVED` audit row, with the same
  `beforeValue`, `afterValue` and `metadata` as before. A flag reviewed mid-run is left alone and
  gets no audit row.
- The summary (`scanned`, `newFlags`, `existingPending`, `autoResolved`) matches the old behaviour.
- The run route exports `maxDuration = 60`.
- The unit tests and `pnpm --filter voter-file-tool test:pg` pass.
- After deploy, a prod run finishes in one request (verified on the next real rescan).

## Comments

**2026-10-25: implemented, not yet reviewed or deployed.** The work is on branch
`batch-eligibility-rescan-writes`, commit `12bbaeb` (based on `b0023f7`). It hasn't been pushed and
has no PR.

- **Writes per run:** at most 4 statements in one transaction, down from 2N + U + 1. The reads are
  unchanged (6 queries).
- **One behaviour difference.** All flags resolved in a run now share one `resolvedAt` timestamp
  (`reviewedAt`, `details.resolutionTimestamp` and the audit `metadata.resolvedAt`). Before, each
  flag got its own `new Date()`.
- **Tests:**
  - Unit tests: `boeEligibilityFlagging.test.ts` (1,500-flag batch, RETURNING-filtered audit rows,
    no-op run, transaction-client path) and `eligibilityFlags.test.ts`.
  - New `eligibilityRescan.pg.integration.test.ts`. It runs the real SQL against Postgres and
    checks enum casts, UTC timestamps, JSON details and that a flag dismissed mid-run is left alone
    with no audit row.
  - Results: frontend jest 1734/1734, the api config 941/941, `test:pg` 6/6, shared-prisma 38/38,
    report-server 52/52, and `tsc` is clean. ESLint shows no new warnings.
- **To close:** review, deploy, then confirm on the next prod rescan that it finishes in one request.

**2026-11-19, closed.** Shipped in PR #132 (merged 2026-10-26). Prod audit trail: the first rescan after deploy (2026-11-12 06:13 UTC, System) resolved 26 stale flags, all in the same minute, with one audit row each. It finished in one request. Volume was small, so the 1,500-flag case is unproven in prod; the Postgres integration test covers the SQL.
