# 02 - Audit assembly district data before widening the search filter

Status: resolved
Type: task

## Why

Residency is an exact string match after trimming, between `VoterRecord.stateAssmblyDistrict` and
`LtedDistrictCrosswalk.stateAssemblyDistrict`. Until now the search filter only let same-ED voters
reach that comparison, so a format mismatch or a missing crosswalk row could stay hidden. Once
ticket 04 widens the filter to the whole AD, those problems will start blocking real candidates.
This audit needs production data.

## To do

- Check that both columns use the same format (no `"133"` vs `"0133"` vs `"AD133"`):

  ```sql
  SELECT DISTINCT "stateAssmblyDistrict" FROM "VoterRecord" ORDER BY 1;
  SELECT DISTINCT "stateAssemblyDistrict" FROM "LtedDistrictCrosswalk" ORDER BY 1;
  ```

- Check coverage: every active `CommitteeList` LTED (`cityTown`, `legDistrict`, `electionDistrict`)
  has a crosswalk row with a non-empty AD.
- Check consistency: for each voter, the crosswalk AD of their home LTED (`city`, `L_T`,
  `electionDistrict`) equals their `stateAssmblyDistrict`. Count the mismatches and sample a few.

## Acceptance

- The results of all three checks are recorded below.
- Anything that has to be fixed before ticket 04 ships is split out into its own ticket. Mismatches
  are data problems to report, not code changes.

## Comments

### 2026-10-25: results from the local DB

Run with `.scratch/committee-residency-rule/audit-ad-data.sql`. The local DB had 495,049 voters,
659 crosswalk rows and 437 active-term committees. **Still to do: confirm these results on prod.**

1. **Format: clean.** Both columns hold only plain digits, with no padding, nulls or blanks. Both
   use the same 8 values (130 and 133 to 139), and no AD appears on only one side.
2. **Coverage: 238 of 437 active committees have no crosswalk row.** The cause is not missing data.
   The crosswalk importer gives 15 towns the wrong name: every committee in LDs 48 to 62 has a
   crosswalk row under the same (LD, ED) but labelled with another town (LD 49 is GATES on the
   committee but EAST ROCHESTER in the crosswalk, LD 53 is IRONDEQUOIT but GREECE, and so on). The
   lookup is by (town, LD, ED), so it misses. Split out as ticket 08.
3. **Consistency: clean.** 495,049 of 495,049 voters have a home LTED whose crosswalk AD equals
   their `stateAssmblyDistrict`. That makes the town labels the crosswalk's only problem.

Also found: **`VoterRecord.city` is the postal city, not the town.** For example, Gates voters
mostly have `city` = ROCHESTER or SPENCERPORT, and only 78 have GATES. The audit therefore joins
voters to the crosswalk on (LD, ED) alone, since LD numbers are unique per town. It also means
today's "Only eligible candidates" filter (`city = cityTown`) hides most suburban voters. Ticket 04
drops the city filter, so it fixes this as a side effect.

Other local findings:

- **Every active member has a stale AD flag.** All 1,426 active memberships have a `PENDING`
  `ASSEMBLY_DISTRICT_MISMATCH` flag, created on 2026-09-14 while the crosswalk was still empty. Each
  one has `expectedAssemblyDistrict: null`. A BOE audit re-run now would auto-resolve the 698 in
  correctly mapped towns. The other 728 need ticket 08 first.
- **A committee's AD could be derived from its voters.** Across all 1,430 voter LTEDs, the voters
  in an LTED always agree on a single AD. Deriving a committee's AD from its voters would work if
  the crosswalk ever becomes unreliable, but nothing needs it today.
- **`requireAssemblyDistrictMatch` is on locally**, and `nonOverridableIneligibilityReasons` is
  empty, so admins can force an add past an AD mismatch.

### 2026-10-25 - prod results: clean

Run on prod after ticket 08's crosswalk reload (659 crosswalk rows, 534,559 voters, 437
active-term committees).

1. **Format: clean.** Both columns hold only plain digits, with the same 8 values (130 and 133 to
   139). 1c is empty, so no AD appears on only one side.
2. **Coverage: clean.** 0 of 437 active committees lack a crosswalk row, and 0 have an empty AD.
   2b (town labels) is empty.
3. **Consistency: clean.** 534,559 of 534,559 voters have a home LTED in the crosswalk whose AD
   matches their `stateAssmblyDistrict`. There are 0 mismatches.

Nothing needs fixing before ticket 04 ships.
