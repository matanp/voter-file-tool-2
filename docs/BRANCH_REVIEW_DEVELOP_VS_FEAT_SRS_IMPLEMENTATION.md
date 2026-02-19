# Branch Review: develop vs feat/srs-implementation

**Date:** February 19, 2026  
**Scope:** Analysis of 20 commits ahead of `develop`, diff across 113 files (~8,700 additions, ~2,500 deletions), and alignment with docs/SRS implementation tickets.

---

## Executive Summary

The `feat/srs-implementation` branch delivers **Phase 0 + Phase 1** of the MCDC Committee Membership & Governance system per the SRS Implementation Roadmap. It introduces a new data model (CommitteeTerm, CommitteeMembership, Seat, AuditLog, etc.), migrates all committee flows to that model, and addresses **5 of 7 Phase 1 remediation tickets** (1.R.1, 1.R.2, 1.R.3, 1.R.6, plus partial progress on 1.R.4, 1.R.5, 1.R.7).

**Major accomplishments:**
- Complete Tier 1 foundation (0.1, 1.1, 1.1b, 1.1c, 1.2, 1.3, 1.4, 1.5)
- All three testing tier tickets (T1.1, T1.2, T1.3)
- Admin IA restructure and term management UI
- Four Phase 1 remediation tickets fully resolved
- Substantial progress on bulk import compatibility and source-of-truth unification

**Remaining gaps:** 1.R.4 (bulk import tests), 1.R.5 (source-of-truth tests), 1.R.7 (concurrency tests + docs). Tier 2+ features are not started.

---

## 1. Ticket-by-Ticket Status vs Branch

### 1.1 Tier 0 — Quick Fixes

| Ticket | Title | Ticket Status | Branch Status |
|--------|-------|---------------|---------------|
| 0.1 | Backend enforcement for "Already in Another Committee" | Done | ✅ Implemented in committee routes |

---

### 1.2 Tier 1 — Foundation (Data Model)

| Ticket | Title | Ticket Status | Branch Status |
|--------|-------|---------------|---------------|
| 1.1 | Committee Term Model | Done | ✅ Complete: CommitteeTerm model, termId on CommitteeList, admin TermsManagement UI, active-term filtering |
| 1.1b | LTED-to-Assembly-District Mapping | Done | ✅ LtedDistrictCrosswalk model, migration, seedLtedCrosswalk.ts (2024 LTED Matrix) |
| 1.1c | Committee Governance Config | Done | ✅ CommitteeGovernanceConfig model, IneligibilityReason enum, seed defaults |
| 1.2 | CommitteeMembership Model | Done | ✅ Full model, migration, backfill, all API routes updated |
| 1.3 | Membership Type (Petitioned vs. Appointed) | Done | ✅ MembershipType enum, backfill default APPOINTED |
| 1.4 | Seat Model | Done | ✅ Seat model, ltedWeight on CommitteeList, assignNextAvailableSeat, ensureSeatsExist, updateLtedWeight route, WeightedTableImport |
| 1.5 | Audit Trail Infrastructure | Done | ✅ AuditLog schema, logAuditEvent, immutability guard, wired into committee routes (1.5a→1.5b→1.5c) |

---

### 1.3 Tier 1 — Testing

| Ticket | Title | Ticket Status | Branch Status |
|--------|-------|---------------|---------------|
| T1.1 | handleRequest Route Tests | Done | ✅ Expanded tests (accept, reject, replacement, invalid ID, idempotency) |
| T1.2 | Report Generation API Tests | Done | ✅ generateReport, reportJobs, reports tests updated |
| T1.3 | Committee Discrepancy Handling Tests | Done | ✅ bulkLoadCommittees, handleCommitteeDiscrepancy tests expanded |

---

### 1.4 Tier 1 — Admin IA

| Ticket | Title | Ticket Status | Branch Status |
|--------|-------|---------------|---------------|
| IA-01 | Admin IA v1 spec | Done | ✅ AdminSidebar, config-driven nav, restructured data tabs (AbsenteeReport, VoterImport, WeightedTableImport, ElectionConfigTab) |

---

### 1.5 Phase 1 Remediation

| Ticket | Title | Ticket Status | Branch Status |
|--------|-------|---------------|---------------|
| 1.R.1 | Leader Privilege Escalation (P0) | Ticket: Resolved | ✅ `hasPermissionFor` fixed: Leader added to PRIVILEGE_ORDER between Admin and RequestAccess; unknown roles return false |
| 1.R.2 | requestAdd Resubmission for Non-Active | Resolved | ✅ Resubmission for REJECTED/REMOVED/RESIGNED transitions existing record to SUBMITTED; no duplicate create |
| 1.R.3 | Replacement Flow Not Implemented | Resolved | ✅ handleRequest accept reads `removeMemberId` from submissionMetadata; transitions remove-target to REMOVED in same transaction |
| 1.R.4 | Bulk Import Phase 1 Incompatible | In Progress | ⚠️ Core logic migrated: no deleteMany, CommitteeMembership + Seat via transaction, FOR UPDATE locking; tests not yet added |
| 1.R.5 | Source-of-Truth Split | In Progress | ✅ handleCommitteeDiscrepancy creates CommitteeMembership; report-server fetchCommitteeData + mapCommitteesToReportShape use memberships; test updates pending |
| 1.R.6 | Audit Tests Fail | Resolved | ✅ Jest setup updated; AuditAction available in test env |
| 1.R.7 | Capacity + Seat Non-Atomic | In Progress | ⚠️ add/handleRequest wrapped in transactions with locking; concurrency test and docs pending |

---

### 1.6 Tier 2 — Not Started

Tickets 2.1–2.8 (Eligibility Validation, Warning System, Resignation, Meeting Record, Removal Reasons, Petition Tracking, Weight Logic, BOE Flagging) are **open** and not implemented in this branch. The branch establishes the foundation (1.1–1.5) required for them.

---

## 2. Major Code Changes Summary

### 2.1 Schema & Migrations

- **CommitteeTerm**: `id`, `label`, `startDate`, `endDate`, `isActive`
- **CommitteeMembership**: full lifecycle model with `MembershipStatus`, `MembershipType`, `seatNumber`, timestamps, `submissionMetadata`
- **Seat**: `committeeListId`, `termId`, `seatNumber`, `isPetitioned`, `weight`
- **LtedDistrictCrosswalk**: LTED → Assembly/Senate/Congressional district mapping
- **CommitteeGovernanceConfig**: `requiredPartyCode`, `maxSeatsPerLted`, `requireAssemblyDistrictMatch`, `nonOverridableIneligibilityReasons`
- **AuditLog**: `action` (AuditAction enum), `entityType`, `entityId`, `beforeValue`, `afterValue`, `metadata`
- **CommitteeList**: added `termId`, `ltedWeight`; unique key now `cityTown_legDistrict_electionDistrict_termId`
- **VoterRecord.committeeId**: retained for backwards compatibility but deprecated; no longer written by Phase 1 routes

### 2.2 API Routes Updated

| Route | Changes |
|-------|---------|
| `committee/add` | Creates CommitteeMembership, uses ensureSeatsExist + assignNextAvailableSeat, transaction with locking |
| `committee/remove` | Sets CommitteeMembership.status=REMOVED, removalReason, seatNumber=null |
| `committee/requestAdd` | Creates/updates CommitteeMembership (SUBMITTED), supports resubmission for non-active |
| `committee/handleRequest` | Transitions SUBMITTED→ACTIVE/REJECTED, replacement flow (remove target + activate add), transaction |
| `fetchCommitteeList` | Filters by active term, reads memberships instead of committeeMemberList |
| `handleCommitteeDiscrepancy` | Creates CommitteeMembership instead of connecting committeeMemberList |
| `bulkLoadCommittees` | Per-committee transaction, CommitteeMembership creation, Seat assignment, FOR UPDATE lock |
| New: `admin/terms`, `admin/terms/[id]` | CRUD for CommitteeTerm |
| New: `admin/weightedTable/import` | Bulk LTED weight import from Excel |
| New: `committee/updateLtedWeight` | Set ltedWeight on CommitteeList, recompute Seat weights |

### 2.3 Report-Server

- **committeeMappingHelpers.ts**: `fetchCommitteeData` queries `memberships` (status=ACTIVE, term-filtered) instead of `committeeMemberList`
- **CommitteeWithMembers**: `memberships: (CommitteeMembership & { voterRecord })[ ]` replaces `committeeMemberList`
- **mapCommitteesToReportShape**: uses `committee.memberships` for member list

### 2.4 Frontend Components

- **CommitteeSelector**: term-scoped member query, LTED weight input, seat roster display
- **AdminSidebar**: config-driven nav (adminNav.ts)
- **Admin data**: AbsenteeReport, VoterImport, WeightedTableImport, ElectionConfigTab; SpecialReports removed/refactored
- **TermsManagement**: list, create term, set active

### 2.5 New Utilities & Lib

- **seatUtils.ts**: `assignNextAvailableSeat`, `ensureSeatsExist`, `recomputeSeatWeights`
- **auditLog.ts**: `logAuditEvent` with action enum
- **auditLogGuard.ts**: immutability guard for AuditLog
- **committeeValidation.ts**: `getActiveTermId`, `getGovernanceConfig`, capacity/duplicate checks
- **testUtils.ts**: expanded typed matchers for Prisma mocks (expectMembershipCreate, expectMembershipUpdate, etc.)

---

## 3. Remaining Work (Per Tickets)

### 3.1 Phase 1 Remediation — Incomplete Items

| Ticket | Missing Work |
|--------|--------------|
| 1.R.4 | Add/update bulk import tests: assert CommitteeMembership creation, no committeeId writes; document migration path if committeeId was populated |
| 1.R.5 | Update fetchCommitteeList, handleCommitteeDiscrepancy, report-generation tests to assert CommitteeMembership as source |
| 1.R.7 | Add concurrency test (N requests exceeding capacity → exactly maxSeats succeed); document transaction boundaries and isolation |

### 3.2 Ticket README vs Ticket Files

The tickets README lists 1.R.1 as **Open** (P0), but the ticket file `1.R.1-leader-privilege-escalation.md` shows **Status: Resolved** and all acceptance criteria checked. The branch implements the fix (`Leader` in PRIVILEGE_ORDER, fail-closed for unknown roles). **Recommendation:** Update README to mark 1.R.1 as Resolved.

---

## 4. Documentation Created/Updated

- **SRS_IMPLEMENTATION_ROADMAP.md**: Phase 1 follow-up section, remediation ticket references
- **PHASE1_SCOPE_CHECK_NOTES.md**: Assumptions and scope-check summary
- **tickets/README.md**: Full ticket index, dependency graph, remediation status
- **Individual tickets**: 1.1–1.5, 1.R.1–1.R.7, 2.1–2.8, T1.1–T1.3
- **CODEBASE_AUDIT_ANALYSIS.md**: Cross-validation of audit findings against codebase
- **COMMITTEE_REQUEST_TYPO_FIX.md**: Plan for Prisma relation rename (committeList → committeeList)

---

## 5. Test Coverage Changes

- **New test files**: `auditLog.test.ts`, `auditLogImmutability.test.ts`, `seatUtils.test.ts`, `utils.test.ts`, `committeeMappingHelpers.test.ts`
- **Refactored tests**: add, remove, requestAdd, handleRequest, handleCommitteeDiscrepancy, bulkLoadCommittees, generateReport, reports, reportJobs, fetchCommitteeList — all updated for CommitteeMembership and new schemas
- **testUtils.ts**: New matchers (`expectMembershipCreate`, `expectMembershipUpdate`, etc.) per .cursorrules

---

## 6. Risk and Dependency Notes

1. **VoterRecord.committeeId** is deprecated but still present. Report-server and fetchCommitteeList no longer rely on it; only legacy paths might. Full removal is deferred to ticket 3.0.
2. **CommitteeRequest.committList** typo: Relation name in schema; DB column is correct (`committeeListId`). See COMMITTEE_REQUEST_TYPO_FIX.md.
3. **Bulk import**: Now Phase 1–compatible but tests are missing; recommend adding before production use.
4. **Concurrency**: Transactions and locking added; formal concurrency test not yet written.
5. **Tier 2 blockers**: 2.1 Eligibility Validation, 2.2 Warnings, etc. are unblocked by this branch’s foundation.

---

## 7. Commit Timeline (High Level)

1. Admin sidebar + config-driven nav  
2. CommitteeGovernanceConfig, CommitteeTerm, LtedDistrictCrosswalk  
3. CommitteeMembership model, migration, backfill, route updates  
4. MembershipType, Seat model, audit infrastructure (1.5a/b/c)  
5. Scope check notes, remediation tickets, roadmap updates  
6. Phase 1 remediation: 1.R.2, 1.R.3, 1.R.6, advances on 1.R.4, 1.R.5, 1.R.7  
7. Tests: handleRequest, report generation, discrepancy handling, audit, utils, seatUtils, committeeMappingHelpers  

---

## 8. Recommendations

1. **Merge readiness**: Core Phase 1 is implemented and tested. Remaining items (1.R.4/1.R.5/1.R.7 tests and docs) are important for production confidence but not blocking for staging.
2. **README sync**: Update tickets/README.md so 1.R.1 status matches the ticket file (Resolved).
3. **Post-merge**: Prioritize 1.R.4 tests, then 1.R.7 concurrency test; 1.R.5 test updates can follow.
4. **Tier 2 planning**: With Phase 1 foundation complete, schedule 2.1 Eligibility Validation as the next major feature.

---

## Appendix: Files Changed (by category)

**Schema/Migrations:** schema.prisma, 8 migrations, seed.ts, seedLtedCrosswalk.ts  
**API routes:** committee/add, remove, requestAdd, handleRequest, fetchCommitteeList, handleCommitteeDiscrepancy, bulkLoadCommittees, terms, weightedTable/import, updateLtedWeight  
**Lib/Utils:** utils.ts, auditLog.ts, auditLogGuard.ts, seatUtils.ts, committeeValidation.ts, prisma.ts  
**Admin UI:** AdminSidebar, layout, AdminDataClient, AbsenteeReport, VoterImport, WeightedTableImport, ElectionConfigTab, TermsManagement  
**Committee UI:** CommitteeSelector, AddCommitteeForm, CommitteeRequestForm, RequestCard, requests page  
**Report-server:** committeeMappingHelpers.ts  
**Tests:** 15+ test files updated or added  
**Docs:** SRS tickets, roadmap, phase notes, codebase audit  
