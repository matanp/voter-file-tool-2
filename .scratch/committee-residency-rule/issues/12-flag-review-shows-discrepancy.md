# 12 - Show the discrepancy in the eligibility flag review dialog

Status: ready-for-agent
Type: bug

## Why

On `/admin/eligibility-flags`, clicking **Review** opens a dialog whose only text is "Review
Assembly district mismatch for <VOTER NAME>." It doesn't say what the mismatch is, so a reviewer
has to go to psql before choosing between **Confirm removal** and **Dismiss**. Found while
reviewing the 10 real AD mismatches left after the ticket 11 prod rescan.

The data is already sent to the page. `GET /api/admin/eligibility-flags` returns every scalar field
on the flag, including `details`, and the membership's `voterRecord.party` and
`stateAssmblyDistrict`. `EligibilityFlagReviewDialog.tsx` doesn't render any of them, and its
`EligibilityFlagListItem` type doesn't declare `details`.

`details` depends on the reason (written in `packages/shared-prisma/src/boeEligibilityFlagging.ts`):

- `ASSEMBLY_DISTRICT_MISMATCH`: `{ expectedAssemblyDistrict, voterAssemblyDistrict }`. Either can
  be null. A null expected AD means the committee has no crosswalk row.
- `PARTY_MISMATCH`: `{ expectedPartyCode, voterPartyCode }`
- `POSSIBLY_INACTIVE`: `{ voterVersion: { year, recordEntryNumber }, mostRecentImport }`
- `VOTER_NOT_FOUND`: check the flagging code for its shape.

## To do

1. Add `details` to `EligibilityFlagListItem`, typed per reason or as `unknown` and narrowed when
   rendered.
2. In the dialog, show the discrepancy for each reason. For an AD mismatch, for example: "Committee
   AD: 136 · Voter's AD: 135". Show "unknown (no crosswalk row)" when the expected AD is null.
   Fall back to the member's current `stateAssmblyDistrict` and `party` from `voterRecord` when
   `details` is missing (older flags).
3. Optionally, add the same one-line summary as a column or subtitle in the table, so mismatches
   can be scanned without opening each one.

## Acceptance

- Opening Review on an AD mismatch shows the committee's AD and the voter's AD.
- Party and possibly-inactive flags show their expected and actual values.
- A flag with missing or malformed `details` still opens without crashing.

## Comments
