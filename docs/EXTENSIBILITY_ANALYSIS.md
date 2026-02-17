# Extensibility Analysis: Expanding Beyond Monroe County / MCDC

**Date:** February 2026  
**Purpose:** Comprehensive analysis of what it would take to make the voter-file-tool extensible for different counties, states, organizations, voter import shapes, and data sources.

---

## Executive Summary

The voter-file-tool is currently built as a **single-tenant, Monroe County–specific application**. Virtually every major component—from voter import parsing to committee structures, report generation, and geographic mappings—assumes:

1. **Monroe County, NY Board of Elections (BOE)** voter and committee data formats
2. **New York State** election law and committee structure (LTED, 4 members per seat, petition process)
3. **MCDC** (Monroe County Democratic Committee) organizational workflows and naming
4. **Single deployment** with no tenant/jurisdiction abstraction

This document catalogs all county/state-specific assumptions and outlines what would be required to support different voter import shapes, different state data, different states, different organizations, and multi-tenancy.

---

## Hardcoded Values Inventory

This section catalogs **every hardcoded value** in the codebase that blocks extensibility. Each entry includes file path, the literal value, and what it should become (config, constant, or parameter).

**Summary:** ~35 distinct hardcoded values across 15+ files. Highest impact: report title, ward mapping, committee capacity (4), file paths, column names, Rochester-specific logic.

### Strings & Labels (Organization / Geography)

| File                                                    | Line   | Hardcoded Value                                                | Should Be                                    |
| ------------------------------------------------------- | ------ | -------------------------------------------------------------- | -------------------------------------------- |
| `apps/report-server/src/components/CommitteeReport.tsx` | 51     | `"Monroe County Democratic Committee List as of May 15, 2025"` | Config: `reportTitle`, `orgName`, `asOfDate` |
| `apps/report-server/src/utils/absenteeDataUtils.ts`     | 10–43  | `WARD_TO_TOWN_MAPPING` (22 Monroe County wards)                | Config: `wardToTownMapping`                  |
| `apps/report-server/src/utils/absenteeDataUtils.ts`     | 95–103 | `PARTY_TYPES` (DEM, REP, BLK, CON, WOR, OTH, IND)              | Config: `partyTypes`                         |
| `apps/frontend/src/lib/searchConfiguration.ts`          | 63–158 | `CITY_TOWN_CONFIG` (Rochester, Greece, villages)               | Config: `cityTownConfig`                     |
| `apps/report-server/src/utils/absenteeDataUtils.ts`     | 59     | `'Unknown Town'` fallback                                      | Config: `unknownTownFallback`                |

### File Paths

| File                                                                  | Line  | Hardcoded Value                                                                                                  | Should Be                                      |
| --------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `apps/frontend/src/app/api/admin/bulkLoadCommittees/bulkLoadUtils.ts` | 18    | `"data/Committee-File-2025-05-15.xlsx"`                                                                          | Request param or config: `committeeImportPath` |
| `apps/frontend/src/app/api/admin/bulkLoadData/route.ts`               | 20    | `files = ["2024_5_2_voter_records.txt"]`                                                                         | Request param or config                        |
| `apps/frontend/src/app/api/admin/bulkLoadData/route.ts`               | 21    | `years = [2024]`                                                                                                 | Request param or config                        |
| `apps/frontend/src/app/api/admin/bulkLoadData/route.ts`               | 27    | `"data/${files[i]}"`                                                                                             | Configurable base path                         |
| `apps/frontend/src/app/api/admin/scripts/specialVoterFile/route.ts`   | 12–14 | `"data/committeeVRCNUMs.txt"`, `"data/2024_5_2_voter_records.txt"`, `"data/2024_5_2_voter_records_filtered.txt"` | Config or request params                       |

### Column Names & Field Mappings

| File                                                                  | Line    | Hardcoded Value                                                                  | Should Be                                         |
| --------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------- | ------------------------------------------------- |
| `apps/frontend/src/app/api/admin/bulkLoadCommittees/bulkLoadUtils.ts` | 52      | `row.Committee?.includes("LD ") ? "Rochester" : row.Committee`                   | Config: `rochesterLDPattern`, `rochesterCityName` |
| `apps/frontend/src/app/api/admin/bulkLoadCommittees/bulkLoadUtils.ts` | 56–58   | `row["Serve LT"]`, `row["Serve ED"]`, `row["voter id"]`                          | Config: `committeeImportColumnMapping`            |
| `apps/frontend/src/app/api/lib/utils.ts`                              | 113–119 | `DISCREPENCY_FIELDS`: `name`, `res address1`, `res city`, `res state`, `res zip` | Config: `discrepancyFieldMapping`                 |
| `packages/voter-import-processor/src/voterRecordProcessor.ts`         | 10–53   | `VOTER_RECORD_UPDATE_FIELDS` (35 field names)                                    | Config or schema-driven                           |
| `packages/voter-import-processor/src/voterRecordProcessor.ts`         | 175–215 | `exampleVoterRecord` (NY BOE column names)                                       | Config: `voterImportColumnMapping` or default     |
| `packages/voter-import-processor/src/parseVoterFile.ts`               | 104     | `csv(Object.keys(exampleVoterRecord))`                                           | Uses mapping; headers from config                 |
| `apps/report-server/src/reportTypes/absenteeStandardBallotRequest.ts` | 4–69    | `ABSENTEE_STANDARD_BALLOT_REQUEST_HEADERS` (66 columns)                          | Config: `absenteeHeaders` or column mapping       |

### Date Format

| File                                                          | Line    | Hardcoded Value                                | Should Be            |
| ------------------------------------------------------------- | ------- | ---------------------------------------------- | -------------------- |
| `packages/voter-import-processor/src/voterRecordProcessor.ts` | 153–155 | `mm/dd/yyyy` in `convertStringToDateTime`      | Config: `dateFormat` |
| `apps/frontend/src/app/api/lib/utils.ts`                      | 157–159 | Same `mm/dd/yyyy` in `convertStringToDateTime` | Shared config        |

### Numeric Constants (Business Rules)

| File                                                         | Line     | Hardcoded Value                  | Should Be                        |
| ------------------------------------------------------------ | -------- | -------------------------------- | -------------------------------- |
| `apps/frontend/src/app/api/committee/handleRequest/route.ts` | 63       | `currentMemberCount >= 4`        | Config: `maxMembersPerCommittee` |
| `apps/frontend/src/app/committees/AddCommitteeForm.tsx`      | 144, 157 | `committeeList.length >= 4`      | Config: `maxMembersPerCommittee` |
| `apps/frontend/src/app/committees/CommitteeRequestForm.tsx`  | 160, 173 | `committeeList.length >= 4`      | Config: `maxMembersPerCommittee` |
| `packages/shared-validators/src/constants.ts`                | 9        | `MAX_RECORDS_FOR_EXPORT = 20000` | Config: `maxRecordsForExport`    |

### Rochester-Specific Logic

| File                                                    | Line    | Hardcoded Value                                   | Should Be                                               |
| ------------------------------------------------------- | ------- | ------------------------------------------------- | ------------------------------------------------------- |
| `apps/report-server/src/components/CommitteeReport.tsx` | 55–57   | `page.cityTown === 'ROCHESTER'` for LD formatting | Config: `citiesWithLegislativeDistricts: ["ROCHESTER"]` |
| `apps/report-server/src/xlsxGenerator.ts`               | 192–194 | `ld.cityTown === 'ROCHESTER'` for sheet naming    | Same config                                             |

### Processing Constants (Tunable)

| File                                                            | Line   | Hardcoded Value                               | Should Be                         |
| --------------------------------------------------------------- | ------ | --------------------------------------------- | --------------------------------- |
| `apps/report-server/src/components/CommitteeReport.tsx`         | 144    | `pageSize = 30` (per page)                    | Config: `committeeReportPageSize` |
| `packages/voter-import-processor/src/parseVoterFile.ts`         | 19–20  | `PRINT_COUNT = 100000`, `BUFFER_SIZE = 5000`  | Env or config                     |
| `apps/frontend/src/app/api/admin/bulkLoadData/bulkLoadUtils.ts` | 52–53  | `PRINT_COUNT = 100000`, `BUFFER_SIZE = 25000` | Env or config                     |
| `apps/frontend/src/app/api/reportJobs/route.ts`                 | 25, 38 | `maxPageSize = 100`, `maxPage = 10000`        | Config                            |
| `apps/frontend/src/lib/searchConfiguration.ts`                  | 238    | `maxPageSize: 1000`                           | Config                            |

### Other Hardcoded Values

| File                                                           | Line  | Hardcoded Value                                                       | Should Be                           |
| -------------------------------------------------------------- | ----- | --------------------------------------------------------------------- | ----------------------------------- |
| `apps/frontend/src/app/api/admin/loadAdmin/route.ts`           | 8     | `developerEmails = ["mpresberg@gmail.com", "avi.presberg@gmail.com"]` | Env: `DEVELOPER_EMAILS` or config   |
| `apps/report-server/src/utils/absenteeDataUtils.ts`            | 132   | `'Received'` for `Last Received Delivery Status`                      | Config: `ballotReturnedStatusValue` |
| `packages/voter-import-processor/src/dropdownListProcessor.ts` | 9–21  | `dropdownItems` (city, zipCode, street, countyLegDistrict, etc.)      | Config: `dropdownFields`            |
| `apps/frontend/src/app/api/lib/utils.ts`                       | 11–22 | `dropdownItems` (same list, duplicated)                               | Shared config                       |

---

## Table of Contents

1. [Hardcoded Values Inventory](#hardcoded-values-inventory) _(above)_
2. [Voter Import Extensibility](#1-voter-import-extensibility)
3. [Geographic & Jurisdictional Extensibility](#2-geographic--jurisdictional-extensibility)
4. [Committee Import & Structure Extensibility](#3-committee-import--structure-extensibility)
5. [Report Generation Extensibility](#4-report-generation-extensibility)
6. [State & Election Law Extensibility](#5-state--election-law-extensibility)
7. [Absentee Report Extensibility](#6-absentee-report-extensibility)
8. [Search & Dropdown Extensibility](#7-search--dropdown-extensibility)
9. [Multi-Tenancy & Configuration](#8-multi-tenancy--configuration)
10. [Data Model Considerations](#9-data-model-considerations)
11. [Implementation Roadmap Summary](#10-implementation-roadmap-summary)

---

## 1. Voter Import Extensibility

### Current State

The voter import pipeline expects **exact column names** from the Monroe County BOE CSV format. There is **no column mapping layer**.

| Location                                                      | Assumption                                                             | Impact                                                                                                 |
| ------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `packages/voter-import-processor/src/parseVoterFile.ts`       | `csv(Object.keys(exampleVoterRecord))` — CSV parser uses fixed headers | Different column names = parse failure                                                                 |
| `packages/voter-import-processor/src/voterRecordProcessor.ts` | `exampleVoterRecord` defines 35 fields                                 | All fields must match NY BOE schema                                                                    |
| `voterRecordProcessor.ts`                                     | `convertStringToDateTime` expects `mm/dd/yyyy`                         | Other date formats (ISO, `yyyy-mm-dd`, `dd/mm/yyyy`) fail                                              |
| Prisma schema                                                 | `VoterRecord` / `VoterRecordArchive` fields                            | Schema is NY-specific (`countyLegDistrict`, `stateAssmblyDistrict`, `CC_WD_Village`, `townCode`, etc.) |

### NY BOE Field Names (Current)

```
VRCNUM, lastName, firstName, middleInitial, suffixName, houseNum, street, apartment,
halfAddress, resAddrLine2, resAddrLine3, city, state, zipCode, zipSuffix, telephone,
email, mailingAddress1-4, mailingCity, mailingState, mailingZip, mailingZipSuffix,
party, gender, DOB, L_T, electionDistrict, countyLegDistrict, stateAssmblyDistrict,
stateSenateDistrict, congressionalDistrict, CC_WD_Village, townCode, lastUpdate,
originalRegDate, statevid
```

**Note:** `VRCNUM` = Voter Registration Control Number (NY identifier). Other states use different IDs (e.g., `voter_id`, `STATEID`, `REGISTRATION_ID`).

### What’s Required for Different Voter Import Shapes

| Scenario                                                                       | Effort | Changes Needed                                                                                           |
| ------------------------------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------- |
| **Same NY schema, different column order**                                     | Low    | Already works — CSV parser uses column names, not position                                               |
| **Same state, different county format (same field meanings, different names)** | Medium | Add **column mapping config**: `{ "voter_id": "VRCNUM", "last_name": "lastName", ... }` per jurisdiction |
| **Different date format**                                                      | Low    | Add **date format config** (e.g., `mm/dd/yyyy`, `yyyy-mm-dd`) and use in `convertStringToDateTime`       |
| **Different state with different field set**                                   | High   | Schema changes, mapping layer, optional fields. States vary widely (e.g., California vs Florida vs NY)   |
| **VIP (Voting Information Project) standard format**                           | High   | VIP CSV has different structure; needs dedicated mapper to internal schema                               |
| **Microsoft Access export (MCDC also uses Access)**                            | Medium | Access → CSV export step; or add Access reader (e.g., `mdb-tools`, `node-adodb`)                         |

### Recommendation

1. **Introduce a `VoterImportConfig`** (per jurisdiction or per import job):
   - `columnMapping: Record<string, string>` — source column → internal field
   - `dateFormat: string` — e.g., `mm/dd/yyyy`, `yyyy-mm-dd`
   - `primaryKeyField: string` — `VRCNUM` vs `voter_id` vs `statevid`
   - `requiredFields: string[]` — minimum fields to proceed
2. **Add a generic transform layer** in `voterRecordProcessor.ts` that applies the mapping before validation
3. **Schema evolution**: Consider an EAV-style extension table or JSON `extraFields` for state-specific columns not in the core model

---

## 2. Geographic & Jurisdictional Extensibility

### Current State

Multiple components hardcode Monroe County geography.

| Location                                                | Content                                                 | Purpose                                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `apps/frontend/src/lib/searchConfiguration.ts`          | `CITY_TOWN_CONFIG`                                      | City/town dropdown with Rochester (NE/NW/S/E), Greece (wards 01–04), villages (Brockport, Churchville, etc.) |
| `apps/report-server/src/utils/absenteeDataUtils.ts`     | `WARD_TO_TOWN_MAPPING`                                  | 22 Monroe County wards (16–64) → town names (Rochester, Brighton, Chili, etc.)                               |
| `apps/report-server/src/components/CommitteeReport.tsx` | Rochester special case: `page.cityTown === 'ROCHESTER'` | Display "LD 01" instead of "ROCHESTER" in headers                                                            |
| `apps/report-server/src/xlsxGenerator.ts`               | Same Rochester check                                    | Sheet naming: `LD 01` vs town name                                                                           |

### Monroe County–Specific Data

- **Rochester** is the only city; uses Legislative District (LD) numbering
- **Towns** use wards (e.g., Greece has 4 wards)
- **Villages** (Brockport, Churchville, East Rochester, Fairport, Hilton, Honeoye Falls, Pittsford, Scottsville, Spencerport, Webster) map to parent towns via codes (e.g., BR → Sweden)
- **Ward numbering**: 16–29 Rochester, 45+ towns (Brighton 45, Chili 46, … Wheatland 64)

### What’s Required for Different Geographies

| Scenario                                       | Effort | Changes                                                                                |
| ---------------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| **Different NY county** (e.g., Erie, Onondaga) | Medium | Replace `CITY_TOWN_CONFIG` and `WARD_TO_TOWN_MAPPING` with config/DB                   |
| **Different state**                            | High   | Different district concepts (precincts, districts, parishes); may not use wards at all |
| **Multiple jurisdictions in one deployment**   | High   | Tenant-scoped config; see [§8 Multi-Tenancy](#8-multi-tenancy--configuration)          |

### Recommendation

1. **Move geographic config to database**:
   - `JurisdictionConfig` or `CountyConfig` with JSON/relation for `cityTownConfig`, `wardToTownMapping`
   - Or YAML/JSON files per jurisdiction in `config/jurisdictions/{countyId}.yaml`
2. **Parameterize Rochester-specific logic** via config flags, e.g.:
   - `cityUsesLegislativeDistricts: string[]` — which cities show "LD XX" instead of city name
   - `legislativeDistrictLabel: string` — e.g., "LD" vs "District"
3. **Admin UI** to manage jurisdiction config (city/town/ward mappings) without code deploys

---

## 3. Committee Import & Structure Extensibility

### Current State

Committee import is tightly coupled to a **single hardcoded XLSX file** and Monroe County export format.

| Location                                                              | Assumption                                                                       | Impact                                               |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `apps/frontend/src/app/api/admin/bulkLoadCommittees/bulkLoadUtils.ts` | `filePath = "data/Committee-File-2025-05-15.xlsx"`                               | File path hardcoded; must run script with that file  |
| `bulkLoadUtils.ts`                                                    | `row.Committee?.includes("LD ") ? "Rochester" : row.Committee`                   | Rochester LD detection logic                         |
| `bulkLoadUtils.ts`                                                    | `row["Serve LT"]`, `row["Serve ED"]`, `row["voter id"]`                          | Column names from MCDC committee export              |
| `apps/frontend/src/app/api/lib/utils.ts`                              | `DISCREPENCY_FIELDS`: `name`, `res address1`, `res city`, `res state`, `res zip` | Incoming committee row format for discrepancy checks |

### Committee Structure (NY LTED)

- **LTED** = Legislative District + Election District
- `CommitteeList`: `(cityTown, legDistrict, electionDistrict)` unique
- **4 members max** per LTED (NYS Election Law)
- Rochester: "LD 01", "LD 02", … ; towns: town name

### What’s Required

| Scenario                                                        | Effort | Changes                                                                   |
| --------------------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| **Different committee export format** (different XLSX columns)  | Medium | Configurable column mapping for committee import                          |
| **Different committee structure** (e.g., precinct-based, no ED) | High   | Schema and business logic changes; `CommitteeList` may need to be generic |
| **CSV instead of XLSX**                                         | Low    | Add CSV parser path alongside XLSX                                        |
| **Different discrepancy check fields**                          | Low    | Make `DISCREPENCY_FIELDS` configurable                                    |
| **Different capacity** (e.g., 2 or 6 members per unit)          | Medium | Replace hardcoded `4` with config                                         |

### Recommendation

1. **Committee import config**:
   - `filePath` or `fileKey` (R2) from request/config, not hardcoded
   - `columnMapping`: `{ "voter id": "VRCNUM", "Serve LT": "legDistrict", "Serve ED": "electionDistrict", "Committee": "cityTown" }`
   - `rochesterLDPattern`: regex or string to detect Rochester LD committees (e.g., `Committee.includes("LD ")`)
2. **Discrepancy fields config**: Allow jurisdiction to define which incoming fields map to which `VoterRecord` fields for comparison
3. **Capacity config**: `maxMembersPerCommittee` in `JurisdictionConfig` or `CommitteeList`

---

## 4. Report Generation Extensibility

### Current State

Several reports have Monroe County / MCDC branding and assumptions.

| Report Type                | Location                                                   | Monroe-Specific Content                                             |
| -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| **Committee Report (PDF)** | `CommitteeReport.tsx`                                      | Title: "Monroe County Democratic Committee List as of May 15, 2025" |
| **Committee XLSX**         | `xlsxGenerator.ts`                                         | Rochester LD sheet naming                                           |
| **Designated Petition**    | `generateHTML`                                             | Form structure; NY-specific petition layout                         |
| **Absentee Report**        | `absenteeDataUtils.ts`, `absenteeStandardBallotRequest.ts` | Ward/town mapping; NY absentee CSV format                           |
| **Voter List XLSX**        | `xlsxGenerator.ts`                                         | Column headers; generic but labels could be configurable            |

### Committee Report

```tsx
// CommitteeReport.tsx line 50-52
<h2 className="text-center text-xl font-black pt-4">
  Monroe County Democratic Committee List as of May 15, 2025
</h2>
```

- Organization name, date, and any header text are hardcoded

### What’s Required

| Scenario                              | Effort | Changes                                                                    |
| ------------------------------------- | ------ | -------------------------------------------------------------------------- |
| **Different org name / report title** | Low    | Props or config: `reportTitle`, `orgName`, `asOfDate`                      |
| **Configurable sheet naming**         | Low    | Pass naming function or config to XLSX generator                           |
| **Different petition form layout**    | Medium | Template/config for designated petition; state-specific forms              |
| **Different XLSX column set**         | Low    | Already configurable via `selectedFields`; ensure headers are configurable |
| **New report types**                  | Medium | Extend `REPORT_TYPE_MAPPINGS` and report-server job handling               |

### Recommendation

1. **Report config** (per jurisdiction or global):
   - `committeeReportTitle: string` — e.g., "Monroe County Democratic Committee List as of {date}"
   - `organizationName: string`
   - `defaultReportDate: string` or `useCurrentDate: boolean`
2. **Template-driven reports**: Consider a simple template engine (e.g., Handlebars) for PDF/HTML reports
3. **Report type registry**: Plugin-style registration of report types with their config schemas

---

## 5. State & Election Law Extensibility

### Current State

The system is built around **New York State Election Law** and MCDC bylaws.

| Concept             | NY Implementation                                                | Other States                                       |
| ------------------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| Committee structure | County + Local Committee; LTED (Legislative + Election District) | States use precincts, districts, wards differently |
| Capacity            | 4 members per LTED                                               | Varies (2, 4, 6, or at-large)                      |
| Petition process    | Petition to form committee; primary if >4 petitioners            | Not all states have this                           |
| Eligibility         | Registered voter, enrolled Democrat, correct Assembly District   | Varies by state/party                              |
| Voter ID            | VRCNUM (NY)                                                      | statevid, voter_id, SOS_ID, etc.                   |
| Party codes         | DEM, REP, BLK, CON, WOR, OTH, IND                                | State-specific (e.g., TX uses different codes)     |

### Hardcoded NY Assumptions

- `statevid` — NY state voter ID
- `VRCNUM` — NY BOE control number
- 4-member capacity in `handleRequest` and `AddCommitteeForm`
- `countyLegDistrict`, `stateAssmblyDistrict`, `stateSenateDistrict` — NY district model
- `L_T` (Legislative/Town code), `CC_WD_Village`, `townCode` — NY geographic codes

### What’s Required for Different States

| Scenario                                                                            | Effort    | Changes                                                        |
| ----------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------- |
| **Same state, different rules** (e.g., different capacity)                          | Low       | Config-driven capacity                                         |
| **Different state, similar structure** (e.g., another state with county committees) | High      | Schema for state-specific fields; config for eligibility rules |
| **Different state, different structure** (e.g., precinct chairs, no LTED)           | Very High | Substantial schema and business logic redesign                 |
| **Multi-state deployment**                                                          | Very High | State as first-class dimension; state-specific configs         |

### Recommendation

1. **State/Election config**:
   - `state: string` (e.g., "NY")
   - `voterIdField: string` (e.g., "VRCNUM" or "statevid")
   - `districtFields: string[]` — which district fields exist
   - `maxMembersPerCommittee: number`
   - `eligibilityRules`: placeholder for future rule engine
2. **Election law as config**: Encode capacity, petition thresholds, party requirements in config rather than code
3. **Deferred**: Full multi-state support is a major architectural effort; single-state extensibility is more realistic short-term

---

## 6. Absentee Report Extensibility

### Current State

The absentee report pipeline expects the **Monroe County BOE "Absentee Standard Ballot Request"** CSV format.

| Location                                                              | Content                                                                                                                     |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `apps/report-server/src/reportTypes/absenteeStandardBallotRequest.ts` | `ABSENTEE_STANDARD_BALLOT_REQUEST_HEADERS` — 66 columns                                                                     |
| `apps/report-server/src/utils/absenteeDataUtils.ts`                   | `WARD_TO_TOWN_MAPPING`, `PARTY_TYPES` (DEM, REP, BLK, CON, WOR, OTH, IND)                                                   |
| `absenteeDataUtils.ts`                                                | Uses `Ward`, `Party`, `Ballot Last Issued Date`, `Last Received Delivery Status`, `Other1` (County Leg), `St.Sen`, `St.Leg` |

### NY-Specific Absentee Fields

- **Ward** → Town via `WARD_TO_TOWN_MAPPING`
- **Party**: NY-specific codes
- **Other1** = County Legislature district
- **St.Sen**, **St.Leg** = State Senate, State Legislature

### What’s Required

| Scenario                                             | Effort | Changes                                            |
| ---------------------------------------------------- | ------ | -------------------------------------------------- |
| **Different county, same NY format**                 | Low    | Replace `WARD_TO_TOWN_MAPPING` with config         |
| **Different NY absentee export** (different columns) | Medium | Configurable column mapping + optional columns     |
| **Different state absentee format**                  | High   | New schema, mappings, statistics logic             |
| **Different party codes**                            | Low    | Make `PARTY_TYPES` configurable                    |
| **No ward concept** (e.g., precinct-based)           | Medium | Abstract "grouping" (ward vs precinct vs district) |

### Recommendation

1. **Absentee report config**:
   - `columnMapping` for absentee CSV
   - `wardToTownMapping` or generic `groupingFieldToDisplayMapping`
   - `partyTypes: string[]`
   - `requiredHeaders: string[]`
2. **Optional columns**: Allow missing columns with defaults (e.g., "Unknown" for town)
3. **Grouping abstraction**: Support grouping by Ward, Precinct, District, or custom field

---

## 7. Search & Dropdown Extensibility

### Current State

Search fields and dropdown behavior are mostly defined in code, with values populated from data.

| Location                                          | Content                                | Extensibility                   |
| ------------------------------------------------- | -------------------------------------- | ------------------------------- |
| `apps/frontend/src/lib/constants/searchFields.ts` | `SEARCH_FIELDS` — fixed list           | Field set is hardcoded          |
| `packages/shared-validators/src/constants.ts`     | `STRING_FIELDS`, `NUMBER_FIELDS`, etc. | Tied to Prisma schema           |
| `CITY_TOWN_CONFIG`                                | Monroe County cities/towns             | Hardcoded; see §2               |
| `DropdownLists` table                             | Populated from voter import            | Dynamic; one row per deployment |
| `dropdownListProcessor.ts`                        | `dropdownItems` list                   | Hardcoded field names           |

### Observation

- **Dropdown values** are data-driven (from voter import) — good for extensibility
- **Search field definitions** are code-driven — adding fields requires code changes
- **City/town** uses Monroe-specific config for compound CityTown field behavior

### What’s Required

| Scenario                                              | Effort | Changes                                                    |
| ----------------------------------------------------- | ------ | ---------------------------------------------------------- |
| **Add/remove search fields**                          | Medium | Config-driven search fields; or admin UI to enable/disable |
| **Different dropdown fields**                         | Low    | Make `dropdownItems` configurable per jurisdiction         |
| **Different CityTown behavior** (e.g., no sub-fields) | Medium | Conditional logic based on jurisdiction config             |
| **Custom field labels**                               | Low    | i18n or config for display names                           |

### Recommendation

1. **Search field config**: Allow jurisdiction to define which fields are searchable and their types
2. **Dropdown field config**: `dropdownFields: string[]` in jurisdiction config
3. **Labels**: Externalize to config or i18n for easier customization

---

## 8. Multi-Tenancy & Configuration

### Current State

The system is **single-tenant**:

- One database
- One `DropdownLists` row
- No `Jurisdiction` or `Tenant` model
- All config is in code or env vars

### What Multi-Tenancy Would Require

| Approach                   | Effort     | Description                                               |
| -------------------------- | ---------- | --------------------------------------------------------- |
| **Database per tenant**    | High       | Separate DB per jurisdiction; complex deployment          |
| **Row-level tenancy**      | Medium     | Add `jurisdictionId` to key tables; filter all queries    |
| **Config file per tenant** | Low–Medium | Single DB; config files or DB table keyed by jurisdiction |

### Configuration Architecture

A unified **Jurisdiction/Tenant Config** could hold:

```yaml
# config/jurisdictions/monroe_mcdc.yaml (example)
id: monroe_mcdc
name: Monroe County Democratic Committee
state: NY

voterImport:
  columnMapping: {} # empty = use default NY BOE names
  dateFormat: 'mm/dd/yyyy'
  primaryKeyField: 'VRCNUM'

geography:
  cityTownConfig: [...]
  wardToTownMapping: { ... }
  citiesWithLegislativeDistricts: ['ROCHESTER']
  legislativeDistrictLabel: 'LD'

committee:
  maxMembersPerCommittee: 4
  importColumnMapping:
    'voter id': 'VRCNUM'
    'Serve LT': 'legDistrict'
    'Serve ED': 'electionDistrict'
    'Committee': 'cityTown'
  rochesterLDPattern: 'LD '

reports:
  committeeReportTitle: 'Monroe County Democratic Committee List as of {date}'
  organizationName: 'Monroe County Democratic Committee'

absentee:
  wardToTownMapping: { ... }
  partyTypes: [DEM, REP, BLK, CON, WOR, OTH, IND]
  columnMapping: {} # default NY absentee headers
```

### Recommendation

1. **Phase 1**: Single jurisdiction with externalized config (YAML/JSON/DB)
2. **Phase 2**: Add `Jurisdiction` model, `jurisdictionId` on key tables
3. **Phase 3**: Admin UI to manage jurisdiction config
4. **Phase 4**: Multi-tenant deployment with per-request jurisdiction context

---

## 9. Data Model Considerations

### Current Schema Assumptions

| Model/Field                                               | NY-Specific? | Notes                                              |
| --------------------------------------------------------- | ------------ | -------------------------------------------------- |
| `VoterRecord.VRCNUM`                                      | Yes          | NY primary key; could be generalized to `voterId`  |
| `VoterRecord.statevid`                                    | Yes          | NY state ID                                        |
| `VoterRecord.countyLegDistrict`                           | Yes          | NY county legislature                              |
| `VoterRecord.stateAssmblyDistrict`                        | Yes          | NY State Assembly (typo: "Assmbly")                |
| `VoterRecord.CC_WD_Village`                               | Yes          | NY City Council / Ward / Village code              |
| `VoterRecord.townCode`                                    | Yes          | NY town code                                       |
| `VoterRecord.L_T`                                         | Yes          | NY Legislative/Town                                |
| `CommitteeList.(cityTown, legDistrict, electionDistrict)` | Yes          | NY LTED structure                                  |
| `DropdownLists`                                           | Partially    | Field names are NY-centric; values are data-driven |

### Schema Evolution Options

1. **Rename for clarity**: `VRCNUM` → `voterRegistrationId` with migration (breaking)
2. **Add jurisdictionId**: `Jurisdiction` model; FK on `VoterRecord`, `CommitteeList`, `Report`, etc.
3. **Extension table**: `VoterRecordExt` with `(voterRecordId, key, value)` for state-specific fields
4. **JSON columns**: `VoterRecord.metadata Json?` for flexible state-specific data without schema changes

### Recommendation

- Prefer **config and mapping** over schema changes where possible
- Add **jurisdictionId** when moving to multi-tenant
- Use **JSON metadata** for one-off state fields before adding columns

---

## 10. Implementation Roadmap Summary

### Priority Tiers

| Tier                                  | Scope                                       | Effort    | Impact                                                  |
| ------------------------------------- | ------------------------------------------- | --------- | ------------------------------------------------------- |
| **T1 – Quick wins**                   | Externalize hardcoded strings and mappings  | 1–2 weeks | Enables different org name, report title, ward mapping  |
| **T2 – Voter import flexibility**     | Column mapping + date format config         | 2–3 weeks | Enables different NY counties, slight format variations |
| **T3 – Committee import flexibility** | Configurable committee import               | 1–2 weeks | Enables different committee export formats              |
| **T4 – Geographic config**            | DB/config for city-town-ward                | 2–3 weeks | Enables different NY counties                           |
| **T5 – Absentee report flexibility**  | Configurable absentee format                | 2 weeks   | Enables different NY absentee exports                   |
| **T6 – Jurisdiction model**           | Multi-tenant data model                     | 3–4 weeks | Enables multiple jurisdictions in one deployment        |
| **T7 – Full multi-state**             | State-specific schemas, election law engine | 8+ weeks  | Enables different states                                |

### Recommended Sequence

1. **Externalize config** (report title, org name, ward mapping, party types) — no schema change
2. **Voter import column mapping** — enables different CSV shapes for same core fields
3. **Geographic config** — move `CITY_TOWN_CONFIG` and `WARD_TO_TOWN_MAPPING` to config
4. **Committee import config** — path + column mapping + Rochester pattern
5. **Jurisdiction model** — when ready for multi-tenant

### Files Requiring Changes (High-Impact)

| File                                                                  | Change Type                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------ |
| `packages/voter-import-processor/src/parseVoterFile.ts`               | Accept config; use column mapping                      |
| `packages/voter-import-processor/src/voterRecordProcessor.ts`         | Configurable date format; mapping layer                |
| `packages/shared-validators/src/constants.ts`                         | Optional: extend for config-driven fields              |
| `apps/frontend/src/lib/searchConfiguration.ts`                        | Load `CITY_TOWN_CONFIG` from config                    |
| `apps/report-server/src/utils/absenteeDataUtils.ts`                   | Load `WARD_TO_TOWN_MAPPING`, `PARTY_TYPES` from config |
| `apps/report-server/src/components/CommitteeReport.tsx`               | Accept `reportTitle` prop/config                       |
| `apps/frontend/src/app/api/admin/bulkLoadCommittees/bulkLoadUtils.ts` | Configurable path + column mapping                     |
| `apps/frontend/src/app/api/lib/utils.ts`                              | Configurable `DISCREPENCY_FIELDS`                      |
| `apps/report-server/src/reportTypes/absenteeStandardBallotRequest.ts` | Optional: config-driven headers                        |
| `apps/report-server/src/xlsxGenerator.ts`                             | Configurable Rochester logic                           |

---

## Appendix A: Inventory of Monroe County / MCDC References

| File                        | Reference                                                      |
| --------------------------- | -------------------------------------------------------------- |
| `CommitteeReport.tsx`       | "Monroe County Democratic Committee List as of May 15, 2025"   |
| `CommitteeReport.tsx`       | `page.cityTown === 'ROCHESTER'` for LD formatting              |
| `absenteeDataUtils.ts`      | `WARD_TO_TOWN_MAPPING` (22 Monroe County wards)                |
| `absenteeDataUtils.ts`      | `PARTY_TYPES` (NY party codes)                                 |
| `searchConfiguration.ts`    | `CITY_TOWN_CONFIG` (Monroe County cities, towns, villages)     |
| `bulkLoadUtils.ts`          | `data/Committee-File-2025-05-15.xlsx`                          |
| `bulkLoadUtils.ts`          | `row.Committee?.includes("LD ")` Rochester detection           |
| `bulkLoadUtils.ts`          | `row["Serve LT"]`, `row["Serve ED"]`, `row["voter id"]`        |
| `utils.ts`                  | `DISCREPENCY_FIELDS` with `name`, `res address1`, etc.         |
| `xlsxGenerator.ts`          | `ld.cityTown === 'ROCHESTER'` for sheet naming                 |
| `voterRecordProcessor.ts`   | `exampleVoterRecord` (NY BOE schema)                           |
| `parseVoterFile.ts`         | `Object.keys(exampleVoterRecord)` for CSV headers              |
| `specialVoterFile/route.ts` | `data/committeeVRCNUMs.txt`, `data/2024_5_2_voter_records.txt` |
| SRS docs                    | MCDC, Monroe County BOE, NYS Election Law throughout           |

---

## Appendix B: External Standards Reference

- **VIP (Voting Information Project)**: [VIP Specification](https://votinginfoproject.github.io/vip-specification/) — standardized voter/election data format; states can export VIP-compliant CSVs
- **State file availability**: [Ballotpedia - State Voter Files](https://ballotpedia.org/Availability_of_state_voter_files) — varies by state (format, cost, requirements)
- **No universal format**: Each state BOE defines its own export; mapping layers are necessary for cross-state use

---

## Appendix C: Designated Petition Form

The designated petition report generates a PDF form aligned with **NY State Board of Elections** designated petition requirements. The form structure (candidates, vacancy appointments, party, election date, number of pages) is generic enough to adapt, but:

- **Layout and fields** are NY-specific
- **Legal text** and instructions would need to be state-specific
- **Validation rules** (e.g., signature counts) vary by state

**Extensibility:** Template-driven form with state-specific templates (HTML/Handlebars) and validation rules in config.

---

## Appendix D: Infrastructure & Deployment

| Consideration      | Single-Jurisdiction              | Multi-Jurisdiction                                             |
| ------------------ | -------------------------------- | -------------------------------------------------------------- |
| **Database**       | One Postgres                     | One DB with `jurisdictionId` filter, or DB-per-tenant          |
| **R2/S3 buckets**  | One bucket; key prefix by report | Same + jurisdiction prefix (e.g., `reports/{jurisdictionId}/`) |
| **Auth**           | Google OAuth; privilege levels   | Same; add jurisdiction assignment to users                     |
| **Env vars**       | Current set                      | May need `DEFAULT_JURISDICTION_ID` or per-deploy config path   |
| **Terraform**      | Single Lightsail + Vercel        | Same; or separate stacks per tenant                            |
| **Data isolation** | N/A                              | Critical: ensure all queries filter by `jurisdictionId`        |

---

## Appendix E: Testing Implications

Extensibility introduces new testing dimensions:

1. **Config-driven behavior**: Unit tests need to run with different configs (e.g., column mapping, ward mapping)
2. **Fixture data**: Jurisdiction-specific fixtures for integration tests
3. **Regression**: Ensure default/Monroe config still passes all existing tests
4. **New test suites**: Tests for config validation, mapping edge cases, multi-tenant query isolation

---

## Appendix F: Realistic Extensibility Scenarios (Effort Summary)

| Scenario                                               | Approx. Effort | Key Blockers                                          |
| ------------------------------------------------------ | -------------- | ----------------------------------------------------- |
| **Another NY county** (same BOE format)                | 1–2 weeks      | Replace hardcoded geography; externalize report title |
| **Another NY county** (slightly different BOE columns) | 2–3 weeks      | Add voter import column mapping                       |
| **Another Democratic committee in NY** (same county)   | 1 week         | Replace org name, report title                        |
| **Different NY county absentee format**                | 2 weeks        | Absentee column mapping + ward config                 |
| **Out-of-state (same general structure)**              | 4–6 weeks      | Voter ID field, schema mappings, district field names |
| **Out-of-state (different structure)**                 | 8+ weeks       | Schema changes, committee model, eligibility rules    |
| **Multiple jurisdictions, single deployment**          | 6–8 weeks      | Jurisdiction model, config loader, auth scoping       |
| **SaaS multi-tenant**                                  | 12+ weeks      | Full tenant isolation, admin UI, onboarding flows     |

---

_End of document_
