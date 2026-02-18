# SRS Data Model Changes

## Current vs. Proposed Prisma Schema

**February 2026**

This document presents the current data model alongside the proposed data model required to satisfy the SRS. All code is written in Prisma schema syntax. Comments indicate what is new, changed, or removed.

---

## Table of Contents

1. [New Enums](#1-new-enums)
2. [New Models](#2-new-models)
3. [Changed Models](#3-changed-models)
4. [Unchanged Models](#4-unchanged-models-included-for-reference)
5. [Migration Strategy](#5-migration-strategy)

---

## 1. New Enums

These enums do not exist in the current schema.

```prisma
// ============================================================================
// NEW ENUM: Membership status lifecycle
// SRS §6.2 — Tracks a member through the full lifecycle
// ============================================================================
enum MembershipStatus {
  SUBMITTED        // Leader or admin submitted candidate; awaiting confirmation
  REJECTED         // Executive Committee rejected at a meeting — terminal state
  CONFIRMED        // Executive Committee confirmed at a meeting
  ACTIVE           // Fully active committee member
  RESIGNED         // Voluntarily resigned (date + method recorded)
  REMOVED          // Administratively removed (reason recorded)
  PETITIONED_WON   // Won a primary election (becomes ACTIVE)
  PETITIONED_LOST  // Lost a primary election (retained in history only)
  PETITIONED_TIE   // Tied in primary (seat is weighted but vacant)
}

// ============================================================================
// NEW ENUM: Distinguishes how a member gained their seat
// SRS §6.1 — Petitioned vs. Appointed
// ============================================================================
enum MembershipType {
  PETITIONED  // Gained seat through petition/primary process
  APPOINTED   // Filled a vacancy via Executive Committee vote
}

// ============================================================================
// NEW ENUM: Reason a member was administratively removed
// SRS §6.6 — BOE-driven removal reasons
// ============================================================================
enum RemovalReason {
  PARTY_CHANGE          // No longer enrolled in required party
  MOVED_OUT_OF_DISTRICT // No longer resides in correct AD
  INACTIVE_REGISTRATION // Voter registration went inactive
  DECEASED              // Voter is deceased
  OTHER                 // Catch-all with freetext notes
}

// ============================================================================
// NEW ENUM: How a resignation was received
// SRS §6.5 — Required field on resignation
// ============================================================================
enum ResignationMethod {
  EMAIL
  MAIL
}

// ============================================================================
// NEW ENUM: Type of meeting record
// SRS §9.3 — Executive Committee confirmation context
// ============================================================================
enum MeetingType {
  EXECUTIVE_COMMITTEE
  OTHER
}

// ============================================================================
// NEW ENUM: Audit log action types
// SRS §11.1 — Immutable log of all changes
//
// Membership status → AuditAction mapping (CommitteeMembership transitions):
//   SUBMITTED → MEMBER_SUBMITTED | REJECTED → MEMBER_REJECTED
//   CONFIRMED → MEMBER_CONFIRMED | ACTIVE → MEMBER_ACTIVATED
//   RESIGNED → MEMBER_RESIGNED | REMOVED → MEMBER_REMOVED
// ============================================================================
enum AuditAction {
  MEMBER_SUBMITTED
  MEMBER_REJECTED   // SRS §9.3
  MEMBER_CONFIRMED
  MEMBER_ACTIVATED
  MEMBER_RESIGNED
  MEMBER_REMOVED
  PETITION_RECORDED
  MEETING_CREATED
  REPORT_GENERATED
  TERM_CREATED
  JURISDICTION_ASSIGNED
  DISCREPANCY_RESOLVED
}

// ============================================================================
// NEW ENUM: Reasons a voter may be ineligible for committee membership
// SRS §7.1, Admin Override (Gaps 3.1) — Used in validateEligibility responses,
// CommitteeGovernanceConfig.nonOverridableIneligibilityReasons, and AuditLog metadata
// ============================================================================
enum IneligibilityReason {
  NOT_REGISTERED
  PARTY_MISMATCH
  ASSEMBLY_DISTRICT_MISMATCH
  CAPACITY
  ALREADY_IN_ANOTHER_COMMITTEE
}
```

---

## 2. New Models

These models do not exist in the current schema.

```prisma
// ============================================================================
// NEW MODEL: Committee Term
// SRS §5.1 — Terms organize membership into two-year periods
// ============================================================================
model CommitteeTerm {
  id        String   @id @default(cuid())
  label     String   @unique              // e.g. "2024–2026"
  startDate DateTime
  endDate   DateTime
  isActive  Boolean  @default(false)      // Only one term active at a time
  createdAt DateTime @default(now())

  // Relations
  memberships CommitteeMembership[]
  seats       Seat[]
  jurisdictions UserJurisdiction[]
}


// ============================================================================
// NEW MODEL: Committee Governance Config
// SRS Additional Requirements — Configurable eligibility and capacity rules
// Single row per deployment. MCDC seeds: requiredPartyCode="DEM", maxSeatsPerLted=4, requireAssemblyDistrictMatch=true.
// Admin override: nonOverridableIneligibilityReasons is a blacklist; empty = all rules
// overridable. Add IneligibilityReason values to tighten policy over time.
// ============================================================================
model CommitteeGovernanceConfig {
  id                                String               @id @default(cuid())
  requiredPartyCode                 String               // BOE party code: DEM, REP, IND, etc.
  maxSeatsPerLted                   Int                  @default(4)   // Capacity; drives seat creation and eligibility
  requireAssemblyDistrictMatch      Boolean              @default(true) // When true, enforce AD residence per LtedDistrictCrosswalk
  nonOverridableIneligibilityReasons IneligibilityReason[] @default([])  // Reasons that cannot be overridden; empty = all overridable
  updatedAt                         DateTime             @updatedAt
  // Single row for v1; future: org/tenant FK if multi-tenant
}


// ============================================================================
// NEW MODEL: Committee Membership
// SRS §6 — Replaces the VoterRecord.committeeId FK pattern
//
// CURRENT APPROACH:
//   VoterRecord.committeeId -> CommitteeList.id  (binary: in or out)
//   CommitteeRequest (separate table, deleted on accept/reject)
//
// NEW APPROACH:
//   CommitteeMembership is the authoritative record of a member's relationship
//   to a committee. It persists through all status transitions and is never
//   deleted — only status changes. This enables full history and auditability.
// ============================================================================
model CommitteeMembership {
  id              String           @id @default(cuid())

  // Core relationships
  voterRecord     VoterRecord      @relation(fields: [voterRecordId], references: [VRCNUM])
  voterRecordId   String
  committeeList   CommitteeList    @relation(fields: [committeeListId], references: [id])
  committeeListId Int
  term            CommitteeTerm    @relation(fields: [termId], references: [id])
  termId          String

  // Membership classification
  status          MembershipStatus @default(SUBMITTED)
  membershipType  MembershipType?  // Set when confirmed or petition outcome recorded
  seatNumber      Int?             // 1–4, assigned on activation

  // Lifecycle timestamps
  submittedAt     DateTime         @default(now())
  confirmedAt     DateTime?        // Set when status -> CONFIRMED
  activatedAt     DateTime?        // Set when status -> ACTIVE
  resignedAt      DateTime?        // Set when status -> RESIGNED
  removedAt       DateTime?        // Set when status -> REMOVED

  // Rejection metadata (SRS §9.3) — bulk-reject at meeting
  rejectedAt      DateTime?        // Set when status -> REJECTED
  rejectionNote   String?          // Optional reason for rejection

  // Submission metadata
  submittedById   String?          // User who submitted (leader or admin)
  submittedBy     User?            @relation("SubmittedMemberships", fields: [submittedById], references: [id])
  submissionMetadata Json?        // Optional contact overrides from leader: { email?: string; phone?: string }. Not saved to VoterRecord — BOE import overwrites those fields. Display: submissionMetadata?.email ?? voterRecord.email.

  // Confirmation metadata (SRS §9.3)
  meetingRecord   MeetingRecord?   @relation(fields: [meetingRecordId], references: [id])
  meetingRecordId String?

  // Resignation metadata (SRS §6.5)
  resignationDateReceived DateTime?
  resignationMethod       ResignationMethod?

  // Removal metadata (SRS §6.6)
  removalReason   RemovalReason?
  removalNotes    String?

  // Petition metadata (SRS §6.3)
  petitionVoteCount Int?           // Vote count if a primary was held
  petitionPrimaryDate DateTime?

  // Indexes for common queries
  @@unique([voterRecordId, committeeListId, termId])  // One membership per voter per committee per term
  @@index([committeeListId, termId, status])           // Roster queries
  @@index([termId, status])                            // Term-wide queries
  @@index([voterRecordId])                             // Voter history queries
}


// ============================================================================
// NEW MODEL: Seat
// SRS §8.1, §8.2 — Explicit seat model for weight tracking
//
// Each CommitteeList (LTED) has maxSeatsPerLted seats per term (from CommitteeGovernanceConfig; MCDC default: 4).
// Seats track whether they were established via petition (base committee)
// and carry designation weight.
// ============================================================================
model Seat {
  id              String        @id @default(cuid())
  committeeList   CommitteeList @relation(fields: [committeeListId], references: [id])
  committeeListId Int
  term            CommitteeTerm @relation(fields: [termId], references: [id])
  termId          String
  seatNumber      Int           // 1–4

  // Weight (SRS §8)
  isPetitioned    Boolean       @default(false)  // Immutable for the term once set
  weight          Decimal?      // LTED total weight / maxSeatsPerLted — set when LTED weight is known

  @@unique([committeeListId, termId, seatNumber])
  @@index([committeeListId, termId])
}


// ============================================================================
// NEW MODEL: LTED-to-District Crosswalk
// SRS §4.2 — Maps LTED (cityTown, legDistrict, electionDistrict) to districts
// Used for sign-in sheets, meeting logistics, and eligibility validation (§7.1)
// Source: MCDC-provided data.
// ============================================================================
model LtedDistrictCrosswalk {
  id                    String   @id @default(cuid())
  cityTown              String
  legDistrict           Int
  electionDistrict      Int
  stateAssemblyDistrict String
  stateSenateDistrict   String?
  congressionalDistrict String?
  countyLegDistrict     String?

  @@unique([cityTown, legDistrict, electionDistrict])
  @@index([cityTown, legDistrict, electionDistrict])
}


// ============================================================================
// NEW MODEL: Meeting Record
// SRS §9.3 — Executive Committee meeting for confirming vacancy fills
// ============================================================================
model MeetingRecord {
  id          String      @id @default(cuid())
  meetingDate DateTime
  meetingType MeetingType @default(EXECUTIVE_COMMITTEE)
  notes       String?
  createdBy   User        @relation("CreatedMeetings", fields: [createdById], references: [id])
  createdById String
  createdAt   DateTime    @default(now())

  // Members confirmed at this meeting
  memberships CommitteeMembership[]
}


// ============================================================================
// NEW MODEL: User Jurisdiction
// SRS §3.2 — Scopes leader access to specific committees
// ============================================================================
model UserJurisdiction {
  id          String        @id @default(cuid())
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  term        CommitteeTerm @relation(fields: [termId], references: [id])
  termId      String
  cityTown    String
  legDistrict Int?          // Null = all leg districts in this city/town

  @@unique([userId, termId, cityTown, legDistrict])
  @@index([userId, termId])
}


// ============================================================================
// NEW MODEL: Audit Log
// SRS §11.1 — Immutable record of all system changes
// ============================================================================
model AuditLog {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation("AuditLogs", fields: [userId], references: [id])
  userRole    PrivilegeLevel
  action      AuditAction
  entityType  String      // e.g. "CommitteeMembership", "MeetingRecord"
  entityId    String      // ID of the affected record
  timestamp   DateTime    @default(now())
  beforeValue Json?       // Snapshot of record before change
  afterValue  Json?       // Snapshot of record after change
  metadata    Json?       // Additional context (IP, notes, etc.)

  @@index([entityType, entityId])
  @@index([userId])
  @@index([timestamp])
  @@index([action])
}


// ============================================================================
// NEW MODEL: BOE Eligibility Flag
// SRS §6.6 — Replaces the limited CommitteeUploadDiscrepancy model
//
// CURRENT APPROACH:
//   CommitteeUploadDiscrepancy — flags address/name mismatches during
//   bulk committee upload only. Limited to data discrepancies.
//
// NEW APPROACH:
//   BOEEligibilityFlag — generated after any voter file import by comparing
//   active memberships against updated voter data. Catches party changes,
//   district moves, and registration issues — not just data mismatches.
// ============================================================================
model BOEEligibilityFlag {
  id              String              @id @default(cuid())
  membership      CommitteeMembership @relation(fields: [membershipId], references: [id])
  membershipId    String
  voterRecordId   String
  flagReason      RemovalReason       // Reuses the removal reason enum
  details         Json                // Before/after values
  flaggedAt       DateTime            @default(now())
  resolvedAt      DateTime?
  resolvedById    String?
  resolvedBy      User?               @relation("ResolvedFlags", fields: [resolvedById], references: [id])
  resolution      String?             // "confirmed_removal" | "dismissed"

  @@index([membershipId])
  @@index([resolvedAt])                // Null = unresolved (pending review)
}
```

---

## 3. Changed Models

These models exist today and require modifications.

### 3.1 CommitteeList

```prisma
// ============================================================================
// CHANGED MODEL: CommitteeList
// Added: ltedWeight, seats, memberships relations
// Removed: committeeMemberList (VoterRecord[] — replaced by CommitteeMembership)
// Note: District mapping (Assembly, Senate, Congressional, local) via LtedDistrictCrosswalk per SRS §4.2
// ============================================================================
model CommitteeList {
  id               Int       @id @default(autoincrement())
  cityTown         String
  legDistrict      Int
  electionDistrict Int

  // NEW: LTED total weight from BOE (SRS §8.1)
  // Decimals allowed. Seat weight = ltedWeight / maxSeatsPerLted (from CommitteeGovernanceConfig)
  // Source: BOE data import or MCDC admin entry.
  ltedWeight       Decimal?

  // -----------------------------------------------------------------------
  // REMOVED — replaced by CommitteeMembership
  // -----------------------------------------------------------------------
  // committeeMemberList VoterRecord[]           // OLD: direct member list
  // CommitteeRequest    CommitteeRequest[]       // OLD: replaced by membership status

  // -----------------------------------------------------------------------
  // NEW relations
  // -----------------------------------------------------------------------
  memberships               CommitteeMembership[]
  seats                     Seat[]

  // -----------------------------------------------------------------------
  // KEPT (may deprecate CommitteeUploadDiscrepancy after BOEEligibilityFlag)
  // -----------------------------------------------------------------------
  CommitteeDiscrepancyRecords CommitteeUploadDiscrepancy[]

  @@unique([cityTown, legDistrict, electionDistrict])
}
```

### 3.2 VoterRecord

```prisma
// ============================================================================
// CHANGED MODEL: VoterRecord
// Removed: committeeId FK, committee relation, request relations
// Added: memberships relation
//
// REASON: Membership is no longer a single FK on VoterRecord.
// A voter can have multiple memberships across terms (one per term),
// and each carries full lifecycle data.
// ============================================================================
model VoterRecord {
  VRCNUM                     String                @id
  votingRecords              VotingHistoryRecord[]

  // -----------------------------------------------------------------------
  // REMOVED — replaced by CommitteeMembership
  // -----------------------------------------------------------------------
  // committee                  CommitteeList?        @relation(fields: [committeeId], references: [id], onDelete: SetNull)
  // committeeId                Int?
  // addToCommitteeRequest      CommitteeRequest[]    @relation(name: "addToCommitteeRequest")
  // removeFromCommitteeRequest CommitteeRequest[]    @relation(name: "removeFromCommitteeRequest")

  // -----------------------------------------------------------------------
  // NEW relation
  // -----------------------------------------------------------------------
  memberships                CommitteeMembership[]

  // -----------------------------------------------------------------------
  // KEPT as-is
  // -----------------------------------------------------------------------
  addressForCommittee        String?
  latestRecordEntryYear      Int
  latestRecordEntryNumber    Int
  lastName                   String?
  firstName                  String?
  middleInitial              String?
  suffixName                 String?
  houseNum                   Int?
  street                     String?
  apartment                  String?
  halfAddress                String?
  resAddrLine2               String?
  resAddrLine3               String?
  city                       String?
  state                      String?
  zipCode                    String?
  zipSuffix                  String?
  telephone                  String?
  email                      String?
  mailingAddress1            String?
  mailingAddress2            String?
  mailingAddress3            String?
  mailingAddress4            String?
  mailingCity                String?
  mailingState               String?
  mailingZip                 String?
  mailingZipSuffix           String?
  party                      String?
  gender                     String?
  DOB                        DateTime?
  L_T                        String?
  electionDistrict           Int?
  countyLegDistrict          String?
  stateAssmblyDistrict       String?
  stateSenateDistrict        String?
  congressionalDistrict      String?
  CC_WD_Village              String?
  townCode                   String?
  lastUpdate                 DateTime?
  originalRegDate            DateTime?
  statevid                   String?
  hasDiscrepancy             Boolean?
}
```

### 3.3 User

```prisma
// ============================================================================
// CHANGED MODEL: User
// Added: relations for new models (jurisdictions, submitted memberships,
//        created meetings, audit logs, resolved flags)
// ============================================================================
model User {
  id             String          @id @default(cuid())
  name           String?
  email          String          @unique
  emailVerified  DateTime?
  image          String?
  privilegeLevel PrivilegeLevel  @default(ReadAccess)
  accounts       Account[]
  sessions       Session[]
  Authenticator  Authenticator[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  Report    Report[]

  // -----------------------------------------------------------------------
  // NEW relations
  // -----------------------------------------------------------------------
  submittedMemberships CommitteeMembership[]  @relation("SubmittedMemberships")
  createdMeetings      MeetingRecord[]        @relation("CreatedMeetings")
  jurisdictions        UserJurisdiction[]
  auditLogs            AuditLog[]             @relation("AuditLogs")
  resolvedFlags        BOEEligibilityFlag[]   @relation("ResolvedFlags")
}
```

### 3.3a PrivilegeLevel Enum

```prisma
// ============================================================================
// CHANGED ENUM: PrivilegeLevel
// Added: Leader (between Admin and RequestAccess)
// SRS §3.2, Roadmap 3.1 — Distinct role for jurisdiction-scoped committee leaders
//
// Hierarchy (highest to lowest): Developer > Admin > Leader > RequestAccess > ReadAccess
// Leaders: jurisdiction-scoped access; Admins bypass jurisdiction.
// ============================================================================
enum PrivilegeLevel {
  Developer
  Admin
  Leader      // NEW — jurisdiction-scoped committee leaders
  RequestAccess
  ReadAccess
}
```

---

### 3.4 ReportType Enum

```prisma
// ============================================================================
// CHANGED ENUM: ReportType
// Added: SignInSheet, DesignationWeightSummary, VacancyReport, ChangesReport,
//        PetitionOutcomesReport
// ============================================================================
enum ReportType {
  CommitteeReport
  DesignatedPetition
  VoterList
  AbsenteeReport
  VoterImport
  SignInSheet                // NEW — SRS §10.1
  DesignationWeightSummary   // NEW — SRS §10.1
  VacancyReport              // NEW — SRS §10.1
  ChangesReport              // NEW — SRS §10.2
  PetitionOutcomesReport     // NEW — SRS §10.1, §10.2 (Roadmap 3.4)
}
```

---

## 4. Unchanged Models (included for reference)

These models require no changes for SRS compliance:

| Model                 | Notes                                                   |
| --------------------- | ------------------------------------------------------- |
| `Account`             | NextAuth — no changes                                   |
| `Session`             | NextAuth — no changes                                   |
| `PrivilegedUser`      | No changes needed                                       |
| `VerificationToken`   | NextAuth — no changes                                   |
| `Invite`              | No changes needed                                       |
| `Authenticator`       | WebAuthn — no changes                                   |
| `VoterRecordArchive`  | Historical snapshots — no changes                       |
| `VotingHistoryRecord` | Voting history — no changes                             |
| `DropdownLists`       | Search UI dropdowns — no changes                        |
| `ElectionDate`        | Petition form generation — no changes                   |
| `OfficeName`          | Petition form generation — no changes                   |
| `Report`              | No structural changes (new ReportType enum values only) |
| `JobStatus`           | No changes                                              |

---

## 5. Migration Strategy

### 5.1 Models to Deprecate

| Model                        | Replaced By                                   | Migration                                                                                                      |
| ---------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `CommitteeRequest`           | `CommitteeMembership` with status `SUBMITTED` | Migrate pending requests to `CommitteeMembership` records. Delete `CommitteeRequest` table after verification. |
| `CommitteeUploadDiscrepancy` | `BOEEligibilityFlag` (long-term)              | Keep during transition. Deprecate once BOE flagging pipeline is built.                                         |

### 5.2 Fields to Remove from VoterRecord

| Field                        | Replaced By                           | Migration                                                                                                                                          |
| ---------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `committeeId`                | `CommitteeMembership.committeeListId` | Create `CommitteeMembership` record for each voter with non-null `committeeId`, set status `ACTIVE`, assign to default term. Then drop the column. |
| `addToCommitteeRequest`      | `CommitteeMembership`                 | Removed with `CommitteeRequest` deprecation.                                                                                                       |
| `removeFromCommitteeRequest` | `CommitteeMembership`                 | Removed with `CommitteeRequest` deprecation.                                                                                                       |

### 5.3 Suggested Migration Order

```
Step 0: Add Leader to PrivilegeLevel enum (non-breaking; can run before Step 1)
Step 1: Add new enums (non-breaking)
Step 2: Add new models: CommitteeTerm, CommitteeGovernanceConfig, Seat, LtedDistrictCrosswalk, MeetingRecord, AuditLog, UserJurisdiction
Step 3: Add CommitteeMembership model
Step 4: Add BOEEligibilityFlag model
Step 5: Add ltedWeight to CommitteeList; add LtedDistrictCrosswalk model
Step 6: Add new relations to User
Step 7: Add new ReportType enum values
Step 8: DATA MIGRATION — backfill:
        - Create default CommitteeTerm ("2024–2026")
        - Convert VoterRecord.committeeId → CommitteeMembership (status: ACTIVE)
        - Convert pending CommitteeRequests → CommitteeMembership (status: SUBMITTED):
          * Add-only requests: create CommitteeMembership with status SUBMITTED
          * Remove-only requests: create CommitteeMembership for removee with status REMOVED (or handle per business rules)
          * Replacement requests (both add and remove): create two records — (1) REMOVED for removee, (2) SUBMITTED for addee
        - Seed CommitteeGovernanceConfig with MCDC defaults (requiredPartyCode="DEM", maxSeatsPerLted=4, requireAssemblyDistrictMatch=true)
        - Create governanceConfig.maxSeatsPerLted seats per CommitteeList per term (not hardcoded 4)
Step 9: Remove VoterRecord.committeeId (after app code updated)
Step 10: Remove CommitteeRequest model (after app code updated)
```

**Rollback & failure recovery (out of scope):** Formal rollback procedures and transactional backfill are not required. Production data volume is limited and all data can be re-imported from external sources (BOE exports, MCDC files). If Step 8 fails, re-run after restoring from backup or re-importing source data. See [SRS_GAPS_AND_CONSIDERATIONS](SRS_GAPS_AND_CONSIDERATIONS.md) §4.2 (resolved).

### 5.4 Pre-Deprecation Fixes

Before removing `CommitteeRequest`: Fix `committeList` → `committeeList` typo in CommitteeRequest model (Prisma relation name). DB column is already `committeeListId`; ensure Prisma relation field is renamed. Update all code references (e.g., `handleRequest/route.ts`, `requests/page.tsx`). See [CODE_REVIEW_RECOMMENDATIONS.md](../CODEBASE_AUDIT/CODE_REVIEW_RECOMMENDATIONS.md).

### 5.5 Change Summary

| Category          | Count                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New enums         | 6 (`MembershipStatus`, `MembershipType`, `RemovalReason`, `ResignationMethod`, `MeetingType`, `AuditAction`)                                                                    |
| New models        | 9 (`CommitteeTerm`, `CommitteeGovernanceConfig`, `CommitteeMembership`, `Seat`, `LtedDistrictCrosswalk`, `MeetingRecord`, `UserJurisdiction`, `AuditLog`, `BOEEligibilityFlag`) |
| Changed models    | 3 (`CommitteeList`, `VoterRecord`, `User`)                                                                                                                                      |
| Changed enums     | 2 (`PrivilegeLevel`, `ReportType`)                                                                                                                                              |
| Deprecated models | 2 (`CommitteeRequest`, `CommitteeUploadDiscrepancy`)                                                                                                                            |
| Removed fields    | 3 on `VoterRecord` (`committeeId`, 2 request relations)                                                                                                                         |
| Unchanged models  | 13                                                                                                                                                                              |
