# 04 - Voter card shows the wrong town code

Status: resolved

## Ask (verbatim)

> The town code is not showing right

Photo: `data/leader-feedback-2026-11-11-voter-card-town.png` (gitignored). A Webster voter's card on record
search shows **Town: 00**.

## Notes

- The card's "Town" line renders `record.CC_WD_Village`, not the town code
  (`apps/frontend/src/app/recordsearch/VoterCard.tsx:74`). The results table has a separate `townCode` column
  (`fieldsConfig.tsx`). Likely fix: show `townCode` (and the town name if we have one), and label or drop the
  ward/village value. Confirm what `CC_WD_Village` holds in the BOE file before changing it.

## Findings (2026-11-15, local DB, 495,049 voter records)

- **Confirmed:** `CC_WD_Village` is not the town. It holds a village, ward or quadrant code inside the town,
  and `00` means "none". 293k voters (59%) have `00`, so most cards show "Town: 00".
  - Village codes (one town each): WE=Webster(095), FP=Fairport/Perinton(065), HI=Hilton/Parma(055),
    ER=East Rochester(017), BR=Brockport/Sweden(090), SP=Spencerport/Ogden(050), HF=Honeoye Falls/Mendon(045),
    CH=Churchville/Riga(075), SC=Scottsville/Wheatland(100), PI=Pittsford(070).
  - City quadrants: E / S / NE / NW are all in Rochester (080).
  - Wards: 01–04 are all in Greece (025).
- `townCode` is always filled in and always one of the 21 codes in `TOWN_CODE_TO_CITY`
  (`apps/frontend/src/lib/lted/monroeTownCodes.ts`), so the card can show the real town name, e.g. `WEBSTER (095)`.
- Watch out: `city` is the postal city, not the town. 6,787 voters with city WEBSTER are in Penfield (060). So
  the voter in the photo may not be in the town of Webster. Their town is whatever `townCode` says.

## Proposed fix

- In `VoterCard.tsx`, change the "Town" line to `lookupCityTown(townCode, "fallback")` plus the code.
- Show `CC_WD_Village` as its own "Village/Ward" line, and only when it isn't `00` (or drop it from the card).
- Optional: the results-table column and report field are labelled with the raw name `CC_WD_Village`
  (`fieldsConfig.tsx:330`, `committee-reports/constants.ts:177`). Give them a readable label.

## Review of PR #149 (2026-11-15, head `4a884baa`)

The PR meets the spec and breaks no documented standards. Everything below is a judgement call or a follow-up,
not a merge blocker.

**Spec**

- Town line: `getTown` pads the code (`95` → `095`), resolves all 21 codes, and shows `-` for null or
  non-numeric codes.
- Village / Ward line: `getVillageWard` hides blank, `00` and any all-zero value. The record search cell uses the
  same helper.
- No other consumer of `CC_WD_Village` changed.
- Two changes go beyond the spec. Both are justified:
  - **Export-header merge fix** (`resolveColumnHeaders`, `apps/report-server/src/xlsxGenerator.ts`). Before,
    setting any custom header replaced the whole defaults map, so every other column showed its raw field name.
    Custom headers now merge over the defaults per column, and blank ones are ignored. This changes the headers
    of every existing custom-header export, so it **needs a release note for leaders**.
  - **Removed the hidden "CC WD Village" search field.** It was dead code: `FieldRenderer.handleCityTownChange`
    discards the village value (`void town`), so the field never had a value.

**Standards**

- Tests follow `skills/test-type-safety/SKILL.md`.
- `skills/adding-reports/SKILL.md` doesn't apply.
- The glossary terms were missing from `CONTEXT.md`. Town, Postal City and Village / Ward have now been added
  (uncommitted on `main`).

**Follow-ups (filed 2026-11-15)**

1. Header labels defined in two places: a note was added to
   [xlsx-export-formatting/01](../../xlsx-export-formatting/issues/01-readable-headers-for-every-export-field.md), which
   already covers it.
2. Raw `00` in exports: [10](10-export-village-ward-00.md).
3. Village / Ward shows codes: [11](11-village-ward-names.md).
4. City vs Town: [12](12-mailing-city-label.md).
5. Small cleanups (trimmed headers, `000` town code, unused "Hidden" field type): [13](13-town-and-header-cleanups.md).
   The `columnHeaders[field] || field` fallback is part of xlsx-export-formatting/01.

## Comments

- 2026-11-15: Implemented in PR #149 (`voter-card-town-name`, open). Reviewed on the Standards and Spec axes; see
  the Review section. Status set to `ready-for-human` for review and merge. Set it to `resolved` once #149
  merges.
- 2026-11-15: PR #149 merged (`26c28e0d`). Status set to `resolved`. Follow-ups filed as 10–13 and as a note on
  xlsx-export-formatting/01.
