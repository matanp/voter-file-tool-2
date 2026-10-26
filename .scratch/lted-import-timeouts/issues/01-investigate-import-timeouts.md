# Investigate: Weighted Table and LTED Matrix imports time out

Status: ready-for-human
Type: task

## Report (2026-09-19, from Avi)

- `/admin/weighted-table` → Import `Weighted Table 20250110 (1).xlsx` → red "Request timed out"
- `/admin/lted-crosswalk` → Upload `LTED Matrix 2025 (1).xlsx` → red "Request timed out"; "Last imported: Never" still shows afterwards

Both uploads go through `XlsxUploadCard` → `useApiMutation`, which aborts the fetch client-side
after a **10 s** default (`apps/frontend/src/hooks/useApiMutation.ts:45`). `XlsxUploadCard` does not
override `timeout`. So "Request timed out" is the *browser* giving up, not necessarily the server.

## Hypotheses, ranked

### H1 (most likely): server work is O(rows) DB round trips, exceeds 10 s

`api/admin/crosswalk/import/route.ts` — per row: `findUnique` + `upsert` = 2 sequential queries.
`api/admin/weightedTable/import/route.ts` — per matched row: `committeeList.update` +
`recomputeSeatWeights` (which itself does `findUnique` + `getGovernanceConfig` + `seat.updateMany`) = 4 queries.

A full-county LTED Matrix is ~1,000+ rows. At even 20–50 ms per round trip to a hosted Postgres,
crosswalk import = 40–100 s, weighted table = 80–200 s. Both blow past 10 s trivially.

Because the client aborts but the server keeps going, the DB may actually be partially or fully
written *after* the user sees the error. That also explains "Last imported: Never": the audit event
(`CROSSWALK_IMPORTED`) is written only at the very end, after the loop.

### H2: Vercel function duration limit

README says frontend deploys to Vercel. Neither route sets `export const maxDuration`. Hobby = 10 s,
Pro = 60 s default (300 s configurable). If the server side is also being killed, writes stop mid-loop
with no transaction → partial import, no audit row, nothing in the 500 handler.

### H3: Request body / upload size

`.xlsx` files are small (well under 4.5 MB Vercel body limit) — unlikely, but confirm the file size.

### H4: Dead code path in weighted-table route

`ltedMatrix` form field is never sent by `XlsxUploadCard` (see TODO in route). Not a timeout cause,
but means weighted import relies on `LtedDistrictCrosswalk` for disambiguation — and the crosswalk
import is the one that also failed. Order matters: crosswalk must succeed first.

## Investigation steps

1. **Confirm the failure surface (5 min)**
   - Vercel dashboard → Logs → filter `/api/admin/crosswalk/import` and `/api/admin/weightedTable/import`
     around the time Avi tried. Look for: function duration, `Task timed out after Ns`, or a 200 that
     landed after the client had already aborted.
   - Sentry (server config exists): search for `Crosswalk import error` / `Weighted Table import error`.
   - Ask Avi for the two files (or row counts). Check `LtedDistrictCrosswalk` row count in prod DB —
     if it's non-zero, the crosswalk import partially succeeded despite the error.

2. **Reproduce locally with timing (15 min)**
   - Run the crosswalk import against local Postgres with the real file via `curl -F file=@...`
     and `time`. Then point `DATABASE_URL` at a hosted/remote DB (or add artificial latency) to see
     the per-row round-trip cost. Log `rows.length` and elapsed ms in the route temporarily.
   - Expect local ≈ fast (1–3 s), remote ≫ 10 s. That confirms H1 without needing prod access.

3. **Check prod for partial writes**
   - `select count(*), max("updatedAt") from "LtedDistrictCrosswalk"` and
     `select count(*) from "CommitteeList" where "ltedWeight" is not null and "termId" = <active>`.
   - `AuditLog` for `CROSSWALK_IMPORTED` — absent confirms the loop never finished server-side (H2)
     or the process was still running when the client aborted (H1).

4. **Decide on fix (see below) and verify** with the real files against a remote DB, watching
   both client toast and Vercel function duration.

## Likely fixes (in order of leverage)

1. **Batch the DB work** — biggest win, fixes root cause:
   - Crosswalk: drop the pre-`findUnique`; do one `findMany` of existing keys up front to compute
     created/updated counts, then `createMany` for new rows + a `$transaction` of `update`s for
     existing (or chunked upserts, ~100 per `$transaction`). 2N queries → ~N/100.
   - Weighted table: `getGovernanceConfig` once outside the loop and pass `maxSeats`; wrap updates
     in chunked `$transaction`s; `recomputeSeatWeights` can become a single `updateMany` per chunk.
   - Cf. `bulkLoadCommittees` which already uses `createMany` inside a transaction.
2. **Raise the client timeout** for upload cards — pass `timeout: 120_000` from `XlsxUploadCard`.
   Necessary regardless: 10 s is a query-sized default, not an import-sized one. Show a
   "Importing N rows…" state so the wait is legible.
3. **Set `export const maxDuration = 60`** (or higher per plan) on both routes so Vercel doesn't
   kill them mid-loop.
4. **Make imports atomic** — wrap the whole import in a `$transaction` (or chunked transactions
   with a progress record) so a killed request doesn't leave half a crosswalk. Today an abort at
   row 600 leaves 600 rows written and no audit event.
5. (Later) If files grow further, move to an async job: return 202 with an import id, poll status.

## Open questions

- Which Vercel plan is prod on? (determines whether H2 is also in play)
- Row counts of the two files.
- Did any `LtedDistrictCrosswalk` rows land in prod from Avi's attempt?

## Comments

### 2026-10-25 — fix implemented (Claude), not yet verified in prod

Fixed H1 from the code; no prod access was used, so step 1/3 (Vercel logs, partial-write check) are still open.

- **Crosswalk import**: one `findMany` of the whole crosswalk, diffed in memory → `createMany` for new keys +
  one `UPDATE … FROM unnest(...)` for changed rows, in one `$transaction`. Unchanged rows are not written.
  Summary gains `unchanged` (shown in the UI). Duplicate keys in a file: last row wins (as before).
  Audit event stays outside the transaction (fail-open; a failed insert inside would abort the tx).
- **Weighted table import**: matching logic untouched; the per-row `update` + `recomputeSeatWeights` loop is
  replaced by two `UPDATE … FROM unnest(...)` statements (CommitteeList.ltedWeight, Seat.weight) in one
  transaction. Seat weight is computed in JS via the new `computeSeatWeight` (shared with
  `recomputeSeatWeights`) and sent as text so the Decimal result is identical.
- `export const maxDuration = 60` on both routes; `XlsxUploadCard` takes `timeout`, both cards pass
  `IMPORT_TIMEOUT_MS` (120 s).
- Crosswalk summary also reports `duplicates` (rows whose key repeated; last row wins). Note `updated` now
  counts only rows whose values changed — previously it counted every pre-existing key.
- Both write transactions use a 30 s timeout (Prisma's default is 5 s); the crosswalk skips the transaction
  when nothing changed.
- `ltedImports.pg.integration.test.ts` runs both routes against real Postgres (`pnpm --filter voter-file-tool
  test:pg`), covering all-null columns and the 100/3 seat weight.

To close: have Avi retry both uploads (crosswalk first, per H4) and confirm "Last imported" updates.
