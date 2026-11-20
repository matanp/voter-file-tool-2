# 03 - EDs with no members missing from the committee menu

Status: ready-for-human

## Ask (verbatim)

> Eds with 0 members don't show in the committee menu making it harder to appoint

## Notes

- The committee menu is `apps/frontend/src/app/committees/CommitteeSelector.tsx`. Find out whether empty EDs
  are filtered out there, or whether no `CommitteeList` row exists for an ED until someone is added to it.
- Every ED in a jurisdiction should be selectable so a vacant committee can be filled.

## Findings (2026-11-15)

### Root cause: no `CommitteeList` row exists for these EDs

Neither menu filters on membership. Both list the `CommitteeList` rows that exist for the active term:

- Legacy selector: the ED dropdown in `CommitteeSelector.tsx` (~line 750) lists `committeeLists` for the
  chosen town/LD.
- Workspace (`COMMITTEES_WORKSPACE=1`): `api/committee/roster/route.ts` lists `CommitteeList` rows. The
  "only open seats" filter in `workspace/gridModel.ts` is opt-in, so it isn't what hides them.

`CommitteeList` rows are only ever created in two places:

- `api/committee/add/route.ts` upserts the row when a member is added. You can only add to an ED you can
  already pick, so this never creates a row for an empty ED.
- The bulk committee import (`api/admin/bulkLoadCommittees/bulkLoadUtils.ts`) only creates committees for
  EDs listed in the uploaded file. An ED with nobody in the file never gets a row.

Knock-on effect: the weighted-table import (`api/admin/weightedTable/import/route.ts`) skips EDs with no
committee row (`skippedNoCommittee`), so vacant EDs also end up with no weight.

### Data check: where would a complete ED list come from?

These numbers come from the local Docker DB (495k voters, active term 2026-2028), not production. The
queries are in this session's scratchpad (not committed); the joins are described below.

| | Voter file | Crosswalk | Active-term committees |
|---|---|---|---|
| EDs (town + LD + ED) | 655 | 659 | 437 |
| Towns | 21 | 18 | 21 |
| Town matches the voter file | n/a | 281 of 659 | 437 of 437 |

**Voter file (`VoterRecord`):** it's clean and complete.

- No nulls, every `L_T` is numeric, and every `townCode` is one of the 21 in `lib/lted/monroeTownCodes.ts`.
- Derive each ED as `TOWN_CODE_TO_CITY[townCode]` + `L_T`::int + `electionDistrict`. Don't use `city`:
  it's the postal city (NORTH CHILI, SPENCERPORT, ...) and won't match `cityTown`.
- There are no junk slivers: the smallest ED has 14 voters.
- All 437 existing committees match a voter-file ED, with the same town.

**Crosswalk (`LtedDistrictCrosswalk`):** the ED structure is right, but the town labels are wrong locally.

- Matched on (LD, ED) alone, all 655 voter-file EDs are present.
- It has 4 extra Rochester rows with no voters: LD 4/ED 1, 26/5, 26/13 and 27/10. These could be empty or
  retired EDs.
- **378 rows (LDs 48-62) carry the wrong `cityTown`.** The labels are shifted one or two towns; for
  example, LD 53 is labeled GREECE but is IRONDEQUOIT, and LD 50 is labeled BRIGHTON but is GREECE. As a
  result, IRONDEQUOIT, MENDON and PARMA have no rows, and BRIGHTON appears to have 138 EDs.
- The local data was imported before `7f835878` (2026-10-25, "Fix the Monroe town-code table so crosswalk
  rows get the right town") and never re-imported.

**The gap:** 218 voter-file EDs have no active-term committee row, so they're missing from the menu. They
have 14 to 1,789 voters each (median ~640), so these are real EDs. Separately, 6 committees have rows but
no active members; those already show in the menu.

### Related problem (outside this ticket's scope)

With the mislabeled crosswalk, 238 active committees have no matching crosswalk row. That's where the
residency rule gets the assembly district (see `.scratch/committee-residency-rule/spec.md`). If
`requireAssemblyDistrictMatch` is on, adds to those committees fail with `ASSEMBLY_DISTRICT_MISMATCH`.
This should be filed as its own issue.

## Proposed direction

Create a `CommitteeList` row (with seats) for every known ED in the active term, rather than having the
menus merge in "virtual" EDs. Everything downstream (add, weights, reports, roster) assumes a row exists,
so creating rows also fixes the weighted-table skips.

## Open questions

1. **Which source defines the full ED list?** Locally, the voter file is the safer choice: it's always
   loaded and agrees with existing committees exactly. The crosswalk is only usable once re-imported with
   the fixed town table, and anything built on it should verify the town labels first.
2. **Has production's crosswalk been re-imported since 2026-10-25?** The quickest check is whether
   production `LtedDistrictCrosswalk` has any IRONDEQUOIT rows.
3. **What triggers row creation?** Options are an admin "create missing committees" action, a step in
   the voter or crosswalk import, or both.
4. **What about the 4 crosswalk-only Rochester EDs with no voters?** Should they get committees?

## Resolution (2026-11-16)

PR #152 (`create-missing-committees`) adds an admin "Missing committees" card on Admin → Committee Terms. It
creates a `CommitteeList` row plus empty seats for every voter-file ED that has none in the active term.
Answers to the open questions: (1) the voter file is the source; (2) so the state of production's crosswalk
doesn't matter; (3) a manual admin action; (4) crosswalk-only EDs with no voters are not created. After
merging, run it in production, then re-import the Weighted Table.

## Follow-up (2026-11-18): crosswalk-only EDs

The leader reported LD 26 / ED 5 and LD 26 / ED 13 still missing. These are two of the 4 crosswalk-only Rochester
EDs (LD 4/1, 26/5, 26/13, 27/10). Nobody in the voter file lives in them, so the "Missing committees" action
skipped them as decided above. All 4 had committees in 2024-2026. They were created in production for 2026-2028
with the one-off `apps/frontend/scripts/createCrosswalkOnlyCommittees.mjs` (committee ids 4762-4765, 4 empty seats
each, one `MISSING_COMMITTEES_CREATED` audit entry with `source: "crosswalk"`). If more EDs like this come up,
consider adding crosswalk EDs to `findMissingCommittees()`, after checking the crosswalk's `cityTown` labels.
