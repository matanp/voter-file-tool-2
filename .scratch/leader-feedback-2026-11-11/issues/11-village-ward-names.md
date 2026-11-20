# 11 - Show village / ward names, not codes

Status: needs-triage
Type: task

Follow-up from [04](04-voter-card-town-code.md) / PR #149 (merged `26c28e0d`).

## Found

The voter card's Village / Ward line and the record search column show the raw BOE code, e.g. `WE`, `NE` or `01`.
Leaders have to know that `WE` means the Village of Webster.

## Mapping (from ticket 04's findings, local DB)

| Code | Meaning | Town |
|---|---|---|
| WE | Village of Webster | Webster (095) |
| FP | Village of Fairport | Perinton (065) |
| HI | Village of Hilton | Parma (055) |
| ER | East Rochester | East Rochester (017) |
| BR | Village of Brockport | Sweden (090) |
| SP | Village of Spencerport | Ogden (050) |
| HF | Village of Honeoye Falls | Mendon (045) |
| CH | Village of Churchville | Riga (075) |
| SC | Village of Scottsville | Wheatland (100) |
| PI | Village of Pittsford | Pittsford (070) |
| E, S, NE, NW | City quadrants | Rochester (080) |
| 01–04 | Wards | Greece (025) |

Check this against the BOE's code list before treating it as complete. It only covers the codes in the local file.

## Decisions needed

- Wording for quadrants and wards, e.g. "Rochester NE quadrant" / "Greece Ward 1".
- Whether to show the name only or the name plus code, e.g. `Village of Webster (WE)`. The Town line uses
  `WEBSTER (095)`.
- Whether exports change too. See [10](10-export-village-ward-00.md).

## Fix

- Put the lookup in `shared-validators` next to `VILLAGE_WARD_LABEL`, and use it in `getVillageWard`
  (`apps/frontend/src/lib/voterRecordFormatters.ts`).
- Show an unknown code as-is, like `getTown` does.

## Acceptance

- The card and the record search column show the name for every code in the table.
- An unknown code shows as-is, and `00` is still hidden.
- Unit tests cover a village, a quadrant, a ward and an unknown code.
