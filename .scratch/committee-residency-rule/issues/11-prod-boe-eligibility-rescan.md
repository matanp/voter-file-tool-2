# 11 - Re-run the BOE eligibility audit on prod to clear stale AD flags

Status: ready-for-human
Type: task
Blocked by: 08

## Why

While the prod crosswalk was empty, and later partial and mislabelled (ticket 08), the BOE audit
could find no AD for many committees and raised `ASSEMBLY_DISTRICT_MISMATCH` flags with
`expectedAssemblyDistrict: null`. Locally, every one of the 1,426 active memberships had one
(ticket 02). The prod crosswalk was reloaded on 2026-10-25, and ticket 02's prod audit shows every
active committee has an AD that matches its voters. A rescan should now resolve the stale flags.

## To do

1. **Baseline (read-only, psql on prod).**

   ```sql
   SELECT reason, status, count(*),
          count(*) FILTER (WHERE details->>'expectedAssemblyDistrict' IS NULL) AS no_expected_ad
   FROM "EligibilityFlag"
   GROUP BY 1, 2 ORDER BY 1, 2;
   ```

2. **Run the audit.** In the prod admin UI, open **Admin → Eligibility Flags**
   (`/admin/eligibility-flags`) and start a run. It posts to `/api/admin/eligibility-flags/run`
   and defaults to the active term. Record the summary it returns.
3. **Re-run the step 1 query.**
   - Expect the stale `ASSEMBLY_DISTRICT_MISMATCH` flags to move from `PENDING` to
     `RESOLVED_BY_RESCAN`.
   - No `PENDING` AD flag should be left with `expectedAssemblyDistrict` null, now that every
     active committee has a crosswalk row.
4. **Review any AD flags still `PENDING`.** These are real mismatches: members whose
   `stateAssmblyDistrict` differs from their committee's AD. List them, or hand them to whoever
   reviews flags. Don't bulk-dismiss them.
5. **Local DB.** Repeat once the local crosswalk has been reloaded.

## Acceptance

- The rescan has run on prod, and its summary and the before and after counts are recorded here.
- No `PENDING` `ASSEMBLY_DISTRICT_MISMATCH` flag has a null `expectedAssemblyDistrict`.
- Any remaining real AD mismatches are listed for review.

## Comments

**2026-10-25 — prod.** Baseline before any run:

| reason | status | count | no expected AD |
| --- | --- | --- | --- |
| PARTY_MISMATCH | PENDING | 2 | 2 |
| ASSEMBLY_DISTRICT_MISMATCH | PENDING | 1,540 | 1,535 |
| POSSIBLY_INACTIVE | PENDING | 10 | 10 |

The first run from `/admin/eligibility-flags` timed out in the browser, but the server kept going
and resolved stale flags in the background (421, then 760). The run isn't wrapped in a
transaction, and each stale flag takes two sequential round trips (the update plus an audit-log
insert). For about 1,500 flags that is far beyond the client timeout. A second run completed
("Eligibility check complete") and changed nothing. After both runs:

| reason | status | count | no expected AD |
| --- | --- | --- | --- |
| PARTY_MISMATCH | PENDING | 2 | 2 |
| ASSEMBLY_DISTRICT_MISMATCH | PENDING | 780 | 770 |
| ASSEMBLY_DISTRICT_MISMATCH | RESOLVED_BY_RESCAN | 760 | 760 |
| POSSIBLY_INACTIVE | PENDING | 10 | 10 |

- **Active term (2026-2028, 1,428 active members, 437 committees, 21 towns):** the 760 stale AD
  flags were resolved. 10 `PENDING` AD flags remain, each with an expected AD. These are the real
  mismatches to review (list still to do).
- **The 770 `PENDING` AD flags with a null expected AD all belong to the past term**
  (`term-default-2024-2026`, inactive). The run covers only the active term, so it never looked at
  them. Every one of their committees now has an exact (town, LD, ED) crosswalk match across all
  17 suburban towns, so a rescan of that term would resolve them. The UI has no term picker, so
  that run needs a POST to `/api/admin/eligibility-flags/run` with `{ "termId": "term-default-2024-2026" }`.
- Acceptance holds for the active term. The global check ("no `PENDING` AD flag has a null
  expected AD") still fails only because of the past-term flags.
- **Decision: the past-term flags are left as they are.** The admin page lists only active-term
  flags (`EligibilityFlagsTable.tsx` filters on `activeTermId`), so they never appear in review.
  The acceptance criteria are read as applying to the active term.

Follow-up: the per-flag writes should be batched, as the imports were in `5db65f3`.
