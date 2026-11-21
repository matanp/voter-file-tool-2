# 20 - Voter details show every district in the LTED matrix

Status: needs-triage

Part of [ui-makeover](../spec.md). Pairs with [09](09-record-search-list-detail.md).

## Ask

From the 2026-11-21 stakeholder review: "Make sure all parts of the LTED matrix show in voter details."

## Today

- `VoterCard.tsx` shows County Leg District and Election District only. It shows no LTED code and no Assembly, Senate or Congressional district.
- The voter record carries `stateAssmblyDistrict`, `stateSenateDistrict`, `congressionalDistrict` and `countyLegDistrict`.
- `LtedDistrictCrosswalk` (the 2024 LTED Matrix) maps town + LD + ED to Assembly, Senate, Congressional and County Leg districts.
- The 09 prototype's detail pane already lists Election, County leg., Assembly, Senate and Congress from the voter record.

## Proposal

- Districts section: Town, LD, ED, the LTED code (e.g. `52019`), Assembly, Senate, Congressional and County Leg.
- Decide the source for each: the voter record (BOE) or the crosswalk (MCDC matrix). Where both exist and disagree, show the voter record's value and flag the mismatch, or show both.
- Use the same section in the workspace member drawer, which renders `VoterCard`.

## Open questions

- Does "all parts of the LTED matrix" mean exactly the crosswalk's columns, or more (wards, villages, LTED weight)?
- Should a mismatch between the voter record and the crosswalk be visible to Leaders or only to Admins?

## Acceptance

- Record search details and the workspace drawer show every agreed district field, with empty fields hidden.
- Tests cover a voter whose record and crosswalk agree, and one where they differ.
