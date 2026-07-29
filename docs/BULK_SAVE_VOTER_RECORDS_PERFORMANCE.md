# bulkSaveVoterRecords Performance Analysis and Testing Plan

**Purpose:** Document performance findings, optimization opportunities, and a plan to add performance testing.

**Date:** February 2025  
**Status:** Draft

---

## Executive Summary

`bulkSaveVoterRecords` in the voter-import-processor package takes 2.8–10.4 seconds per batch (5,000 records). Logged sub-operations account for only ~100–200ms; the remainder (~2.6–10.2s) is spent on `VoterRecordArchive.createMany` and `VoterRecord.findMany` (which run sequentially). Several low-effort optimizations can significantly reduce this time. A performance testing harness will enable baseline measurement and regression detection.

---

## Current State

### Observed Metrics (from report-server logs)

| Metric                     | Typical Range    |
| -------------------------- | ----------------- |
| `bulkSaveVoterRecords`      | 2.8s – 10.4s     |
| `createManyVoterRecords`    | 95–170ms          |
| `batchUpdateVoterRecords`  | 0.02–11ms         |
| Batch size                  | 5,000 records     |

**Configuration:** `BUFFER_SIZE = 5000` in `packages/voter-import-processor/src/parseVoterFile.ts` (line 20).

**Flow:** Used by report-server via `parseVoterFileFromStream` → `bulkSaveVoterRecords` in `packages/voter-import-processor/src/voterRecordProcessor.ts` (lines 328–408).

---

## Root Cause Analysis

`bulkSaveVoterRecords` performs four sequential operations:

| Step | Operation                     | Estimated Time      |
| ---- | ----------------------------- | ------------------- |
| 1    | VoterRecordArchive.createMany | ~2–8s (untimed)     |
| 2    | VoterRecord.findMany          | ~0.5–2s (untimed)   |
| 3    | batchUpdateVoterRecords        | ~0–11ms (logged)    |
| 4    | VoterRecord.createMany         | ~95–170ms (logged)  |

Steps 3 and 4 are explicitly timed and account for ~100–200ms. The remaining 2.6–10.2s is spent on steps 1 and 2.

### Why Step 1 & 2 Dominate

- **VoterRecordArchive.createMany:** Inserts 5,000 rows (~35 columns each) with index maintenance on `@@unique([VRCNUM, recordEntryYear, recordEntryNumber])`. Time increases as the archive table grows.
- **VoterRecord.findMany:** Uses `where: { VRCNUM: { in: [5000 values] } }`. Large `IN` clauses can lead to slower query planning and execution. The query currently selects all columns despite only needing three: `VRCNUM`, `latestRecordEntryYear`, `latestRecordEntryNumber`.

---

## Optimization Opportunities

### Quick Wins (Low Effort)

#### 1. Parallelize Archive createMany and findMany

**File:** `packages/voter-import-processor/src/voterRecordProcessor.ts`

**Current (lines 339–351):**
```typescript
await prisma.voterRecordArchive.createMany({ data: records });
const existingRecords = await prisma.voterRecord.findMany({ ... });
```

**Proposed:** Run both in parallel with `Promise.all` — they are independent. Expected savings: 2–5+ seconds per batch (time ≈ `max(archive, findMany)` instead of sum).

#### 2. Select only required columns in findMany

**Current:** Full row select (35+ columns).

**Proposed:** Add `select: { VRCNUM: true, latestRecordEntryYear: true, latestRecordEntryNumber: true }` — `isRecordNewer` only needs these fields.

**Expected:** Reduced data transfer and memory; more benefit as the table grows.

#### 3. Wrap in a single transaction

**Proposed:** Use `prisma.$transaction(async (tx) => { ... })` to run all four operations in one transaction. Reduces commit overhead.

**Note:** `batchUpdateVoterRecords` uses `prisma.$executeRawUnsafe`; it would need to accept a transaction client for raw SQL or run within the transaction context.

---

### Medium-Effort Improvements

#### 4. Replace large IN clause with temp table

For 5,000 values, a temp table + JOIN can yield better plans:

```sql
CREATE TEMP TABLE tmp_vrcnum (vrcnum TEXT PRIMARY KEY);
INSERT INTO tmp_vrcnum VALUES (...);
SELECT v."VRCNUM", v."latestRecordEntryYear", v."latestRecordEntryNumber"
FROM "VoterRecord" v INNER JOIN tmp_vrcnum t ON v."VRCNUM" = t.vrcnum;
```

#### 5. Tune BUFFER_SIZE

**File:** `packages/voter-import-processor/src/parseVoterFile.ts`

Current: 5,000. Larger batches (e.g. 10,000) reduce per-batch overhead but increase memory and transaction size. Requires benchmarking.

---

## Performance Testing Plan

### Goals

1. Establish a baseline for `bulkSaveVoterRecords` before optimizations.
2. Enable regression detection when changing the import pipeline.
3. Measure impact of each optimization independently.

### Prerequisites

- Test database (see [docs/CODEBASE_AUDIT/TEST_DATABASE_SETUP_PLAN.md](./CODEBASE_AUDIT/TEST_DATABASE_SETUP_PLAN.md)).
- `POSTGRES_PRISMA_URL_TEST` or equivalent for isolated benchmarks.
- Optional: Small fixture CSV for reproducible runs.

---

### Implementation Tasks

#### 1. Add Timing Utilities

**File:** `packages/voter-import-processor/src/benchmarkUtils.ts` (new)

```typescript
/**
 * Measure elapsed time for async function and return result + duration.
 */
export async function measureAsync<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<{ result: T; durationMs: number }> { ... }
```

Or use `performance.now()` before/after; the goal is to capture durations without `console.time` coupling.

---

#### 2. Benchmark Script

**File:** `packages/voter-import-processor/scripts/benchmarkBulkSave.ts` (new)

**Responsibilities:**

- Create Prisma client (dev or test DB).
- Generate or load fixture records (`VoterRecordArchiveCreateManyInput[]`).
- Call `bulkSaveVoterRecords` N times with configurable batch size.
- Record per-call duration and summary stats (min, max, avg, p95).
- Optional: Truncate/seed before each run for consistent state.

**CLI arguments (suggested):**

- `--batch-size` (default: 5000)
- `--batches` (default: 5)
- `--seed-records` (e.g. 10000) — pre-populate VoterRecord for update scenarios

---

#### 3. Granular Timing in bulkSaveVoterRecords

**File:** `packages/voter-import-processor/src/voterRecordProcessor.ts`

Add optional timing callbacks or return a breakdown object when a flag is set:

```typescript
export type BulkSaveTiming = {
  archiveCreateManyMs: number;
  findManyMs: number;
  batchUpdateMs: number;
  voterCreateManyMs: number;
};
```

Implementation options:

- **A:** Always compute and return `BulkSaveTiming` (minimal overhead with `performance.now()`).
- **B:** Only when `process.env.BENCHMARK_MODE === '1'` or similar.
- **C:** Accept optional `onTiming?: (t: BulkSaveTiming) => void` callback.

Recommendation: Option A — low overhead and useful for production debugging.

---

#### 4. Benchmark Fixture Generator

**File:** `packages/voter-import-processor/src/__tests__/fixtures/voterRecordFixtures.ts` (new)

Helper to generate `Prisma.VoterRecordArchiveCreateManyInput[]` with:

- Unique VRCNUMs (e.g. `VRCNUM-${i}`).
- Realistic field values (or minimal required fields).
- Configurable `recordEntryYear` / `recordEntryNumber` for update-vs-create scenarios.

---

#### 5. Performance Test Suite (Optional)

**File:** `packages/voter-import-processor/src/__tests__/bulkSaveVoterRecords.performance.test.ts` (new)

- Uses `describe.skip` or env gate by default (e.g. `RUN_PERF_TESTS=1`).
- Runs `bulkSaveVoterRecords` with fixtures.
- Asserts duration is under a threshold (e.g. `< 15s` for 5k records on CI).
- Documents expected baseline in test name or comment.

---

### Metrics to Capture

| Metric                     | Description                                         |
| -------------------------- | --------------------------------------------------- |
| `bulkSaveVoterRecords`     | Total duration per batch                            |
| `archiveCreateManyMs`      | VoterRecordArchive.insert time                      |
| `findManyMs`               | VoterRecord lookup time                             |
| `batchUpdateMs`            | Raw SQL update time (when updates exist)             |
| `voterCreateManyMs`        | VoterRecord.insert time                             |
| Records per second         | `batchSize / totalSeconds`                          |
| Batch size                 | Records in each call                                |
| Create vs update ratio     | For mixed workloads                                 |

---

### Baseline Targets (Preliminary)

Based on observed logs, initial targets before optimization:

| Scenario              | Batch Size | Target (before opt) | Target (after quick wins) |
| --------------------- | ---------- | ------------------- | ------------------------- |
| All creates (cold)    | 5,000      | < 12s               | < 6s                       |
| All creates (warm)    | 5,000      | < 6s                | < 3s                       |
| Mixed create/update   | 5,000      | TBD                 | TBD                        |

These should be refined after benchmarking on representative hardware and DB state.

---

### Package.json Script

**File:** `package.json` (voter-import-processor or workspace root)

Add:

```json
{
  "scripts": {
    "benchmark:bulk-save": "tsx packages/voter-import-processor/scripts/benchmarkBulkSave.ts"
  }
}
```

Usage: `pnpm benchmark:bulk-save` or `pnpm benchmark:bulk-save -- --batch-size 5000 --batches 10`.

---

### Execution Order

1. Implement `measureAsync` / timing utilities.
2. Add `BulkSaveTiming` and instrumentation to `bulkSaveVoterRecords`.
3. Create fixture generator.
4. Implement `benchmarkBulkSave.ts` script.
5. Run baseline benchmarks, document results.
6. Implement quick wins (parallelize, select).
7. Re-run benchmarks, compare.
8. Add performance test suite (optional) with env gate.
9. Add `benchmark:bulk-save` script to package.json.
10. Document baseline and targets in this file.

---

## References

- `packages/voter-import-processor/src/voterRecordProcessor.ts` — `bulkSaveVoterRecords`, `batchUpdateVoterRecords`
- `packages/voter-import-processor/src/parseVoterFile.ts` — `BUFFER_SIZE`, call site
- `apps/report-server/src/reportProcessors/voterImportProcessor.ts` — entry point for voter import
- [docs/CODEBASE_AUDIT/TEST_DATABASE_SETUP_PLAN.md](./CODEBASE_AUDIT/TEST_DATABASE_SETUP_PLAN.md) — test DB setup for integration tests
