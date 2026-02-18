# Software Requirements Specification (SRS)

## MCDC Committee Membership & Governance System

**Version 0.1 – Combined Artifacts + Glossary**
**January 2026**

---

### Implementation Status Legend

| Marker                   | Meaning                                                   |
| ------------------------ | --------------------------------------------------------- |
| **[DONE - TESTED]**      | Implemented in code AND has automated test coverage       |
| **[DONE - NO TESTS]**    | Implemented in code but NO automated test coverage        |
| **[PARTIAL - TESTED]**   | Some aspects implemented with test coverage; gaps noted   |
| **[PARTIAL - NO TESTS]** | Some aspects implemented but no test coverage; gaps noted |
| **[NOT IMPLEMENTED]**    | Not present in the codebase                               |

**Schema note:** `CommitteeRequest` has a typo: relation field `committeList` (missing one 't'). Fix planned in migration. See [SRS_IMPLEMENTATION_ROADMAP.md](SRS_IMPLEMENTATION_ROADMAP.md).

---

## Executive Summary

The Monroe County Democratic Committee (MCDC) Committee Membership & Governance System is designed to modernize, standardize, and safeguard how County Committee and Local Committee membership is managed.

Today, committee membership is maintained through a combination of Google Forms, manual voter registration checks, and a legacy Access database. This process is time-consuming, error-prone, and dependent on institutional knowledge. As committee leadership changes and election cycles overlap, the risk of inconsistencies, delays, and disputes increases.

This system establishes a single, authoritative source of record for committee membership by integrating official Monroe County Board of Elections (BOE) voter data with structured workflows aligned to New York State Election Law and MCDC bylaws.

### What the system does

At its core, the system allows committee leaders to:

- Submit names for committee membership using a voter registration number (VRN) or name search
  > **[DONE - TESTED]** VRN search via `VRCNUM` field and name search via compound `firstName`/`lastName` fields. Search API at `POST /api/fetchFilteredData` with tests in `fetchFilteredData.test.ts`. Committee add via `POST /api/committee/add` with tests in `add.test.ts`. Leader request flow via `POST /api/committee/requestAdd` with tests in `requestAdd.test.ts`.
- Receive immediate eligibility validation based on official voter data
  > **[PARTIAL - NO TESTS]** System enforces: LTED capacity (max 4 members) and duplicate membership checks (already in this committee, already in another committee). These are checked in `AddCommitteeForm.tsx` (UI) and `handleRequest/route.ts` (backend capacity check). **Missing:** No checks for registered voter status, enrolled Democrat, or correct Assembly District. No eligibility-specific tests.
- View accurate, up-to-date committee rosters and vacancies
  > **[PARTIAL - NO TESTS]** Committee rosters viewable via `CommitteeSelector.tsx` → `GET /api/fetchCommitteeList`. Vacancies are implicit (committees showing fewer than 4 members). **Missing:** No explicit vacancy view or vacancy count. No tests for `CommitteeSelector` or `fetchCommitteeList` UI. Backend `fetchCommitteeList.test.ts` covers the API endpoint.
- Generate sign-in sheets and designation weight summaries on demand
  > **[PARTIAL - NO TESTS]** Committee reports (PDF/XLSX) can be generated via `POST /api/generateReport` → report-server `POST /start-job`. **Missing:** No specific "sign-in sheet" format. No designation weight summary report. Report-server has zero test files.

At the same time, it enables MCDC staff to:

- Review and confirm submissions
  > **[DONE - TESTED]** `CommitteeRequest` model with accept/reject workflow via `POST /api/committee/handleRequest`. Request creation tested in `requestAdd.test.ts`. **Note:** `handleRequest` route itself has no dedicated test file.
- Record Executive Committee confirmations
  > **[NOT IMPLEMENTED]** No meeting record model. No confirmation workflow. No status transition from Submitted → Confirmed → Active.
- Track resignations and BOE-driven removals
  > **[PARTIAL - TESTED]** Basic member removal (disconnect from committee) via `POST /api/committee/remove` with tests in `remove.test.ts`. BOE upload discrepancy detection exists in `CommitteeUploadDiscrepancies.tsx` and `bulkLoadCommittees/route.ts`. **Missing:** No resignation workflow, no resignation date/method fields, no removal reason recording, no BOE-driven automatic flagging of ineligible members.
- Maintain a full audit trail of all changes
  > **[NOT IMPLEMENTED]** No audit trail. Only `createdAt`/`updatedAt` timestamps on some models. No immutable action log, no before/after tracking, no audit UI.
- Manage petition and primary outcomes
  > **[NOT IMPLEMENTED]** No petition model, no primary outcome tracking, no related UI or API.

### Why this matters

The system is built to support three critical outcomes:

1. **Accuracy and Trust:** Leaders can rely on the data they see. Eligibility rules are applied consistently and transparently, and the source of each decision is documented.
2. **Operational Efficiency:** Manual lookups, spreadsheets, and back-and-forth emails are replaced with real-time validation and self-service reporting.
3. **Defensibility and Compliance:** Every membership decision—petitioned, appointed, resigned, or removed—is traceable, auditable, and aligned with Election Law and MCDC bylaws.

### Key concepts

- Committee Terms modeled explicitly
  > **[NOT IMPLEMENTED]** No term model. `CommitteeList` has no term field. Membership is not organized by term.
- Seat-based designation weight
  > **[NOT IMPLEMENTED]** No seat model. No weight field. LTED has a 4-member capacity enforced in code, but seats are not individually modeled.
- Petition and primary outcome tracking
  > **[NOT IMPLEMENTED]** No petition or primary models, enums, or tracking.
- Full audit trail for all actions
  > **[NOT IMPLEMENTED]** No audit trail implementation.

This system does not attempt to automate political judgment. Instead, it provides a reliable, transparent framework so leaders and staff can make decisions confidently, with shared facts and clear process.

---

## Software Requirements Specification (SRS v0.1)

### 1. Introduction

#### 1.1 Purpose

This document defines the functional and non-functional requirements for a system to manage County Committee and Local Committee membership for the Monroe County Democratic Committee (MCDC). The system will serve as the authoritative source of record for committee composition, eligibility, vacancies, and designation-related weight calculations, aligned with New York State Election Law and MCDC bylaws.

#### 1.2 Scope

The system will:

- Centralize committee membership data
  > **[DONE - TESTED]** Single PostgreSQL database with `CommitteeList` and `VoterRecord` models via Prisma. Committee CRUD APIs tested in `add.test.ts`, `remove.test.ts`, `requestAdd.test.ts`, `fetchCommitteeList.test.ts`.
- Automate eligibility validation using official voter data
  > **[PARTIAL - NO TESTS]** Only capacity (max 4) and duplicate membership checks exist. No voter registration, party enrollment, or Assembly District validation. See Section 7 details.
- Support petition-based committee formation and vacancy filling
  > **[PARTIAL - TESTED]** Vacancy filling exists: admins can add members to committees with open seats. Tested in `add.test.ts`. **Missing:** No petition-based formation. No petition model.
- Provide leaders with self-service access to accurate committee information
  > **[DONE - NO TESTS]** `CommitteeSelector.tsx` allows leaders to browse committees by City/Town → Leg District → Election District and view members. No component tests.
- Generate defensible reports for meetings, designation, and audit purposes
  > **[PARTIAL - NO TESTS]** Committee roster reports (PDF/XLSX) via report-server. **Missing:** No designation reports, no audit reports. Report-server has zero tests.

**Out of scope for v1:**

- Executive Committee weighted voting logic
- Future committee term toggling for leaders
- Digital storage of resignation PDFs

---

### 2. Business Objectives

#### 2.1 Problem Statement

The current committee membership process is highly manual, relying on Google Forms, manual voter registration number (VRN) checks, and an Access database. This workflow is slow, error-prone, and dependent on institutional knowledge, creating administrative burden and risk of procedural disputes.

#### 2.2 Objectives

- Establish a single source of truth for committee membership
  > **[DONE - TESTED]** Centralized database with committee and voter models. CRUD operations tested.
- Reduce manual validation and data entry errors
  > **[PARTIAL - NO TESTS]** BOE voter file import automates data loading. Committee add is validated (Zod schemas). **Missing:** No live eligibility validation against voter data during submission.
- Increase leader trust through transparent, accurate data
  > **[PARTIAL - NO TESTS]** Real-time roster viewing exists. **Missing:** No eligibility transparency, no audit trail.
- Ensure compliance with NYS Election Law and MCDC bylaws
  > **[NOT IMPLEMENTED]** No Election Law-specific rules encoded (party check, AD check, etc.).
- Support auditability and historical traceability
  > **[PARTIAL - NO TESTS]** `VoterRecordArchive` model stores historical voter data snapshots by year/entry number. **Missing:** No committee membership change history, no audit log.

#### 2.3 Success Criteria

The system will be considered successful when:

- Leaders can submit a VRN and receive immediate eligibility validation
  > **[PARTIAL - TESTED]** VRN search works. Only capacity/duplicate validation exists. Tested in `fetchFilteredData.test.ts` (search) and `add.test.ts` (add). **Missing:** Full eligibility validation.
- Committee rosters and vacancy information are available on demand
  > **[PARTIAL - NO TESTS]** Rosters available. Vacancies only implicit. No vacancy-specific view or report.
- Weight calculations are consistent, explainable, and defensible
  > **[NOT IMPLEMENTED]** No weight calculation logic anywhere in the codebase.
- Administrative effort and disputes are materially reduced
  > **[PARTIAL]** Digital workflow replaces some manual processes. Core gaps remain (eligibility, audit).

---

### 3. Users and Roles

#### 3.1 Administrative Users

**Roles:** County Chair, Executive Director, designated Cabinet Members

> **[PARTIAL - TESTED]** `PrivilegeLevel` enum: `Developer`, `Admin`, `RequestAccess`, `ReadAccess`. No role-name mapping to specific titles (County Chair, etc.). Auth enforced via `withPrivilege()` HOC. Tested across multiple API route test files.

**Permissions:**

- Full read/write access
  > **[DONE - TESTED]** `Admin` privilege grants full CRUD. Enforced via `withPrivilege(PrivilegeLevel.Admin, ...)`. Tested in `add.test.ts`, `remove.test.ts`.
- Submit candidates on behalf of leaders
  > **[DONE - TESTED]** Admin can directly add via `POST /api/committee/add`. Tested in `add.test.ts`.
- Override validation in rare cases
  > **[NOT IMPLEMENTED]** No override mechanism exists.
- Record resignations and removals
  > **[PARTIAL - TESTED]** Removals (disconnect member) via `POST /api/committee/remove`. Tested. **Missing:** No resignation workflow (date, method, reason fields).
- Enter petition and primary outcomes
  > **[NOT IMPLEMENTED]** No petition/primary models or UI.
- Generate all countywide reports
  > **[DONE - NO TESTS]** Report generation via `POST /api/generateReport` → report-server. Supports committee reports (PDF/XLSX), voter list reports, designated petitions. No jurisdiction scoping filter — admin sees all. No tests in report-server.
- View full audit history
  > **[NOT IMPLEMENTED]** No audit history.

#### 3.2 Local Committee Leaders

**Roles:** Town Chairs, City Legislative District Chairs

**Permissions:**

- Access limited to assigned jurisdiction(s)
  > **[NOT IMPLEMENTED]** No jurisdiction-scoped access control. All authenticated users with `RequestAccess`+ can browse all committees and submit to any LTED.
- Submit candidates for committee membership
  > **[DONE - TESTED]** Via `CommitteeRequestForm` → `POST /api/committee/requestAdd`. Admin reviews. Tested in `requestAdd.test.ts`.
- View current committee roster
  > **[DONE - NO TESTS]** `CommitteeSelector.tsx` with `GET /api/fetchCommitteeList`. API tested in `fetchCommitteeList.test.ts`; UI component untested.
- View open seats and designation weight totals
  > **[PARTIAL - NO TESTS]** Open seats implicit from member count (< 4 shown in UI). **Missing:** No explicit vacancy count. No designation weight totals.
- Generate sign-in sheets and local reports
  > **[PARTIAL - NO TESTS]** Committee reports (PDF/XLSX) can be generated. **Missing:** No sign-in sheet format. No jurisdiction-scoped report filtering for leaders.

---

### 4. Data Sources

#### 4.1 Authoritative Voter Data

- **Source:** Monroe County Board of Elections (BOE)
  > **[DONE - NO TESTS]** `VoterRecord` and `VoterRecordArchive` Prisma models store BOE data.
- **Formats:** CSV and Microsoft Access database
  > **[PARTIAL - NO TESTS]** CSV import implemented in `packages/voter-import-processor/` (`parseVoterFileFromStream`, `parseVoterFileFromBuffer`, `parseVoterFileFromPath`). Processes via report-server `voterImportProcessor.ts`. **Out of scope for v1:** Microsoft Access database import (deferred — see [Roadmap Future Considerations](SRS_IMPLEMENTATION_ROADMAP.md#microsoft-access-database-import)). No tests in voter-import-processor.
- **Update cadence:** On demand; expected monthly
  > **[DONE - NO TESTS]** Admin-triggered via `POST /api/admin/bulkLoadData` and report-server `voterImport` job type.
- Treated as the authoritative source for voter eligibility
  > **[PARTIAL - NO TESTS]** Data is loaded and stored. **Missing:** Not actively used for eligibility validation during committee submission.

#### 4.2 District Mapping Data

- LTED-to-district crosswalk table provided by MCDC
  > **[NOT IMPLEMENTED]** No crosswalk table in the database schema. **Planned:** `LtedDistrictCrosswalk` model per SRS §4.2 (Roadmap 1.1b, Data Model doc).
- Used for sign-in sheets and meeting logistics
  > **[NOT IMPLEMENTED]** No sign-in sheet generation using district mapping.
- Includes Assembly, Senate, Congressional, and local districts
  > **[DONE - NO TESTS]** District fields exist on `VoterRecord`: `stateAssmblyDistrict`, `stateSenateDistrict`, `congressionalDistrict`, `countyLegDistrict`. Searchable via `fetchFilteredData`. Planned crosswalk (`LtedDistrictCrosswalk`) will map LTED → districts per SRS §4.2.

---

### 5. Committee Term Model

#### 5.1 Committee Terms

- Committee membership is organized by term (e.g., "2024–2026")
  > **[NOT IMPLEMENTED]** No term field on `CommitteeList` or any related model. No `CommitteeTerm` model.
- Each membership record belongs to exactly one term
  > **[NOT IMPLEMENTED]** Membership is a simple FK relationship (`VoterRecord.committeeId → CommitteeList.id`) with no term context.
- Leaders may submit to only one active term at a time (v1)
  > **[NOT IMPLEMENTED]** No term concept exists.

---

### 6. Committee Membership Lifecycle

#### 6.1 Membership Types

- Petitioned Committee Member
  > **[NOT IMPLEMENTED]** No membership type distinction. No `membershipType` field.
- Appointed (Vacancy-Filled) Committee Member
  > **[NOT IMPLEMENTED]** All members are simply "connected" to a committee. No petitioned vs. appointed distinction.

#### 6.2 Membership Statuses

- Submitted
  > **[PARTIAL - TESTED]** `CommitteeRequest` model represents a pending submission. Accept/reject workflow exists. Tested in `requestAdd.test.ts`. **Note:** This is not a status field on the membership itself — it's a separate request table.
- Confirmed
  > **[NOT IMPLEMENTED]** No confirmation status. Accepted requests directly connect the member.
- Active
  > **[PARTIAL - NO TESTS]** Implicit: a member linked to a committee via `committeeId` is considered active. No explicit status field.
- Resigned
  > **[NOT IMPLEMENTED]** No resignation status. Removal disconnects the FK; no reason is stored.
- Removed (with reason)
  > **[PARTIAL - TESTED]** Removal exists (`POST /api/committee/remove` disconnects `committeeId`). Tested. **Missing:** No removal reason field. No removal history.
- Petitioned – Won Primary
  > **[NOT IMPLEMENTED]**
- Petitioned – Lost Primary
  > **[NOT IMPLEMENTED]**

#### 6.3 Petition Process

- Individuals are petitioned onto the committee per Election Law
  > **[NOT IMPLEMENTED]** No petition model, no petition workflow.
- If more than four individuals petition for an LTED, a primary is held
  > **[NOT IMPLEMENTED]**
- Top four vote-getters become eligible committee members
  > **[NOT IMPLEMENTED]**
- Ties may result in a weighted but vacant seat
  > **[NOT IMPLEMENTED]**
- Petition outcomes are manually entered by administrators
  > **[NOT IMPLEMENTED]**

#### 6.4 Vacancy Filling

- Vacancies are filled via Executive Committee vote
  > **[PARTIAL - TESTED]** Admins can add members to committees with available seats (< 4) via `POST /api/committee/add`. Tested in `add.test.ts`. **Missing:** No Executive Committee vote recording. No meeting record linkage.
- Vacancy fills apply only to the current committee term
  > **[NOT IMPLEMENTED]** No term model.
- Confirmation is recorded against a meeting record
  > **[NOT IMPLEMENTED]** No meeting record model. `ElectionDate` model exists but is unrelated (used for petition report generation).

#### 6.5 Resignations

- Submitted directly by the committee member (email or mail)
  > **[NOT IMPLEMENTED]** No resignation submission workflow.
- Recorded by administrative users
  > **[NOT IMPLEMENTED]** Admin can remove members but there is no resignation-specific recording.
- **Required fields:**
  - Date received
    > **[NOT IMPLEMENTED]**
  - Method received
    > **[NOT IMPLEMENTED]**
- Resignation frees the seat for new submissions
  > **[PARTIAL - TESTED]** Removing a member (via `POST /api/committee/remove`) sets `committeeId = null`, freeing the slot. Tested. **Missing:** This is a generic remove, not a resignation-specific action.

#### 6.6 Removals (BOE-Driven)

- Triggered automatically when BOE data changes indicate ineligibility
  > **[PARTIAL - NO TESTS]** `CommitteeUploadDiscrepancy` model and `CommitteeUploadDiscrepancies.tsx` UI detect discrepancies when BOE data is re-imported via `POST /api/admin/bulkLoadCommittees`. Flags address, name, city, zip mismatches. **Missing:** Does not automatically detect party changes, moves out of district, or death. Not an ongoing automatic process — only triggered during bulk upload.
- Require admin review before finalization
  > **[DONE - NO TESTS]** `DiscrepanciesActionsMenu.tsx` allows admin to accept or reject each discrepancy. `POST /api/admin/handleCommitteeDiscrepancy` processes the decision.
- Removal reason is recorded (e.g., party change, moved, inactive, deceased)
  > **[NOT IMPLEMENTED]** Discrepancy JSON stores the mismatch details, but no structured removal reason field.

---

### 7. Validation Rules

#### 7.1 Hard Stops

Submissions must fail if:

- Individual is not registered to vote
  > **[NOT IMPLEMENTED]** No voter registration status check during submission. All records in `VoterRecord` table are from BOE imports and assumed registered, but no explicit validation at submission time.
- Individual is not an enrolled Democrat
  > **[NOT IMPLEMENTED]** `VoterRecord.party` field exists but is not checked during committee add/request submission.
- Individual does not reside in the correct Assembly District
  > **[NOT IMPLEMENTED]** `VoterRecord.stateAssmblyDistrict` exists but is not validated against the target committee during submission.
- LTED already has four active members
  > **[DONE - TESTED]** Enforced in `handleRequest/route.ts` (line 63: `currentMemberCount >= 4`) and in `AddCommitteeForm.tsx` UI (`committeeList.length >= 4` disables the button). Backend capacity check is part of the accept flow.
- Individual is already an active committee member in another LTED
  > **[PARTIAL - NO TESTS]** UI check in `AddCommitteeForm.tsx`: `!!record.committeeId` disables the "Add" button if the voter is already in any committee. **Missing:** No backend enforcement — the `POST /api/committee/add` route does not reject if `committeeId` is already set on another committee. Only an idempotent check for the same committee exists. **Planned:** Backend enforcement in roadmap Tier 0 / 2.1.

#### 7.2 Warnings

Warnings allow submission but require review:

- Inactive voter status
  > **[NOT IMPLEMENTED]** No voter status field or check.
- Recent resignation timing
  > **[NOT IMPLEMENTED]** No resignation tracking.
- Potential duplicate submission
  > **[PARTIAL - TESTED]** Idempotent duplicate detection in `POST /api/committee/add`: if member is already connected to the target committee, returns success with `idempotent: true`. Tested in `add.test.ts`. **Missing:** No warning UI; it silently succeeds.

---

### 8. Weight Logic (Designation Context)

#### 8.1 LTED and Seat Weights

- Each LTED has a total weight provided by BOE (decimals allowed)
  > **[NOT IMPLEMENTED]** No weight field on `CommitteeList` or any model.
- Each LTED has four seats
  > **[PARTIAL - NO TESTS]** The 4-member capacity is enforced in code but seats are not individually modeled. There is no `Seat` table.
- Seat weight = LTED total weight ÷ 4
  > **[NOT IMPLEMENTED]**

#### 8.2 Base Committee

- Base committee consists of petitioned seats only
  > **[NOT IMPLEMENTED]** No petitioned vs. non-petitioned distinction.
- Non-petitioned seats never gain designation weight
  > **[NOT IMPLEMENTED]**
- Base committee structure is immutable for the term
  > **[NOT IMPLEMENTED]**

#### 8.3 Weight Application

- Only occupied, petitioned seats contribute designation weight
  > **[NOT IMPLEMENTED]**
- Vacant weighted seats do not contribute weight
  > **[NOT IMPLEMENTED]**
- Weight is not redistributed
  > **[NOT IMPLEMENTED]**
- Attendance is out of scope for weight calculation
  > **[NOT IMPLEMENTED]** (N/A — weight logic not implemented)

#### 8.4 Appointments

- Appointment into a weighted seat restores that seat's designation weight
  > **[NOT IMPLEMENTED]**
- Appointment into a non-petitioned seat adds no designation weight
  > **[NOT IMPLEMENTED]**

---

### 9. Functional Workflows

#### 9.1 Leader Submission

- Leader submits candidate by VRN or name search
  > **[DONE - TESTED]** `RecordSearchForm.tsx` within `AddCommitteeForm.tsx` allows VRN and name search. Search API tested in `fetchFilteredData.test.ts`.
- System performs live eligibility checks
  > **[PARTIAL - NO TESTS]** Only capacity (4 max) and existing-membership checks. See Section 7.1 for gaps.
- Leader selects LTED; system assigns seat automatically
  > **[PARTIAL - NO TESTS]** Leader selects City/Town → Leg District → Election District via `CommitteeSelector.tsx`. Member is connected to the `CommitteeList` record. **Missing:** No seat assignment — members are linked to the committee, not to a specific seat number.
- Email and phone may be entered (optional but encouraged)
  > **[NOT IMPLEMENTED]** No email/phone entry fields in the committee add/request submission forms. **Planned approach:** Store in `CommitteeMembership.submissionMetadata` as `{ email?: string; phone?: string }`. Not saved to `VoterRecord` — voter import overwrites BOE-sourced fields. Metadata survives imports; display uses `submissionMetadata?.email ?? voterRecord.email`. See SRS_IMPLEMENTATION_ROADMAP.md §2.1a, SRS_GAPS_AND_CONSIDERATIONS.md §5.2, SRS_DATA_MODEL_CHANGES.md.

#### 9.2 Administrative Review

- Admins review warnings and rare overrides
  > **[PARTIAL - NO TESTS]** Admins can accept/reject `CommitteeRequest` records via `POST /api/committee/handleRequest`. `CommitteeUploadDiscrepancies` UI allows reviewing BOE data mismatches. **Missing:** No warning-specific review. No override mechanism.
- Admins enter petition challengers and BOE outcomes
  > **[NOT IMPLEMENTED]** No petition challenger model. BOE outcomes are only discrepancy-level (data mismatches), not eligibility-level.

#### 9.3 Executive Committee Confirmation

- Admin creates meeting record
  > **[NOT IMPLEMENTED]** No meeting record model. `ElectionDate` exists but is for petition form generation, not meeting records.
- Approved submissions are marked Confirmed
  > **[PARTIAL - NO TESTS]** Accepted `CommitteeRequest` records directly add the member to the committee and delete the request. There is no intermediate "Confirmed" status. The request is deleted upon accept/reject.
- Rejected submissions are marked Rejected
  > **[PARTIAL - NO TESTS]** Rejected requests are deleted from the database (not marked as rejected). No history of rejected requests is preserved.

---

### 10. Reports and Outputs

#### 10.1 Leader Reports (v1)

- Current Committee Roster (active members only)
  > **[DONE - NO TESTS]** `ldCommittees` report type generates committee roster as PDF or XLSX. Generated via report-server using `CommitteeReport.tsx` (PDF) or `xlsxGenerator.ts` (XLSX). Configurable fields. No tests in report-server.
- Open Seats (vacancies)
  > **[NOT IMPLEMENTED]** No vacancy-specific report. Roster shows current members but does not highlight empty seats or vacancy counts.
- Sign-in Sheets (by local committee)
  > **[NOT IMPLEMENTED]** No sign-in sheet report type. Committee roster PDF exists but is not formatted as a sign-in sheet.
- Designation Weight Summary (1-page)
  > **[NOT IMPLEMENTED]** No weight data or weight summary report.

#### 10.2 Admin Reports (v1)

- Countywide rosters
  > **[DONE - NO TESTS]** `ldCommittees` report can include all committees. No tests.
- Changes (resignations and removals)
  > **[NOT IMPLEMENTED]** No change tracking report. No resignation/removal history stored.
- Audit log extracts
  > **[NOT IMPLEMENTED]** No audit log.
- Petition and primary outcomes
  > **[NOT IMPLEMENTED]** No petition/primary data.

#### 10.3 Export Formats

- PDF
  > **[DONE - NO TESTS]** Puppeteer-based PDF generation in `report-server/src/utils.ts` (`generatePDFAndUpload`). Used for committee reports and designated petitions.
- CSV / Excel
  > **[DONE - NO TESTS]** XLSX generation via `report-server/src/xlsxGenerator.ts` (`generateUnifiedXLSXAndUpload`). Used for committee and voter list reports. **Note:** CSV not directly supported — only XLSX.

---

### 11. Audit and Security

#### 11.1 Audit Trail

- Immutable log of all changes
  > **[NOT IMPLEMENTED]** No audit log table. No change event recording.
- Records user, role, action, timestamp, and before/after values
  > **[NOT IMPLEMENTED]** Only `createdAt`/`updatedAt` on some models. `Report` tracks `generatedById` and `requestedAt`/`completedAt`. No before/after value tracking for committee changes.

#### 11.2 Access Control

- Role-based authentication
  > **[DONE - TESTED]** NextAuth with Google OAuth (`auth.ts`). `PrivilegeLevel` enum (`Developer`, `Admin`, `RequestAccess`, `ReadAccess`). `withPrivilege()` HOC enforces on all API routes. Invite system for onboarding new users. Auth checks tested across `add.test.ts`, `remove.test.ts`, `requestAdd.test.ts`, `fetchFilteredData.test.ts`, `fetchCommitteeList.test.ts`.
- Jurisdiction-scoped authorization for leaders
  > **[NOT IMPLEMENTED]** All users with sufficient privilege level can access all committees. No per-user jurisdiction assignment. No Town/LD-level access scoping.

---

### 12. Out of Scope / Future Enhancements (V2)

- Leader access to future committee terms
- Executive Committee weighted voting logic
- Digital upload/storage of resignation documents
- Advanced dashboards and analytics

---

## Key User Scenarios & Acceptance Criteria

### Scenario 1: Leader submits a new committee member

**User Story:** As a local committee leader, I want to submit a person for committee membership using their VRN, so that I can quickly confirm eligibility and begin the appointment process.

**Acceptance Criteria:**

- Leader can search by VRN or name
  > **[DONE - TESTED]** `RecordSearchForm` supports VRN (`VRCNUM`) and name search. `fetchFilteredData.test.ts` tests the search API.
- System displays voter details (name, address, Home ED, Assembly District)
  > **[DONE - NO TESTS]** `VoterRecordTable` displays voter details including name, address, election district, assembly district. No component tests.
- System performs live checks:
  - Registered voter
    > **[NOT IMPLEMENTED]**
  - Enrolled Democrat
    > **[NOT IMPLEMENTED]**
  - Correct Assembly District
    > **[NOT IMPLEMENTED]**
  - LTED has available capacity
    > **[DONE - TESTED]** Capacity check (max 4) in `handleRequest/route.ts` and `AddCommitteeForm.tsx` UI.
- Warnings (e.g., inactive voter) are shown but do not block submission
  > **[NOT IMPLEMENTED]** No warning system.
- Leader selects the LTED
  > **[DONE - NO TESTS]** City/Town → Leg District → Election District selection via `CommitteeSelector.tsx`.
- System assigns an available seat automatically
  > **[NOT IMPLEMENTED]** No seat model. Member is linked to committee, not a numbered seat.
- Submission status is set to Submitted
  > **[PARTIAL - TESTED]** `CommitteeRequest` record is created (representing a pending submission). For admin direct-adds, no intermediate "Submitted" status — member is immediately connected. Tested in `requestAdd.test.ts`.
- Submission is visible to MCDC administrators
  > **[DONE - NO TESTS]** `CommitteeRequest` records displayed in `/committees/requests` page via `RequestCard.tsx`. Admin sees pending requests and can accept/reject.

### Scenario 2: Submission fails eligibility checks

**User Story:** As a local committee leader, I want to understand why a submission cannot proceed, so that I can correct the issue or contact MCDC staff.

**Acceptance Criteria:**

- System blocks submission for hard stops (e.g., not enrolled Democrat)
  > **[PARTIAL - NO TESTS]** Only "Committee Full" and "Already in committee" blocks exist in UI. No party/registration/AD checks.
- Clear error message is displayed explaining the failure
  > **[PARTIAL - NO TESTS]** Button text shows: "Already in this committee", "Already in a different committee", "Committee Full". These are inline on the button, not formal error messages.
- Leader is instructed to contact MCDC staff if they believe an exception applies
  > **[NOT IMPLEMENTED]** No contact-staff messaging.
- No record is created unless an admin submits on their behalf
  > **[PARTIAL - TESTED]** For leaders with `RequestAccess`, a `CommitteeRequest` is created (not a direct add). Admin must accept. For full blocks (committee full), UI disables the button. Tested in `requestAdd.test.ts`.

### Scenario 3: Executive Committee confirms a vacancy fill

**User Story:** As MCDC staff, I want to record Executive Committee confirmations, so that committee membership reflects official actions.

**Acceptance Criteria:**

- Admin creates or selects an Executive Committee meeting record
  > **[NOT IMPLEMENTED]** No meeting record model.
- Admin selects submitted candidates approved at that meeting
  > **[PARTIAL - NO TESTS]** Admin can accept individual `CommitteeRequest` records via `/committees/requests` page. Not linked to a meeting.
- System updates status from Submitted to Confirmed
  > **[NOT IMPLEMENTED]** No status field. Accepted request directly adds member and deletes the request.
- Confirmation date and meeting reference are stored
  > **[NOT IMPLEMENTED]**
- Member becomes Active
  > **[PARTIAL - NO TESTS]** Member is connected to committee (implicit "active"). No explicit status transition.
- Seat is marked as occupied
  > **[PARTIAL - NO TESTS]** Committee member count increases. No individual seat tracking.

### Scenario 4: Petitioned member wins or loses a primary

**User Story:** As MCDC staff, I want to record petition and primary outcomes, so that committee membership and designation weight are accurate and explainable.

**Acceptance Criteria:**

- Admin can mark a person as:
  - Petitioned – Won Primary
    > **[NOT IMPLEMENTED]**
  - Petitioned – Lost Primary
    > **[NOT IMPLEMENTED]**
  - Petitioned – Tie
    > **[NOT IMPLEMENTED]**
- Only winners are eligible to become Active committee members
  > **[NOT IMPLEMENTED]**
- Tied seats are marked as weighted but vacant
  > **[NOT IMPLEMENTED]**
- Individuals who lost the primary are retained in history but not added to the committee
  > **[NOT IMPLEMENTED]**
- Reports clearly explain why a person is not on the committee
  > **[NOT IMPLEMENTED]**

### Scenario 5: Committee member resigns

**User Story:** As MCDC staff, I want to record a resignation, so that committee rosters and vacancies remain accurate.

**Acceptance Criteria:**

- Admin records:
  - Date resignation was received
    > **[NOT IMPLEMENTED]**
  - Method received (email or mail)
    > **[NOT IMPLEMENTED]**
- Member status changes to Resigned
  > **[NOT IMPLEMENTED]** Only generic removal (disconnect `committeeId`). No "Resigned" status.
- Seat becomes available for new submissions
  > **[PARTIAL - TESTED]** `POST /api/committee/remove` sets `committeeId = null`, freeing the slot. Tested in `remove.test.ts`. **Note:** This is a generic remove, not resignation-specific.
- Audit log records the action and reason
  > **[NOT IMPLEMENTED]** No audit log.

### Scenario 6: BOE file indicates a member is no longer eligible

**User Story:** As MCDC staff, I want to review BOE-driven eligibility changes, so that removals are accurate and defensible.

**Acceptance Criteria:**

- System flags members affected by BOE updates
  > **[PARTIAL - NO TESTS]** `CommitteeUploadDiscrepancy` model and `CommitteeUploadDiscrepancies.tsx` flag data mismatches (name, address, city, zip) during bulk committee re-upload. **Missing:** Does not flag party changes, registration status changes, or moves out of district from voter file re-imports.
- Admin reviews each case
  > **[DONE - NO TESTS]** `DiscrepanciesActionsMenu.tsx` provides accept/reject per discrepancy. Admin reviews grouped by committee.
- Upon confirmation:
  - Member status changes to Removed
    > **[PARTIAL - NO TESTS]** Accepting a discrepancy can add the member with updated data. Rejecting leaves them off. No "Removed" status recorded.
  - Removal reason is recorded
    > **[NOT IMPLEMENTED]** Discrepancy JSON stores mismatch details but no structured removal reason.
  - Removal appears in the Changes report
    > **[NOT IMPLEMENTED]** No changes report.
  - Seat is freed for future submissions
    > **[PARTIAL - NO TESTS]** If a member is rejected during discrepancy review, the seat remains open.

### Scenario 7: Leader generates reports for a meeting

**User Story:** As a local committee leader, I want to generate meeting materials quickly, so that meetings run smoothly and consistently.

**Acceptance Criteria:**

- Leader can generate:
  - Current committee roster
    > **[DONE - NO TESTS]** `ldCommittees` report type via `POST /api/generateReport`. PDF or XLSX. Configurable fields.
  - Sign-in sheet (active members only)
    > **[NOT IMPLEMENTED]** No sign-in sheet format.
  - Designation weight summary (1 page)
    > **[NOT IMPLEMENTED]** No weight data.
- Reports are scoped to the leader's jurisdiction
  > **[PARTIAL - NO TESTS]** Reports can be scoped by committee selection (city/town, leg district, election district) at generation time. **Missing:** No automatic scoping based on the leader's assigned jurisdiction.
- Reports are exportable as PDF or CSV
  > **[PARTIAL - NO TESTS]** PDF and XLSX export supported. **Missing:** CSV not directly supported (only XLSX).

---

## Glossary of Terms

| Term                            | Definition                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Assembly District (AD)**      | A New York State legislative district used for eligibility validation.                              |
| **Audit Trail**                 | An immutable record of system actions including who performed an action, what changed, and when.    |
| **Base Committee**              | The set of petitioned seats within an LTED that define the maximum designation weight for a term.   |
| **BOE (Board of Elections)**    | The Monroe County Board of Elections, the authoritative source of voter data.                       |
| **Committee Term**              | A defined two-year period for committee membership (e.g., 2024–2026).                               |
| **Designation Weight**          | The weighted vote value used during candidate designation processes.                                |
| **Executive Committee**         | The governing body that confirms vacancy-filled committee members.                                  |
| **Hard Stop**                   | A validation failure that blocks submission (e.g., not an enrolled Democrat).                       |
| **Home ED**                     | The Election District where a voter resides, based on BOE data.                                     |
| **LTED**                        | Legislative/Town Election District code combining LD/Town and ED (e.g., 50052).                     |
| **Petitioned Committee Member** | An individual who gained committee eligibility through the petition and primary process.            |
| **Primary Outcome**             | The result of a primary election determining which petitioned individuals become committee members. |
| **Seat**                        | One of four positions per LTED that may be occupied by a committee member.                          |
| **Serve ED**                    | The Election District where a committee member serves, which may differ from their Home ED.         |
| **Vacancy**                     | An unoccupied committee seat available for appointment.                                             |
| **Warning**                     | A non-blocking validation issue requiring administrative review (e.g., inactive voter).             |
| **Weighted Seat**               | A petitioned seat that contributes designation weight when occupied.                                |

---

## Implementation Summary

### Coverage by Section

| SRS Section             | Status                                                   |
| ----------------------- | -------------------------------------------------------- |
| 1. Introduction / Scope | Partial                                                  |
| 2. Business Objectives  | Partial                                                  |
| 3. Users and Roles      | Partial — roles exist but no jurisdiction scoping        |
| 4. Data Sources         | Partial — CSV import works, no Access DB import          |
| 5. Committee Term Model | **Not Implemented**                                      |
| 6. Membership Lifecycle | Minimal — no statuses, no types, no petition/resignation |
| 7. Validation Rules     | Minimal — only capacity + duplicate checks               |
| 8. Weight Logic         | **Not Implemented**                                      |
| 9. Functional Workflows | Partial — basic add/remove/request exists                |
| 10. Reports and Outputs | Partial — roster reports only                            |
| 11. Audit and Security  | Partial — auth exists, no audit trail                    |
| 12. Out of Scope (V2)   | N/A                                                      |

### Test Coverage Summary

| Area                             | Test Files                                                                         | Status       |
| -------------------------------- | ---------------------------------------------------------------------------------- | ------------ |
| Search API (`fetchFilteredData`) | `fetchFilteredData.test.ts`                                                        | Covered      |
| Committee Add                    | `add.test.ts`                                                                      | Covered      |
| Committee Remove                 | `remove.test.ts`                                                                   | Covered      |
| Committee Request                | `requestAdd.test.ts`                                                               | Covered      |
| Fetch Committee List             | `fetchCommitteeList.test.ts`                                                       | Covered      |
| Search Components                | `VoterRecordSearch.test.tsx`, `SearchRow.test.tsx`, `FieldRenderer.test.tsx`, etc. | Covered      |
| Date Utilities                   | `dateUtils.test.ts`, `dateBoundaries.test.ts`, `dateRangeValueEquality.test.ts`    | Covered      |
| Search Normalizers               | `searchQueryNormalizers.test.ts`, `searchQueryUtilsDateRange.test.ts`              | Covered      |
| Report Generation                | —                                                                                  | **No tests** |
| Voter Import Processor           | —                                                                                  | **No tests** |
| Committee Selector UI            | —                                                                                  | **No tests** |
| Discrepancy Handling             | —                                                                                  | **No tests** |
| handleRequest route              | —                                                                                  | **No tests** |
| Report-server (all)              | —                                                                                  | **No tests** |
