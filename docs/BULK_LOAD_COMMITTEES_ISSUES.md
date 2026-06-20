# Bulk Load Committees — Known Issues

Short reference for performance and reliability problems with `POST /api/admin/bulkLoadCommittees` (April 2026 investigation).

## Symptoms

- Postman request runs for **multiple minutes** with no response.
- **Neon CPU spikes** during the request.
- Server log shows `Loaded 1559 records... discrepancies: 64` but **no `POST ... 200`** — import may finish while the HTTP response never returns.
- Committee report may still reflect **old data** if bulk load was never run, or **new data** if import completed but Postman was cancelled mid-response.

## Root Causes

### 1. N+1 voter lookups (~1,559 sequential queries)

[`bulkLoadUtils.ts`](../apps/frontend/src/app/api/admin/bulkLoadCommittees/bulkLoadUtils.ts) calls `prisma.voterRecord.findUnique()` **once per XLSX row** inside a `for` loop. Over a remote Neon connection, this alone can take several minutes.

**Fix:** One batched `findMany({ where: { VRCNUM: { in: [...] } } })`, then look up in memory.

### 2. Sequential committee writes (~474 × 2 queries)

After `committeeList.deleteMany()`, each committee gets its own `upsert()` + `updateMany()` in a loop (~948 more round trips).

**Fix:** Batch committee creation and voter assignment (fewer transactions, or grouped `updateMany` by committee id).

### 3. Post-import work blocks the HTTP response

[`route.ts`](../apps/frontend/src/app/api/admin/bulkLoadCommittees/route.ts) after import:

1. `$transaction` with **64 individual** `committeeUploadDiscrepancy.create` calls (each with a `connect` lookup).
2. `findMany` for all discrepancy voter records.
3. JSON response including **full** `discrepanciesMap` and `recordsWithDiscrepancies`.

The handler can hang or run long **after** the `Loaded ...` log line, even when committee data is already written.

**Fix:** Use `createMany` for discrepancies; return a slim summary (`success`, counts) instead of full payloads.

### 4. Discrepancy members excluded from assignment

Rows with name/address mismatches vs `VoterRecord` are **not** linked to a committee (`accumulateCommitteeMember` skips them). A successful load of 1,559 rows yields at most **~1,495 assigned members** (64 held back in a recent run). This is by design but easy to misread as a failed load.

### 5. Auth disabled on route (temporary)

`withPrivilege(Admin, ...)` is **commented out** on the POST handler — likely for Postman testing. Re-enable before production use.

### 6. Local-only endpoint

Route returns `Not available in this environment` when `process.env.VERCEL` is set. Bulk load must run against a dev/local server with filesystem access to `apps/frontend/data/*.xlsx`.

## Rough query count per run

| Phase | Approx. queries |
| --- | ---: |
| Voter discrepancy check | 1,559 |
| Clear committees | 1 |
| Rebuild committees | ~948 |
| Save discrepancies | 64+ |
| **Total** | **~2,570+** |

## Quick verification after a run

In Neon (or Prisma):

```sql
SELECT COUNT(*) FROM "CommitteeList";                          -- expect ~474
SELECT COUNT(*) FROM "VoterRecord" WHERE "committeeId" IS NOT NULL;  -- expect ~1,495 (1559 − discrepancies)
SELECT COUNT(*) FROM "CommitteeUploadDiscrepancy";             -- expect ~64
```

If those counts look right, the import succeeded even if Postman timed out.

## Related files

- [`apps/frontend/src/app/api/admin/bulkLoadCommittees/bulkLoadUtils.ts`](../apps/frontend/src/app/api/admin/bulkLoadCommittees/bulkLoadUtils.ts)
- [`apps/frontend/src/app/api/admin/bulkLoadCommittees/route.ts`](../apps/frontend/src/app/api/admin/bulkLoadCommittees/route.ts)
- [`docs/COMMITTEE_FILE_DIFF_2025_vs_2026.md`](./COMMITTEE_FILE_DIFF_2025_vs_2026.md) — diff between BOE committee exports
