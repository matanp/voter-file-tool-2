# 10 - Re-run the weighted-table import on prod

Status: resolved
Type: task
Blocked by: 08

## Why

Until 2026-10-25, the prod crosswalk was partial and mislabelled. It had 370 rows across 6 towns,
with nothing for LDs 52-64 and the wrong town on LDs 48-51 (ticket 08). The weighted-table import
matches committees through `lookupCityTown` and falls back on crosswalk town names. A weights load
done before the fix will therefore have missed committees in the 15 affected towns, or matched them
wrongly. Committees it missed have a null `ltedWeight`, and their seats a null `weight`.

The crosswalk was reloaded on prod on 2026-10-25 (659 rows, audit clean), and the corrected
town-code table and the batched import (`5db65f3`) are deployed, so the import can now be re-run.

## To do

1. **Baseline (read-only, psql on prod).** Record how many active-term committees lack a weight,
   by town:

   ```sql
   SELECT c."cityTown", count(*) AS committees,
          count(*) FILTER (WHERE c."ltedWeight" IS NULL) AS no_weight
   FROM "CommitteeList" c
   JOIN "CommitteeTerm" t ON t.id = c."termId" AND t."isActive"
   GROUP BY 1 ORDER BY 1;
   ```

2. **Import.** In the prod admin UI, open **Admin → Weighted Table** (`/admin/weighted-table`) and
   upload the current weight file: `data/Base Committee Weight by LTED 20260109.xlsx`, unless a
   newer one has replaced it. The route runs in one transaction, and the upload waits up to 120 s.
3. **Record the summary** the upload returns (matched, skipped, ambiguous) under `## Comments`.
   Ambiguous or skipped rows in the affected towns would point to a problem that's still there.
4. **Re-run the step 1 query.** `no_weight` should drop to roughly 0, apart from committees that
   genuinely have no row in the weight file. List any that remain.
5. **Local DB.** Repeat this once the local crosswalk has been reloaded
   (`pnpm db:seed-lted-crosswalk ../../data/2024_LTED_Matrix.xlsx`).

## Acceptance

- The prod import has run against the corrected crosswalk, and its summary is recorded here.
- Every active committee with an entry in the weight file has a non-null `ltedWeight`, and its
  seats have a non-null `weight`. Any exceptions are listed with a reason.

## Comments

**2026-10-25 — local.** Uploaded `data/Base Committee Weight by LTED 20260109.xlsx` via
`/admin/weighted-table` against the local DB (crosswalk: 659 rows, 18 towns). All 437 active-term
committees across 21 towns have a non-null, non-zero `ltedWeight`; all 1,748 seats have a non-null
`weight`.

**2026-10-25 — prod.** The first attempt was `pnpm db:seed` with `.env` pointed at prod, not an
upload. That changed no weights, because no seed script writes `ltedWeight`: `db:seed` only upserts
the privileged user, governance config and SYSTEM user. Afterwards, 327/437 committees (every
non-Rochester town, plus 18 of 128 Rochester committees) still had a null `ltedWeight`, and
1,312/1,748 seats a null `weight`. The 110 weighted Rochester committees came from an earlier load.

The import was then run through the prod UI (`/admin/weighted-table`) and succeeded on the first
upload: `no_weight = 0` in all 21 towns and `null_seat_weight = 0` across all 1,748 seats. No
exceptions. The upload's matched/skipped counts weren't recorded.

`docs/SRS/SRS_LTED_WEIGHT_SOURCE.md` §1 used to say weights could be loaded by "seed script". It now
says the admin upload is the only path.
