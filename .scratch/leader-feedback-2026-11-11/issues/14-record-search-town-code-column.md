# 14 - Record-search "Town Code" column shows raw codes

Status: needs-triage
Type: task

Follow-up from [13](13-town-and-header-cleanups.md) / PR [#157](https://github.com/matanp/voter-file-tool-2/pull/157)
(found in PR #157 review 2, finding 4).

## Problem

#157 made the voter card treat an all-zero town code as missing: `getTown`
(`apps/frontend/src/lib/voterRecordFormatters.ts`) returns `null` for `0` / `000`, and the card shows `-`.

The record-search results table doesn't do the same. Its "Town Code" column
(`apps/frontend/src/app/recordsearch/fieldsConfig.tsx:283-292`) renders `record.townCode` as stored. So:

- an all-zero code shows as `0` or `000` in the table but as `-` on the card for the same voter
- codes aren't padded, so `95` can show where the card says `WEBSTER (095)`

## How much it matters

Possibly not much. The 2026-11-15 findings in [04](04-voter-card-town-code.md) say `townCode` was always filled in
and always one of the 21 codes in `TOWN_CODE_TO_CITY` (local DB, 495,049 records). If that still holds, the
all-zero case doesn't happen in real data today and this is only about consistency. Re-check against the current
import before deciding (count records whose `townCode` normalizes to `000` or isn't in `TOWN_CODE_TO_CITY`).

## Options

1. **Code only, normalized:** show `normalizeTownCode(townCode)`, and `-` when it's missing or
   `isAllZeroTownCode`. Keeps the column narrow and the "Town Code" label accurate.
2. **Match the card:** show `getTown(record) ?? "-"` (e.g. `WEBSTER (095)`) and relabel the column "Town".
   Needs a wider column (`size` is `w-[15ch]` today) and changes what leaders see, so check with them.
3. **Leave it:** if the data check shows no all-zero or unknown codes, close as `wontfix`.

Recommendation: option 1 if the data check finds bad codes; otherwise option 3, or option 2 only if leaders
ask for town names in the table.

## Acceptance (options 1 or 2)

- The table cell and the voter card agree for `"0"`, `"000"`, `"95"`, `"095"` and `null`.
- Add a test for the column's `value` function (or the shared formatter it calls).
- Frontend `tsc --noEmit`, ESLint and Jest pass.

## Comments
