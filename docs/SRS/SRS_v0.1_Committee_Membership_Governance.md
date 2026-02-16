DO NOT UPDATE THIS FILE! LEAVE THIS FILE AS IS. IF NEEDED CREATE A NEW FILE

# Software Requirements Specification (SRS)

## MCDC Committee Membership & Governance System

**Version 0.1 – Combined Artifacts + Glossary**
**January 2026**

---

## Executive Summary

The Monroe County Democratic Committee (MCDC) Committee Membership & Governance System is designed to modernize, standardize, and safeguard how County Committee and Local Committee membership is managed.

Today, committee membership is maintained through a combination of Google Forms, manual voter registration checks, and a legacy Access database. This process is time-consuming, error-prone, and dependent on institutional knowledge. As committee leadership changes and election cycles overlap, the risk of inconsistencies, delays, and disputes increases.

This system establishes a single, authoritative source of record for committee membership by integrating official Monroe County Board of Elections (BOE) voter data with structured workflows aligned to New York State Election Law and MCDC bylaws.

### What the system does

At its core, the system allows committee leaders to:

- Submit names for committee membership using a voter registration number (VRN) or name search
- Receive immediate eligibility validation based on official voter data
- View accurate, up-to-date committee rosters and vacancies
- Generate sign-in sheets and designation weight summaries on demand

At the same time, it enables MCDC staff to:

- Review and confirm submissions
- Record Executive Committee confirmations
- Track resignations and BOE-driven removals
- Maintain a full audit trail of all changes
- Manage petition and primary outcomes

### Why this matters

The system is built to support three critical outcomes:

1. **Accuracy and Trust:** Leaders can rely on the data they see. Eligibility rules are applied consistently and transparently, and the source of each decision is documented.
2. **Operational Efficiency:** Manual lookups, spreadsheets, and back-and-forth emails are replaced with real-time validation and self-service reporting.
3. **Defensibility and Compliance:** Every membership decision—petitioned, appointed, resigned, or removed—is traceable, auditable, and aligned with Election Law and MCDC bylaws.

### Key concepts

- Committee Terms modeled explicitly
- Seat-based designation weight
- Petition and primary outcome tracking
- Full audit trail for all actions

This system does not attempt to automate political judgment. Instead, it provides a reliable, transparent framework so leaders and staff can make decisions confidently, with shared facts and clear process.

---

## Software Requirements Specification (SRS v0.1)

### 1. Introduction

#### 1.1 Purpose

This document defines the functional and non-functional requirements for a system to manage County Committee and Local Committee membership for the Monroe County Democratic Committee (MCDC). The system will serve as the authoritative source of record for committee composition, eligibility, vacancies, and designation-related weight calculations, aligned with New York State Election Law and MCDC bylaws.

#### 1.2 Scope

The system will:

- Centralize committee membership data
- Automate eligibility validation using official voter data
- Support petition-based committee formation and vacancy filling
- Provide leaders with self-service access to accurate committee information
- Generate defensible reports for meetings, designation, and audit purposes

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
- Reduce manual validation and data entry errors
- Increase leader trust through transparent, accurate data
- Ensure compliance with NYS Election Law and MCDC bylaws
- Support auditability and historical traceability

#### 2.3 Success Criteria

The system will be considered successful when:

- Leaders can submit a VRN and receive immediate eligibility validation
- Committee rosters and vacancy information are available on demand
- Weight calculations are consistent, explainable, and defensible
- Administrative effort and disputes are materially reduced

---

### 3. Users and Roles

#### 3.1 Administrative Users

**Roles:** County Chair, Executive Director, designated Cabinet Members

**Permissions:**

- Full read/write access
- Submit candidates on behalf of leaders
- Override validation in rare cases
- Record resignations and removals
- Enter petition and primary outcomes
- Generate all countywide reports
- View full audit history

#### 3.2 Local Committee Leaders

**Roles:** Town Chairs, City Legislative District Chairs

**Permissions:**

- Access limited to assigned jurisdiction(s)
- Submit candidates for committee membership
- View current committee roster
- View open seats and designation weight totals
- Generate sign-in sheets and local reports

---

### 4. Data Sources

#### 4.1 Authoritative Voter Data

- **Source:** Monroe County Board of Elections (BOE)
- **Formats:** CSV and Microsoft Access database
- **Update cadence:** On demand; expected monthly
- Treated as the authoritative source for voter eligibility

#### 4.2 District Mapping Data

- LTED-to-district crosswalk table provided by MCDC
- Used for sign-in sheets and meeting logistics
- Includes Assembly, Senate, Congressional, and local districts

---

### 5. Committee Term Model

#### 5.1 Committee Terms

- Committee membership is organized by term (e.g., "2024–2026")
- Each membership record belongs to exactly one term
- Leaders may submit to only one active term at a time (v1)

---

### 6. Committee Membership Lifecycle

#### 6.1 Membership Types

- Petitioned Committee Member
- Appointed (Vacancy-Filled) Committee Member

#### 6.2 Membership Statuses

- Submitted
- Confirmed
- Active
- Resigned
- Removed (with reason)
- Petitioned – Won Primary
- Petitioned – Lost Primary

#### 6.3 Petition Process

- Individuals are petitioned onto the committee per Election Law
- If more than four individuals petition for an LTED, a primary is held
- Top four vote-getters become eligible committee members
- Ties may result in a weighted but vacant seat
- Petition outcomes are manually entered by administrators

#### 6.4 Vacancy Filling

- Vacancies are filled via Executive Committee vote
- Vacancy fills apply only to the current committee term
- Confirmation is recorded against a meeting record

#### 6.5 Resignations

- Submitted directly by the committee member (email or mail)
- Recorded by administrative users
- **Required fields:**
  - Date received
  - Method received
- Resignation frees the seat for new submissions

#### 6.6 Removals (BOE-Driven)

- Triggered automatically when BOE data changes indicate ineligibility
- Require admin review before finalization
- Removal reason is recorded (e.g., party change, moved, inactive, deceased)

---

### 7. Validation Rules

#### 7.1 Hard Stops

Submissions must fail if:

- Individual is not registered to vote
- Individual is not an enrolled Democrat
- Individual does not reside in the correct Assembly District
- LTED already has four active members
- Individual is already an active committee member in another LTED

#### 7.2 Warnings

Warnings allow submission but require review:

- Inactive voter status
- Recent resignation timing
- Potential duplicate submission

---

### 8. Weight Logic (Designation Context)

#### 8.1 LTED and Seat Weights

- Each LTED has a total weight provided by BOE (decimals allowed)
- Each LTED has four seats
- Seat weight = LTED total weight ÷ 4

#### 8.2 Base Committee

- Base committee consists of petitioned seats only
- Non-petitioned seats never gain designation weight
- Base committee structure is immutable for the term

#### 8.3 Weight Application

- Only occupied, petitioned seats contribute designation weight
- Vacant weighted seats do not contribute weight
- Weight is not redistributed
- Attendance is out of scope for weight calculation

#### 8.4 Appointments

- Appointment into a weighted seat restores that seat's designation weight
- Appointment into a non-petitioned seat adds no designation weight

---

### 9. Functional Workflows

#### 9.1 Leader Submission

- Leader submits candidate by VRN or name search
- System performs live eligibility checks
- Leader selects LTED; system assigns seat automatically
- Email and phone may be entered (optional but encouraged)

#### 9.2 Administrative Review

- Admins review warnings and rare overrides
- Admins enter petition challengers and BOE outcomes

#### 9.3 Executive Committee Confirmation

- Admin creates meeting record
- Approved submissions are marked Confirmed
- Rejected submissions are marked Rejected

---

### 10. Reports and Outputs

#### 10.1 Leader Reports (v1)

- Current Committee Roster (active members only)
- Open Seats (vacancies)
- Sign-in Sheets (by local committee)
- Designation Weight Summary (1-page)

#### 10.2 Admin Reports (v1)

- Countywide rosters
- Changes (resignations and removals)
- Audit log extracts
- Petition and primary outcomes

#### 10.3 Export Formats

- PDF
- CSV / Excel

---

### 11. Audit and Security

#### 11.1 Audit Trail

- Immutable log of all changes
- Records user, role, action, timestamp, and before/after values

#### 11.2 Access Control

- Role-based authentication
- Jurisdiction-scoped authorization for leaders

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
- System displays voter details (name, address, Home ED, Assembly District)
- System performs live checks:
  - Registered voter
  - Enrolled Democrat
  - Correct Assembly District
  - LTED has available capacity
- Warnings (e.g., inactive voter) are shown but do not block submission
- Leader selects the LTED
- System assigns an available seat automatically
- Submission status is set to Submitted
- Submission is visible to MCDC administrators

### Scenario 2: Submission fails eligibility checks

**User Story:** As a local committee leader, I want to understand why a submission cannot proceed, so that I can correct the issue or contact MCDC staff.

**Acceptance Criteria:**

- System blocks submission for hard stops (e.g., not enrolled Democrat)
- Clear error message is displayed explaining the failure
- Leader is instructed to contact MCDC staff if they believe an exception applies
- No record is created unless an admin submits on their behalf

### Scenario 3: Executive Committee confirms a vacancy fill

**User Story:** As MCDC staff, I want to record Executive Committee confirmations, so that committee membership reflects official actions.

**Acceptance Criteria:**

- Admin creates or selects an Executive Committee meeting record
- Admin selects submitted candidates approved at that meeting
- System updates status from Submitted to Confirmed
- Confirmation date and meeting reference are stored
- Member becomes Active
- Seat is marked as occupied

### Scenario 4: Petitioned member wins or loses a primary

**User Story:** As MCDC staff, I want to record petition and primary outcomes, so that committee membership and designation weight are accurate and explainable.

**Acceptance Criteria:**

- Admin can mark a person as:
  - Petitioned – Won Primary
  - Petitioned – Lost Primary
  - Petitioned – Tie
- Only winners are eligible to become Active committee members
- Tied seats are marked as weighted but vacant
- Individuals who lost the primary are retained in history but not added to the committee
- Reports clearly explain why a person is not on the committee

### Scenario 5: Committee member resigns

**User Story:** As MCDC staff, I want to record a resignation, so that committee rosters and vacancies remain accurate.

**Acceptance Criteria:**

- Admin records:
  - Date resignation was received
  - Method received (email or mail)
- Member status changes to Resigned
- Seat becomes available for new submissions
- Audit log records the action and reason

### Scenario 6: BOE file indicates a member is no longer eligible

**User Story:** As MCDC staff, I want to review BOE-driven eligibility changes, so that removals are accurate and defensible.

**Acceptance Criteria:**

- System flags members affected by BOE updates
- Admin reviews each case
- Upon confirmation:
  - Member status changes to Removed
  - Removal reason is recorded
  - Removal appears in the Changes report
  - Seat is freed for future submissions

### Scenario 7: Leader generates reports for a meeting

**User Story:** As a local committee leader, I want to generate meeting materials quickly, so that meetings run smoothly and consistently.

**Acceptance Criteria:**

- Leader can generate:
  - Current committee roster
  - Sign-in sheet (active members only)
  - Designation weight summary (1 page)
- Reports are scoped to the leader's jurisdiction
- Reports are exportable as PDF or CSV

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
