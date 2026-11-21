# 03 - Re-check the volunteer record-search rage clicks against current code

Status: needs-info

## What happened

On 2026-05-31 five ReadAccess volunteers and the power-user Admin ran a break-it session on `/recordsearch`: about
1,300 searches by street and house number over four days. Rage clicks (28 from volunteers, 13 from the Admin) were
on:

- **The house-number input** (`id="houseNum-<row>-<n>"`, 24 rage clicks). There's no other activity around them, so
  the likely cause is triple-clicking to select the old number before typing a new one. PostHog counts that as a
  rage click. Unconfirmed.
- **The street multi-value input** (185px wide, 6) and **street chips** (e.g. a street-name chip, 2).
- **"See more details"** (4, one volunteer). This opens a popover with the voter card.
- **The chip "×" remove button** (2). See 04.

## Why needs-info

Record search has changed a lot since then: the simple/advanced toggle, committee badges, the results footer, and
the `.scratch/record-search-results/` fixes. The `houseNum-` ids no longer appear in the source. The replays have
expired, so the old findings can't be checked against the current UI.

## Next step

- Repeat the street + house-number workflow on the current UI during the next break-it session (05), with replays
  retained.
- If triple-click-to-select is the cause, consider select-on-focus for the house-number field, and leave its rage
  clicks out of the dashboard (12).
- For "See more details", compare with `.scratch/record-search-results/issues/04-details-button-names-and-popover-focus.md`.
  A slow or focus-stealing popover would explain repeated clicks.
