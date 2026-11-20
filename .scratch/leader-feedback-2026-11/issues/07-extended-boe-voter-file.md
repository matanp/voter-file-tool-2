# 07 - Extended BOE voter file

Status: needs-triage

## Ask (verbatim)

> Also, a much more extensive voter file the Board of Elections provided to Chris to help track changes more effectively. I don't know how hard it will be to use it. But I thought I should share it now that I am receiving them.

---

## Data files (unzipped in `/tmp/new_boe_file/`)

| | current file | new BOE file |
|---|---|---|
| `data/2026_1_voter_file_full.txt` (~245 MB) | 495,048 rows, no header (positional CSV) | — |
| `dbo_View_TEAMSQL_Voter_Table 20261019.txt` (~590 MB) | — | 925,904 rows, with header row (named columns) |

## Analysis

### Existing parsing architecture

Our pipeline: **CSV → csv-parser (positional mapping) → VoterRecordArchiveStrings → transformVoterRecord() → DB**

- Current parser uses `csv(Object.keys(exampleVoterRecord))` — maps each column index to a key like `VRCNUM`, `firstName`, `city`, etc.
- Works because old file has no header; columns are positional and fixed width
- Core code: `parseVoterFile.ts` → `voterRecordProcessor.ts` (transform + batch update)
- 50 internal fields, ~30 used for updates to the active VoterRecord table

### Key incompatibility

The new BOE file **has a header row** with different column names. csv-parser will auto-detect the header and return `{ voter_id, f_name, ... }` objects instead of the expected `{ VRCNUM, firstName, ... }` — downstream code would silently skip / ignore every field.

### Field mapping feasibility (BOE → our internal fields)

**Directly mappable (~30/44 columns):**
- `voter_id` → `VRCNUM`
- `f_name` → `firstName`
- `m_name` → `middleInitial` *(available in new file — bonus!)*
- `l_name` → `lastName`
- `e_name` → `suffixName`
- `street_no` → `houseNum` (int)
- `half_code` → `halfAddress`
- `street_nm` → `street`
- `apartment` → `apartment`
- `address2` → `resAddrLine2`
- `address3` → `resAddrLine3`
- `city` → `city`
- `state` → `state`
- `zip` → `zipCode`
- `zipplus4` → `zipSuffix`
- `mail_addr` → `mailingAddress1` (single field, may not encode full mailing address)
- `dob` → `DOB` (date, already mm/dd/yyyy ✅)
- `sex` → `gender`
- `phone` → `telephone`
- `reg_date` → `lastUpdate` (⚠️ format is `M/D/YYYY H:MM:SS` — needs date parsing fix)
- `town` → `townCode`
- `ward` → `electionDistrict`
- `district` → `countyLegDistrict`
- `cong_dist` → `congressionalDistrict`
- `stsen_dist` → `stateSenateDistrict`
- `stleg_dist` → `stateAssmblyDistrict`

**Missing from BOE or unclear (~10 columns):**
- `middleInitial` was missing from old file — now available in new via `m_name` ✅
- `mailingCity`, `mailingState`, `mailingZip`, `mailingZipSuffix` — `mail_addr` is single field, likely not splittable
- `L_T` (precinct) — not present in BOE schema
- Several status/metadata columns (`vs_date`, `rein_date`, etc.) are useful for audit but not critical

### Strategy: standalone BOE parser (recommended)

**Recommendation: Option A + C combo**

1. Create a standalone `parseVoterFileBOE.ts` that reads the header row, maps BOE column names to our internal `VoterRecordArchiveStrings`, and reuses all downstream logic exactly as-is
2. Zero-risk — the existing 495K-row import pipeline gets no changes
3. Test with the ~926K new rows first (larger volume exposes issues earlier)
4. Decide later whether to unify auto-detection in prod or keep two parallel ingestion paths

**Why not unified parser (Option B — header detection everywhere)?**

- Higher regression risk — touches code path used for all production imports
- Auto-detecting "header vs positional" adds complexity that may break edge cases
- Better to validate the new format works end-to-end first before committing to a shared path

## Pending decisions

- [ ] How to handle `reg_date` format change (`M/D/YYYY H:MM:SS` → `mm/dd/yyyy`)
- [ ] Whether single-field `mail_addr` is sufficient or we need separate mailing address parsing
- [ ] Admin UI: does the BOE file need its own import button/page, or can it share the existing one?
- [ ] Data migration: should a run with both files show diff/changes compared to current production data?

## Comments
