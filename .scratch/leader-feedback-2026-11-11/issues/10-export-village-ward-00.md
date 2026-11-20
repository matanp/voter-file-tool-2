# 10 - Exports show "00" under Village / Ward

Status: needs-triage
Type: task

Follow-up from [04](04-voter-card-town-code.md) / PR #149 (merged `26c28e0d`).

## Found

Since #149, the voter card and the record search column hide `CC_WD_Village` when it's `00` (the voter isn't in a
village or ward). Report exports still write the raw value. 59% of voters have `00`, so most rows in an export show
`00` under the "Village / Ward" header.

The raw value comes from `convertPrismaVoterRecordToAPI` (`packages/shared-validators/src/compoundFieldUtils.ts`,
`CC_WD_Village: voter.CC_WD_Village ?? null`) and is passed into the XLSX unchanged.

## Decision needed

Should exports match the screens and leave the cell blank for `00`? Arguments against: people who know the BOE
file may expect the raw code, and other tools may parse the export.

## If yes

- Blank the cell in the XLSX path only. Don't change `convertPrismaVoterRecordToAPI`, because other code reads it.
- Reuse the "not in one" rule from `getVillageWard` (`apps/frontend/src/lib/voterRecordFormatters.ts`: blank, `00`
  or any all-zero value). Move it to `shared-validators` so the frontend and the report server share one rule.
- If [11](11-village-ward-names.md) adds names, decide whether exports show the code, the name or both.

## Acceptance

- In a voter-list export that includes Village / Ward, rows with `00` have an empty cell, and rows with a real code
  keep it.
- A report-server test covers `00`, a real code and null.
