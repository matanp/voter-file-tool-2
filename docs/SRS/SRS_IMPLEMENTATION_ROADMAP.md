# SRS Implementation Roadmap

## MCDC Committee Membership & Governance System

**Based on gap analysis of SRS v0.1 vs. current codebase**
**February 2026**

---

## How to Read This Document

Work items are organized into **tiers by effort/complexity**, then sequenced within each tier by **dependency order** (items that unblock other items come first). Each item includes:

- **SRS Ref** — sections it addresses
- **Effort** — estimated scope
- **Depends on** — prerequisite items
- **What exists today** — current state to build from
- **What to build** — concrete deliverables

---

## Implementation Tickets

Implementation work is tracked in [tickets/](tickets/README.md). Each ticket provides acceptance criteria and links back to the roadmap. Phase 0 and Phase 1 foundation work (0.1, 1.1–1.5) are done, and the full Phase 1 remediation set (1.R.1–1.R.12) is now resolved. Next implementation queue starts at [2.1 Eligibility Validation](tickets/2.1-eligibility-validation.md). See [tickets/README.md §Phase 1 Remediation](tickets/README.md) for ticket-level status and [PHASE1_FINALIZATION.md](PHASE1_FINALIZATION.md) for closeout criteria.

---

## Tier 0 — Quick Fixes

These items can be done immediately with the current schema. They close correctness gaps before the full migration.

---

### 0.1 Backend Enforcement for "Already in Another Committee" — **Done**

|                |                                                                                    |
| -------------- | ---------------------------------------------------------------------------------- |
| **Ticket**     | [0.1 Backend enforcement](tickets/0.1-backend-enforcement-already-in-committee.md) |
| **SRS Ref**    | §7.1                                                                               |
| **Effort**     | Small (0.5–1 day)                                                                  |
| **Depends on** | Nothing                                                                            |
| **Priority**   | High — can be done immediately with current schema                                 |

**What exists today:** UI disables "Add" when `record.committeeId` is set. Backend does not enforce.

**What to build:**

1. In `POST /api/committee/add`: Before connect, check if voter has `committeeId` set to a different committee; if so, return 400 with structured error.
2. In `POST /api/committee/requestAdd`: Same check before creating CommitteeRequest.
3. In `POST /api/committee/handleRequest` (accept flow): Same check before connecting (replacement requests already handle remove-then-add; ensure add path rejects if voter is in another committee and this is not a replacement).
4. Add/update tests in `add.test.ts`, `requestAdd.test.ts`; add `handleRequest.test.ts` if not yet present.

---

## Tier 1 — Foundation (Data Model Changes)

These items restructure the core data model. Almost everything else depends on them. They should be implemented first, in order.

**Migration execution:** No separate cutover work item. Run migrations per [SRS_DATA_MODEL_CHANGES](SRS_DATA_MODEL_CHANGES.md) §5.3 (steps 1–10 in order). Backfill and schema changes are embedded in Tier 1 items.

---

### 1.1 Committee Term Model — **Done**

|                |                                                                       |
| -------------- | --------------------------------------------------------------------- |
| **Ticket**     | [1.1 Committee Term Model](tickets/1.1-committee-term-model.md)       |
| **SRS Ref**    | §5.1                                                                  |
| **Effort**     | Medium (3–5 days)                                                     |
| **Depends on** | Nothing                                                               |
| **Priority**   | Critical — unblocks membership lifecycle, weight logic, and reporting |

**What exists today:**
`CommitteeList` has `cityTown`, `legDistrict`, `electionDistrict`. No term field. Membership is implicitly "current."

**What to build:**

1. New `CommitteeTerm` model: `id`, `label` (e.g., "2024–2026"), `startDate`, `endDate`, `isActive`
2. Add `termId` FK to `CommitteeList` (or create a new `CommitteeMembership` join model — see 1.3)
3. Migration to backfill existing data into a default term
4. Update all committee queries to filter by active term
5. Admin UI to create/manage terms
6. Ensure leaders can only submit to the active term (v1)

---

### 1.1b LTED-to-Assembly-District Mapping — **Done**

|                |                                                                        |
| -------------- | ---------------------------------------------------------------------- |
| **Ticket**     | [1.1b LTED→AD Mapping](tickets/1.1b-lted-assembly-district-mapping.md) |
| **SRS Ref**    | §4.2, §7.1                                                             |
| **Effort**     | Small–Medium (1–2 days)                                                |
| **Depends on** | Nothing (or 1.1 if term affects crosswalk)                             |
| **Priority**   | Critical — required for eligibility validation AD hard stop            |

**What exists today:** No LTED→Assembly District mapping. `CommitteeList` has no AD field. SRS §4.2 describes "LTED-to-district crosswalk table provided by MCDC."

**What to build:**

1. Create `LtedDistrictCrosswalk` model per SRS §4.2 — LTED-to-district crosswalk table with Assembly, Senate, Congressional, and local districts (see Data Model doc).
2. Migration/seed to populate from MCDC-provided data.
3. Admin UI or import path to load/update crosswalk data.
4. Eligibility validation (2.1) will use this for AD hard stop.

---

### 1.1c Committee Governance Config — **Done**

|                |                                                                                 |
| -------------- | ------------------------------------------------------------------------------- |
| **Ticket**     | [1.1c Committee Governance Config](tickets/1.1c-committee-governance-config.md) |
| **SRS Ref**    | Additional Requirements doc                                                     |
| **Effort**     | Small (0.5–1 day)                                                               |
| **Depends on** | Nothing                                                                         |
| **Priority**   | Critical — unblocks 2.1, 1.4                                                    |

**What exists today:** No governance config. Party (DEM), capacity (4), and AD check are hardcoded.

**What to build:**

1. New `CommitteeGovernanceConfig` model (see Data Model doc): `requiredPartyCode`, `maxSeatsPerLted`, `requireAssemblyDistrictMatch`, `nonOverridableIneligibilityReasons: IneligibilityReason[]` (seed default `[]`). Add `IneligibilityReason` enum.
2. Migration + seed row for MCDC defaults (`requiredPartyCode="DEM"`, `maxSeatsPerLted=4`, `requireAssemblyDistrictMatch=true`)
3. Eligibility validation (2.1), capacity checks, and seat creation (1.4) read from this config

---

### 1.2 Membership Status Enum + CommitteeMembership Model — **Done**

|                |                                                                            |
| -------------- | -------------------------------------------------------------------------- |
| **Ticket**     | [1.2 CommitteeMembership Model](tickets/1.2-committee-membership-model.md) |
| **SRS Ref**    | §6.2                                                                       |
| **Effort**     | Medium (3–5 days)                                                          |
| **Depends on** | 1.1 (Term Model)                                                           |
| **Priority**   | Critical — unblocks all lifecycle workflows                                |

**What exists today:**
Membership is binary: voter has `committeeId` (in committee) or `null` (not). `CommitteeRequest` is a separate table that gets deleted on accept/reject. No status field.

**What to build:**

1. New `MembershipStatus` Prisma enum — see [SRS_DATA_MODEL_CHANGES](SRS_DATA_MODEL_CHANGES.md) §1 for full enum (includes petition statuses: `PETITIONED_WON`, `PETITIONED_LOST`, `PETITIONED_TIE`)
2. New `CommitteeMembership` model (replaces the `VoterRecord.committeeId` FK pattern):
   - `id`, `voterRecordId`, `committeeListId`, `termId`, `status`, `membershipType` (see 1.3), `seatNumber` (see 1.4)
   - `submittedAt`, `confirmedAt`, `activatedAt`, `resignedAt`, `removedAt`, `rejectedAt`
   - `removalReason`, `resignationMethod`, `resignationDateReceived`
   - `meetingRecordId` (nullable, see 2.4)
   - `submissionMetadata` (Json?, optional contact: `{ email?: string; phone?: string }` — see 2.1a, SRS §9.1)
3. Migrate existing `VoterRecord.committeeId` relationships into `CommitteeMembership` records with status `ACTIVE`
4. Rework `CommitteeRequest` to set status to `SUBMITTED` instead of creating a separate record (or keep `CommitteeRequest` and transition to `CommitteeMembership` on accept)
5. Update all API routes: `committee/add`, `committee/remove`, `committee/requestAdd`, `committee/handleRequest`
6. Update `CommitteeSelector.tsx` and `AddCommitteeForm.tsx` to work with new model
7. Preserve rejected/resigned/removed records for history (do not delete)

---

### 1.3 Membership Type (Petitioned vs. Appointed) — **Done**

|                |                                  |
| -------------- | -------------------------------- |
| **SRS Ref**    | §6.1, §6.3                       |
| **Effort**     | Small (1–2 days)                 |
| **Depends on** | 1.2 (Membership Status)          |
| **Priority**   | High — required for weight logic |

**What exists today:**
No distinction between petitioned and appointed members.

**What to build:**

1. New `MembershipType` enum: `PETITIONED`, `APPOINTED`
2. Add `membershipType` field to `CommitteeMembership` (from 1.2)
3. Default existing records to `APPOINTED` (or a migration-specific value) since petition history is unknown
4. Admin UI to set type when adding a member or recording petition outcomes

---

### 1.4 Seat Model — **Done**

|                |                                                                               |
| -------------- | ----------------------------------------------------------------------------- |
| **SRS Ref**    | §8.1, §8.2                                                                    |
| **Effort**     | Medium (3–5 days)                                                             |
| **Depends on** | 1.1 (Term Model), 1.1c (Committee Governance Config), 1.2 (Membership Status) |
| **Priority**   | High — required for weight logic and vacancy tracking                         |

**What exists today:**
4-member capacity enforced in code (`>= 4` checks). No individual seat modeling. No weight data.

**What to build:**

1. Each `CommitteeList` + `CommitteeTerm` combination has `governanceConfig.maxSeatsPerLted` seats (conceptual or explicit; MCDC default: 4)
2. Option A — explicit `Seat` model: `id`, `committeeListId`, `termId`, `seatNumber` (1 to maxSeatsPerLted), `isPetitioned` (boolean, immutable for term), `weight` (Decimal)
3. Option B — seat number on `CommitteeMembership`: `seatNumber` (1 to maxSeatsPerLted) field, with `isPetitioned` and `weight` derived from petition data
4. Store LTED total weight (from BOE) on `CommitteeList` or a term-specific junction. **Open question:** Confirm whether BOE voter/committee export includes weight, or if it requires a separate MCDC upload. If unknown, support admin manual entry as fallback.
5. Compute `seatWeight = ltedTotalWeight / governanceConfig.maxSeatsPerLted`
6. Mark seats as petitioned when petition outcomes are recorded (immutable for the term)

---

### 1.5 Audit Trail Infrastructure — **Done**

|                |                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------- |
| **SRS Ref**    | §11.1                                                                                          |
| **Effort**     | Medium (3–5 days)                                                                              |
| **Depends on** | Nothing (but benefits from all other models being stable)                                      |
| **Priority**   | High — ideally in place before building new workflows so all changes are logged from the start |

**What exists today:**
Only `createdAt`/`updatedAt` timestamps. No action logging.

**What to build:**

1. New `AuditLog` model: `id`, `userId`, `userRole`, `action` (enum: `MEMBER_ADDED`, `MEMBER_REMOVED`, `MEMBER_RESIGNED`, `STATUS_CHANGED`, `PETITION_RECORDED`, `REPORT_GENERATED`, etc.), `entityType`, `entityId`, `timestamp`, `beforeValue` (JSON), `afterValue` (JSON), `metadata` (JSON)
2. Utility function `logAuditEvent(userId, action, entity, before, after)` used across all mutation endpoints
3. Immutable — no update/delete operations on this table
4. Index on `entityType + entityId`, `userId`, `timestamp`
5. Admin UI: filterable audit log viewer (Phase 2, see 3.5)

**Recommendation:** Implement the model and utility early (Tier 1), build the admin UI later (Tier 3).

---

## Phase 1 Remediation — Bugs / Gaps from Scope Check

These tickets addressed issues found during a full scope check of Phase 1 completion. They are now resolved and retained here for traceability.

| Ticket                                                          | Title                                                              | Priority      | Effort    |
| --------------------------------------------------------------- | ------------------------------------------------------------------ | ------------- | --------- |
| [1.R.1](tickets/1.R.1-leader-privilege-escalation.md)           | Leader Privilege Escalation                                        | P0 (Critical) | 0.5 day   |
| [1.R.2](tickets/1.R.2-requestAdd-resubmission-non-active.md)    | requestAdd Resubmission for Non-Active Memberships                 | P1            | 0.5–1 day |
| [1.R.3](tickets/1.R.3-replacement-flow-not-implemented.md)      | Replacement Flow Not Implemented in handleRequest                  | P1            | 1–2 days  |
| [1.R.4](tickets/1.R.4-bulk-import-phase1-incompatible.md)       | Bulk Import Incompatible with Phase 1 Schema                       | P1            | 2–3 days  |
| [1.R.5](tickets/1.R.5-source-of-truth-split.md)                 | Source-of-Truth Split (committeeMemberList vs CommitteeMembership) | P1            | 2–3 days  |
| [1.R.6](tickets/1.R.6-audit-tests-fail.md)                      | Audit Tests Fail (AuditAction Undefined)                           | P2            | 0.5 day   |
| [1.R.7](tickets/1.R.7-capacity-seat-assignment-non-atomic.md)   | Capacity + Seat Assignment Non-Atomic (Race Risk)                  | P2            | 1–2 days  |
| [1.R.8](tickets/1.R.8-phase1-remediation-closeout.md)           | Phase 1 Remediation Closeout (Tests + Docs)                        | P1            | 1–2 days  |
| [1.R.9](tickets/1.R.9-formdata-support-for-use-api-mutation.md) | FormData Support for useApiMutation                                | P2            | 1–2 days  |
| [1.R.10](tickets/1.R.10-update-lted-weight-atomic-recompute.md) | updateLtedWeight Atomicity for Weight Recompute                    | P2            | 1 day     |
| [1.R.11](tickets/1.R.11-admin-get-hook-standardization.md)      | Admin GET Data Hook Standardization                                | P3            | 0.5–1 day |
| [1.R.12](tickets/1.R.12-drop-redundant-lted-crosswalk-index.md) | Drop Redundant LTED Crosswalk Index                                | P3            | 0.5 day   |

**Recommended execution order:** [1.R.1](tickets/1.R.1-leader-privilege-escalation.md), then [1.R.2](tickets/1.R.2-requestAdd-resubmission-non-active.md) + [1.R.3](tickets/1.R.3-replacement-flow-not-implemented.md), then [1.R.4](tickets/1.R.4-bulk-import-phase1-incompatible.md), then [1.R.5](tickets/1.R.5-source-of-truth-split.md), then [1.R.6](tickets/1.R.6-audit-tests-fail.md) + [1.R.7](tickets/1.R.7-capacity-seat-assignment-non-atomic.md), then [1.R.8](tickets/1.R.8-phase1-remediation-closeout.md), then [1.R.10](tickets/1.R.10-update-lted-weight-atomic-recompute.md) + [1.R.9](tickets/1.R.9-formdata-support-for-use-api-mutation.md), with [1.R.11](tickets/1.R.11-admin-get-hook-standardization.md) and [1.R.12](tickets/1.R.12-drop-redundant-lted-crosswalk-index.md) as low-priority cleanup.

See [tickets/README.md §Phase 1 Remediation](tickets/README.md) and [PHASE1_FINALIZATION.md](PHASE1_FINALIZATION.md) for closeout scope details.

---

## Tier 2 — Core Business Logic

These items implement the SRS business rules on top of the Tier 1 foundation.

---

### 2.1 Eligibility Validation (Hard Stops)

|                |                                                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **SRS Ref**    | §7.1                                                                                                                                                                                 |
| **Effort**     | Small–Medium (2–3 days)                                                                                                                                                              |
| **Depends on** | 1.1c (Committee Governance Config), 1.2 (Membership Status) for "already active in another LTED" backend check; 1.1b (LTED→AD mapping) for Assembly District validation when enabled |
| **Priority**   | High — core correctness requirement                                                                                                                                                  |

**What exists today:**

- LTED capacity (max 4) — done, tested
- Already in this committee (idempotent) — done, tested
- Already in another committee — backend-enforced (Tier 0 done), uses `CommitteeMembership`-based check

**What to build:**

1. Server-side validation service/utility (e.g., `validateEligibility(voterRecordId, committeeListId)`) returning `{ eligible: boolean, hardStops: string[], warnings: string[] }`. Service reads `CommitteeGovernanceConfig` (singleton).
2. Checks to add:
   - `VoterRecord` exists in database (registered voter proxy)
   - `VoterRecord.party === governanceConfig.requiredPartyCode` (not hardcoded `'DEM'`)
   - If `governanceConfig.requireAssemblyDistrictMatch`: `VoterRecord.stateAssmblyDistrict` matches the target committee's Assembly District via `LtedDistrictCrosswalk` (requires 1.1b); otherwise skip
   - Target LTED has < `governanceConfig.maxSeatsPerLted` active members (not hardcoded 4)
   - Voter does not have `committeeId` pointing to a different committee (backend enforcement — also addressed in Tier 0 quick fix for current schema); with new model: voter does not have an active `CommitteeMembership` in another LTED for the same term
3. Call this service from `committee/add`, `committee/requestAdd`, and `committee/handleRequest` routes
4. Return structured error response with specific failure reasons
5. Update `AddCommitteeForm.tsx` to display server-returned hard stop messages
6. **Admin override:** See [SRS_IMPLEMENTATION_ADMIN_OVERRIDE.md](SRS_IMPLEMENTATION_ADMIN_OVERRIDE.md). Single `forceAdd` + required `overrideReason`; configurable `nonOverridableIneligibilityReasons`; UX shows display-only checklist of bypassed rules; audit logs `bypassedReasons` + `overrideReason`.

---

### 2.1a Email/Phone During Leader Submission (SRS §9.1, Gaps 5.2)

|                |                                                                       |
| -------------- | --------------------------------------------------------------------- |
| **SRS Ref**    | §9.1                                                                  |
| **Effort**     | Small (0.5–1 day)                                                     |
| **Depends on** | 1.2 (Membership Status) — CommitteeMembership with submissionMetadata |
| **Priority**   | Medium                                                                |

**What exists today:** No email/phone entry in add/request forms. `VoterRecord` has `email` and `telephone` from BOE, but not editable during submission.

**What to build:**

1. Add optional email and phone fields to `AddCommitteeForm.tsx` and the request-add flow
2. Store in `CommitteeMembership.submissionMetadata` as `{ email?: string; phone?: string }`. Do _not_ save to `VoterRecord` — voter import overwrites BOE-sourced fields; metadata survives imports
3. Validate with Zod (email format if provided)
4. Display logic for rosters/sign-in sheets: `submissionMetadata?.email ?? voterRecord.email` (same for phone)
5. API: accept optional `email`, `phone` in `committee/add` and `committee/requestAdd`; persist to `submissionMetadata` when creating CommitteeMembership/CommitteeRequest (migrated request flow stores in membership record on accept)

See SRS_DATA_MODEL_CHANGES.md CommitteeMembership model, SRS_GAPS_AND_CONSIDERATIONS.md §5.2.

---

### 2.2 Warning System

|                |                              |
| -------------- | ---------------------------- |
| **SRS Ref**    | §7.2                         |
| **Effort**     | Small (1–2 days)             |
| **Depends on** | 2.1 (Eligibility Validation) |
| **Priority**   | Medium                       |

**What exists today:**
No warning system.

**What to build:**

1. Extend the eligibility service from 2.1 to return warnings (non-blocking):
   - Inactive voter status (if a `voterStatus` field is available or can be derived from BOE data). **Open question:** Confirm BOE CSV/export has a voter status (or similar) field for inactive check. If not available, document as deferred and skip inactive-voter warning in v1.
   - Recent resignation: voter had a `CommitteeMembership` with status `RESIGNED` within the last N days
   - Potential duplicate: voter already has a `SUBMITTED` membership for another LTED
2. UI: display warnings in `AddCommitteeForm.tsx` as yellow banners; allow submission to proceed
3. Warnings stored on the `CommitteeMembership` record or in audit log metadata

---

### 2.3 Resignation Workflow

|                |                              |
| -------------- | ---------------------------- |
| **SRS Ref**    | §6.5, Scenario 5             |
| **Effort**     | Small (2–3 days)             |
| **Depends on** | 1.2 (Membership Status)      |
| **Priority**   | High — core operational need |

**What exists today:**
`POST /api/committee/remove` disconnects `committeeId`. No resignation-specific data captured.

**What to build:**

1. New admin action: "Record Resignation" (distinct from generic remove)
2. Fields on `CommitteeMembership`: `resignationDateReceived`, `resignationMethod` (enum: `EMAIL`, `MAIL`)
3. Sets status to `RESIGNED`
4. Seat becomes available (can be filled via vacancy process)
5. Admin form in UI to capture resignation details
6. Log to audit trail

---

### 2.4 Meeting Record Model & Executive Committee Confirmation

|                |                         |
| -------------- | ----------------------- |
| **SRS Ref**    | §6.4, §9.3, Scenario 3  |
| **Effort**     | Medium (3–5 days)       |
| **Depends on** | 1.2 (Membership Status) |
| **Priority**   | Medium-High             |

**What exists today:**
`CommitteeRequest` accept/reject deletes the request and directly connects the member. No meeting reference. `ElectionDate` model exists but is unrelated.

**What to build:**

1. New `MeetingRecord` model: `id`, `meetingDate`, `meetingType` (e.g., `EXECUTIVE_COMMITTEE`), `notes`, `createdBy`, `createdAt`
2. Add `meetingRecordId` FK to `CommitteeMembership`
3. Admin workflow:
   - Create meeting record
   - Select pending submissions (`SUBMITTED` status) to be confirmed at that meeting
   - Bulk-confirm: status transitions `SUBMITTED` → `CONFIRMED` → `ACTIVE`; assign seat via `assignNextAvailableSeat(committeeListId, termId)` when activating
   - Bulk-reject: transition `SUBMITTED` → `REJECTED`; set `rejectedAt` and optional `rejectionNote`; log `MEMBER_REJECTED` to audit trail
4. Seat assignment: Add helper `assignNextAvailableSeat(committeeListId, termId): number` — queries existing ACTIVE memberships for that committee+term, returns smallest unused seat (1-based, in [1, maxSeatsPerLted]). Call from `committee/add`, `committee/handleRequest` (accept path), and 2.6 petition-winner flow.
5. Store confirmation date and meeting reference
6. UI: meeting management page under `/admin`
7. Log all confirmations and rejections to audit trail

---

### 2.5 Structured Removal with Reasons

|                |                         |
| -------------- | ----------------------- |
| **SRS Ref**    | §6.6, Scenario 6        |
| **Effort**     | Small (1–2 days)        |
| **Depends on** | 1.2 (Membership Status) |
| **Priority**   | Medium-High             |

**What exists today:**
`POST /api/committee/remove` sets `committeeId = null`. No reason captured. Discrepancy detection during bulk upload exists but is limited.

**What to build:**

1. `RemovalReason` enum: `PARTY_CHANGE`, `MOVED_OUT_OF_DISTRICT`, `INACTIVE_REGISTRATION`, `DECEASED`, `OTHER`
2. Fields on `CommitteeMembership`: `removalReason`, `removalNotes`
3. Sets status to `REMOVED`
4. Admin form to select reason when removing a member
5. Log to audit trail with before/after values

---

### 2.6 Petition & Primary Outcome Tracking

|                |                                                                  |
| -------------- | ---------------------------------------------------------------- |
| **SRS Ref**    | §6.3, Scenario 4                                                 |
| **Effort**     | Large (5–8 days)                                                 |
| **Depends on** | 1.2 (Membership Status), 1.3 (Membership Type), 1.4 (Seat Model) |
| **Priority**   | Medium — needed for weight logic correctness                     |

**What exists today:**
No petition tracking. `DesignatedPetition` report type exists but generates blank petition form PDFs, not outcome recording.

**What to build:**

1. New `PetitionOutcome` enum: `WON_PRIMARY`, `LOST_PRIMARY`, `TIE`, `UNOPPOSED`
2. New `PetitionRecord` model (or fields on `CommitteeMembership`): `petitionOutcome`, `voteCount`, `primaryDate`
3. Admin workflow:
   - Enter petition challengers for an LTED
   - Record primary results (vote counts, winners/losers/ties)
   - Winners → `CommitteeMembership` with type `PETITIONED`, status `ACTIVE`
   - Losers → `CommitteeMembership` with type `PETITIONED`, status `PETITIONED_LOST` (retained in history)
   - Ties → seat marked as weighted but vacant
4. Mark petitioned seats on the Seat model (immutable for term, sets base committee)
5. Admin UI: petition outcome entry page
6. Log all outcomes to audit trail

---

### 2.7 Weight / Designation Logic

|                |                                                                 |
| -------------- | --------------------------------------------------------------- |
| **SRS Ref**    | §8 (all subsections)                                            |
| **Effort**     | Medium (3–5 days)                                               |
| **Depends on** | 1.4 (Seat Model), 2.6 (Petition Tracking)                       |
| **Priority**   | Medium — essential for designation but not for daily operations |

**What exists today:**
No weight fields, no calculation logic.

**What to build:**

1. Store LTED total weight (from BOE data import or admin entry)
2. Compute seat weight = total weight / governanceConfig.maxSeatsPerLted
3. Business rules:
   - Only occupied, petitioned seats contribute weight
   - Vacant petitioned seats contribute zero (not redistributed)
   - Appointed members in petitioned seats restore that seat's weight
   - Appointed members in non-petitioned seats add no weight
4. Weight calculation utility: `calculateDesignationWeight(committeeListId, termId)` → `{ totalWeight, seats: { seatNumber, weight, isPetitioned, isOccupied, contributes }[] }`
5. Expose via API for report generation and UI display
6. Admin can view/verify weight calculations

---

### 2.8 BOE-Driven Automatic Eligibility Flagging

|                |                                                                              |
| -------------- | ---------------------------------------------------------------------------- |
| **SRS Ref**    | §6.6, Scenario 6                                                             |
| **Effort**     | Medium (3–5 days)                                                            |
| **Depends on** | 1.2 (Membership Status), 2.1 (Eligibility Validation), 2.5 (Removal Reasons) |
| **Priority**   | Medium                                                                       |

**What exists today:**
`CommitteeUploadDiscrepancy` flags name/address/city/zip mismatches during bulk committee upload. Does not detect party changes, registration status changes, or moves.

**What to build:**

1. Post-voter-import comparison job: after a BOE file is imported, compare all active `CommitteeMembership` records against updated `VoterRecord` data
2. Flag members where:
   - `party` no longer matches `governanceConfig.requiredPartyCode`
   - `stateAssmblyDistrict` changed (moved out of AD)
   - Voter record no longer exists (purged/deceased)
   - Registration status changed to inactive (if field available)
3. Create pending review queue (new model or extend `CommitteeUploadDiscrepancy`)
4. Admin reviews flagged members and confirms/dismisses each
5. Confirmed removals set status to `REMOVED` with appropriate reason
6. Log all to audit trail

**Integration (triggers):**

- **Auto after import:** In report-server, immediately after successful `processVoterImport()`, enqueue a new job type `boeEligibilityFlagging` on the same worker queue. The job creates its own Report record and runs asynchronously. No runtime feature toggle—runs after every BOE import. Implement this through a centralized internal orchestration map (for example: `voterImport -> boeEligibilityFlagging`) that can be injected/overridden in tests to decouple job chaining.
- **Manual:** Admin "Run eligibility check" action (button/API) to re-run without re-importing (e.g., after governance config changes or data fixes).

---

## Tier 3 — Workflows, Reports & Access Control

These items build on top of the Tier 1+2 foundation to complete the SRS.

---

### 3.0 Report-server: Migrate ldCommittees to CommitteeMembership

|                |                                                       |
| -------------- | ----------------------------------------------------- |
| **SRS Ref**    | §10.1                                                 |
| **Effort**     | Small (1–2 days)                                      |
| **Depends on** | 1.2 (Membership Status / CommitteeMembership model)   |
| **Priority**   | Critical — required for roster report after migration |

**What exists today:**
ldCommittees report uses `committeeMemberList` (VoterRecord.committeeId) via `fetchCommitteeData()` and `mapCommitteesToReportShape()` in report-server.

**What to build:**

1. Rewrite `fetchCommitteeData()` to query `CommitteeList` with `memberships` where `status = ACTIVE` (include `voterRecord` for each membership)
2. Update `CommitteeWithMembers` type and `mapCommitteesToReportShape()` to consume `memberships` instead of `committeeMemberList`
3. Verify ldCommittees PDF and XLSX output unchanged after migration
4. Update shared-validators types if `committeeMemberList` appears in report schemas

---

### 3.0a Audit and Update All Reports for CommitteeMembership

|                |                                                          |
| -------------- | -------------------------------------------------------- |
| **SRS Ref**    | Gap 2.1                                                  |
| **Effort**     | Small (included in 3.0 for ldCommittees; checklist only) |
| **Depends on** | 1.2 (Membership Status)                                  |
| **Priority**   | Critical — ensure no report breaks after migration       |

**Per-report checklist:**

| Report             | Uses committee membership?                    | Migration needed? | Covered by |
| ------------------ | --------------------------------------------- | ----------------- | ---------- |
| ldCommittees       | Yes — fetchCommitteeData, committeeMemberList | Yes               | 3.0        |
| designatedPetition | No — form payload only                        | No                | N/A        |
| voterList          | No                                            | No                | N/A        |
| absenteeReport     | No                                            | No                | N/A        |
| voterImport        | No                                            | No                | N/A        |

**ldCommittees update checklist (3.0):**

- [ ] `fetchCommitteeData()` — query memberships where status = ACTIVE
- [ ] `mapCommitteesToReportShape()` — consume memberships instead of committeeMemberList
- [ ] `CommitteeWithMembers` type — update in report-server and shared-validators
- [ ] PDF path (CommitteeReport.tsx, utils.ts) — verify unchanged output
- [ ] XLSX path (xlsxGenerator.ts) — verify unchanged output

---

### 3.1 Jurisdiction-Scoped Access for Leaders

|                |                                                |
| -------------- | ---------------------------------------------- |
| **SRS Ref**    | §3.2, Scenario 7                               |
| **Effort**     | Medium (3–5 days)                              |
| **Depends on** | 1.1 (Term Model)                               |
| **Priority**   | Medium — important for multi-leader deployment |

**What exists today:**
`PrivilegeLevel` enum (Developer, Admin, RequestAccess, ReadAccess). All users with sufficient privilege see all committees. Leaders currently use `RequestAccess`; privilege semantics are unclear.

**Privilege level design (implement first):**

- Add `Leader` to `PrivilegeLevel` enum, ordered between Admin and RequestAccess.
- Hierarchy: Developer > Admin > Leader > RequestAccess > ReadAccess.
- Leaders = `Leader` level. Admins = `Admin` (bypass jurisdiction). `RequestAccess` = invited, not yet assigned jurisdictions (or deprecated for new invites).
- Add helpers: `isLeader(privilegeLevel)` and `bypassesJurisdiction(privilegeLevel)` for consistent checks.

**What to build:**

1. Add `Leader` to `PrivilegeLevel` enum (schema + migration).
2. New `UserJurisdiction` model: `userId`, `cityTown`, `legDistrict` (nullable), `termId`
3. **Admin UI for assigning jurisdictions to users:** Page or section under `/admin` (e.g., `/admin/users` or user management) where admins can select a Leader user and assign one or more jurisdictions (cityTown + legDistrict per term). Include add/remove jurisdiction, term selection, and validation.
4. Middleware/utility: `getUserJurisdictions(userId)` returns scoped filters.
5. Apply jurisdiction filter to:
   - `fetchCommitteeList` — require `Leader` (was `Admin`); leaders only see their committees once jurisdictions exist
   - `committee/requestAdd` — require `Leader`; leaders can only submit to their jurisdiction
   - Report generation — auto-scope to jurisdiction
6. Admins bypass jurisdiction filter (see all).
7. UI: show only assigned committees in `CommitteeSelector`.
8. **Leader with no jurisdictions:** Show empty committee list and "Contact admin to get assigned" (or equivalent).

**Extension path (future flexibility):**

| If you need later…        | Change required                                    |
| ------------------------- | -------------------------------------------------- |
| Read-only leaders         | Add `ReadOnlyLeader`; restrict submit/request APIs |
| Report-only users         | Add `ReportAccess` or similar; gate report APIs    |
| Different admin sub-roles | Evaluate then — may still not need RBAC            |

Adding new privilege levels requires: new enum value, update to permission-order array, a few route-level checks. No new tables or RBAC.

---

### 3.1a CommitteeSelector: Basic Vacancy and Weight Display

|                |                                                                    |
| -------------- | ------------------------------------------------------------------ |
| **SRS Ref**    | §3.2                                                               |
| **Effort**     | Small (0.5–1 day)                                                  |
| **Depends on** | 1.2 (Membership Status) for vacancy; 2.7 (Weight Logic) for weight |
| **Priority**   | Medium — satisfies in-app view of open seats and weight            |

**What exists today:** CommitteeSelector shows member cards only. Vacancy is implicit (fewer than 4 members). No weight data.

**What to build:**

1. When a committee (LTED) is selected, display summary: vacancy count (e.g., "2 open seats" or "Full") and designation weight total (once 2.7 exists)
2. Wire to `CommitteeMembership` counts and `calculateDesignationWeight()` output
3. Minimal UI change — small summary block in existing flow; no redesign

**Note:** Full CommitteeSelector redesign (table view, filters, multi-LTED overview) is documented in Future Considerations. This basic display satisfies SRS §3.2 and must be preserved in that redesign.

---

### 3.2 Sign-In Sheet Report

|                |                                               |
| -------------- | --------------------------------------------- |
| **SRS Ref**    | §10.1, Scenario 7                             |
| **Effort**     | Small (2–3 days)                              |
| **Depends on** | None (can use existing report infrastructure) |
| **Priority**   | Medium-High — needed for meetings             |

**What exists today:**
`ldCommittees` report generates roster PDF/XLSX. No sign-in sheet format.

**What to build:**

1. New report type or variant: `signInSheet`
2. PDF layout: committee header, list of active members with blank signature column, date field
3. Group by local committee (City/Town + LD if applicable)
4. Use existing report-server PDF generation pipeline (Puppeteer + React component)
5. Add to frontend report generation UI

---

### 3.3 Designation Weight Summary Report

|                |                         |
| -------------- | ----------------------- |
| **SRS Ref**    | §10.1, Scenario 7       |
| **Effort**     | Small–Medium (2–4 days) |
| **Depends on** | 2.7 (Weight Logic)      |
| **Priority**   | Medium                  |

**What to build:**

1. New report type: `designationWeightSummary`
2. 1-page PDF: lists each LTED, total weight, seats (petitioned/non-petitioned, occupied/vacant), contributing weight
3. Totals row at bottom
4. Scope by jurisdiction or countywide
5. Add to frontend report generation UI

---

### 3.4 Vacancy, Changes & Petition Outcomes Reports

|                |                                                                                    |
| -------------- | ---------------------------------------------------------------------------------- |
| **SRS Ref**    | §10.1, §10.2                                                                       |
| **Effort**     | Small (2–3 days each)                                                              |
| **Depends on** | 1.2 (Membership Status), 1.4 (Seat Model); Petition Outcomes Report depends on 2.6 |
| **Priority**   | Medium                                                                             |

**What to build:**

1. **Vacancy Report:** List all LTEDs with open seats, showing seat count, petitioned vs. non-petitioned, and current members
2. **Changes Report:** List all status changes within a date range — resignations, removals, new adds — with dates and reasons. Includes petition-driven status changes (WON_PRIMARY→ACTIVE, LOST_PRIMARY→PETITIONED_LOST, etc.) once 2.6 Petition Tracking is implemented.
3. **Petition Outcomes Report:** LTED-level summary of petition/primary results — challengers per LTED, vote counts, primary date, outcomes (won/lost/tie/unopposed). Election-centric view complementing the Changes Report. Depends on 2.6 (Petition & Primary Outcome Tracking).
4. All reports as PDF and XLSX via existing report pipeline
5. Admin access for countywide; leader access scoped to jurisdiction

---

### 3.5 Audit Trail UI & Export

|                |                                  |
| -------------- | -------------------------------- |
| **SRS Ref**    | §11.1, §10.2                     |
| **Effort**     | Medium (3–5 days)                |
| **Depends on** | 1.5 (Audit Trail Infrastructure) |
| **Priority**   | Medium                           |

**What to build:**

1. Admin page: `/admin/audit`
2. Filterable table: by user, action type, entity, date range
3. Detail view showing before/after values
4. Export as CSV/XLSX
5. Read-only — no edit/delete capabilities

---

## Implementation Sequence Summary

```
Phase 0: Quick Fixes — Done
└── 0.1 Backend enforcement — [ticket](tickets/0.1-backend-enforcement-already-in-committee.md) Done

Phase 1: Foundation — Done
├── 1.1 Committee Term Model — [ticket](tickets/1.1-committee-term-model.md) Done
├── 1.1b LTED-to-Assembly-District Mapping — [ticket](tickets/1.1b-lted-assembly-district-mapping.md) Done
├── 1.1c Committee Governance Config — [ticket](tickets/1.1c-committee-governance-config.md) Done
├── 1.2 Membership Status Enum + CommitteeMembership model Done
├── 1.3 Membership Type (Petitioned vs. Appointed) Done
├── 1.4 Seat Model Done
└── 1.5 Audit Trail Infrastructure Done

Phase 1 Follow-Up: Remediation (Done; historical execution order)
├── 1.R.1 Leader Privilege Escalation (P0)
├── 1.R.2 requestAdd Resubmission for Non-Active Memberships
├── 1.R.3 Replacement Flow Not Implemented in handleRequest
├── 1.R.4 Bulk Import Incompatible with Phase 1 Schema
├── 1.R.5 Source-of-Truth Split (committeeMemberList vs CommitteeMembership)
├── 1.R.6 Audit Tests Fail (AuditAction Undefined)
├── 1.R.7 Capacity + Seat Assignment Non-Atomic (Race Risk)
├── 1.R.8 Phase 1 Remediation Closeout (Tests + Docs)
├── 1.R.9 FormData Support for useApiMutation
├── 1.R.10 updateLtedWeight Atomicity for Weight Recompute
├── 1.R.11 Admin GET Data Hook Standardization
└── 1.R.12 Drop Redundant LTED Crosswalk Index

Phase 1.1 — Pre–Phase 2 gate (recommended)
└── Address [PHASE1_CODE_REVIEW_FINDINGS.md](PHASE1_CODE_REVIEW_FINDINGS.md): fix 4 P1 findings + add/expand tests before starting 2.1

Phase 2: Core Business Logic (current queue)
├── 2.1 Eligibility Validation (Hard Stops)
├── 2.1a Email/Phone During Leader Submission (SRS §9.1)
├── 2.2 Warning System
├── 2.3 Resignation Workflow
├── 2.4 Meeting Record + Confirmation Workflow
├── 2.5 Structured Removal with Reasons
├── 2.6 Petition & Primary Outcome Tracking
├── 2.7 Weight / Designation Logic
└── 2.8 BOE-Driven Eligibility Flagging

Phase 3: Workflows, Reports & Access
├── 3.0 Report-server: Migrate ldCommittees to CommitteeMembership
├── 3.0a Audit and update all reports for CommitteeMembership
├── 3.1 Jurisdiction-Scoped Access
├── 3.1a CommitteeSelector: Basic vacancy and weight display
├── 3.2 Sign-In Sheet Report
├── 3.3 Designation Weight Summary Report
├── 3.4 Vacancy, Changes & Petition Outcomes Reports
└── 3.5 Audit Trail UI & Export
```

**Total estimated effort:** 11–16 weeks for one developer, depending on iteration speed and review cycles (includes Phase 1 follow-up remediation tickets 1.R.1–1.R.12).

---

## Future Considerations / Post-v1

Items below are out of scope for the governance migration but should be planned for a later phase.

### Microsoft Access Database Import

|              |                                            |
| ------------ | ------------------------------------------ |
| **SRS Ref**  | §4.1                                       |
| **v1 Scope** | Out of scope — v1 supports CSV import only |

SRS §4.1 lists "CSV and Microsoft Access database" as voter data formats. v1 implements CSV import only. Future work options:

1. Add an Access reader library (e.g., `mdb-tools`, `node-adodb`) to import `.mdb`/`.accdb` files directly
2. Require pre-conversion: users export Access data to CSV before importing

See [EXTENSIBILITY_ANALYSIS.md](../EXTENSIBILITY_ANALYSIS.md) for effort estimates (rated Medium).

---

### CommitteeSelector Redesign

|                  |                                                               |
| ---------------- | ------------------------------------------------------------- |
| **Scope**        | Full UX redesign — separate project from governance migration |
| **Must include** | Vacancy count, weight totals, multi-LTED overview at a glance |

**What to build:**

1. Table-based UI with filters (city, leg district, election district, vacancy status)
2. Multi-LTED overview — see many committees at once with key metrics
3. Inline vacancy count and designation weight per row
4. Improved navigation and data density

The basic vacancy/weight display added in 3.1a satisfies SRS §3.2 and must be preserved when this redesign is implemented.

---

### CommitteeGovernanceConfig Admin UI

|              |                                               |
| ------------ | --------------------------------------------- |
| **Gap Ref**  | 2.3                                           |
| **v1 Scope** | Out of scope — config via seed/migration only |

v1 uses `CommitteeGovernanceConfig` with seed data for MCDC defaults (`requiredPartyCode`, `maxSeatsPerLted`, `requireAssemblyDistrictMatch`). No admin UI to edit at runtime. If multi-tenant deployment or config changes are needed in a future phase, add a small admin config-editing UI.

---

### Operational (Post-v1)

| Item                   | Action                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Performance**        | Verify indexes in Data Model §5 sufficient for large roster queries and report generation at scale; add performance testing if needed.           |
| **Monitoring**         | Consider alerts for report-server job failures, BOE import/flagging job failures. Audit log size monitoring optional.                            |
| **User documentation** | Basic user guides (leaders: reports, submission flow; admins: confirmation, removals, petition outcomes). May be lightweight (in-app help, FAQ). |
| **Accessibility**      | If compliance required, plan accessibility audit for new workflows (meeting confirmation, petition entry, etc.).                                 |

---

## Part 2: Testing Gap Remediation Plan

This section addresses the testing gaps identified in the SRS working document. Items are organized by priority: first stabilize what exists today, then add tests alongside new feature work.

---

## Testing Tier 1 — Existing Code Without Tests (High Priority)

These are features that are already shipping to users with zero automated test coverage. Bugs here cause real issues.

---

### T1.1 `handleRequest` Route ✅ Done

|                  |                                                                       |
| ---------------- | --------------------------------------------------------------------- |
| **Ticket**       | [T1.1 handleRequest tests](tickets/T1.1-handleRequest-route-tests.md) |
| **Effort**       | Small (0.5–1 day)                                                     |
| **Risk**         | High — this is the accept/reject workflow for committee requests      |
| **File to test** | `apps/frontend/src/app/api/committee/handleRequest/route.ts`          |

**Pre-migration fix:** Fix `CommitteeRequest.committList` schema typo (missing 't') before or during CommitteeRequest deprecation. Rename relation to `committeeList` and column to `committeeListId` if not already correct. See [CODE_REVIEW_RECOMMENDATIONS.md](../CODEBASE_AUDIT/CODE_REVIEW_RECOMMENDATIONS.md).

**What to cover:**

1. Authentication and authorization (Admin only)
2. Accept flow: member gets connected, request deleted, capacity check (>= maxSeatsPerLted rejection)
3. Reject flow: request deleted, no member change
4. Replacement flow (remove + add in one request)
5. Invalid request ID (404)
6. Already-processed request (idempotency)

**Pattern:** Follow existing test patterns in `add.test.ts` and `remove.test.ts`.

---

### T1.2 Report Generation API Route ✅ Done

|                  |                                                                                 |
| ---------------- | ------------------------------------------------------------------------------- |
| **Ticket**       | [T1.2 Report generation API tests](tickets/T1.2-report-generation-api-tests.md) |
| **Effort**       | Medium (1–2 days)                                                               |
| **Risk**         | Medium — report failures are user-visible                                       |
| **File to test** | `apps/frontend/src/app/api/generateReport/route.ts`                             |

**What to cover:**

1. Authentication and authorization (RequestAccess+)
2. Validation of each report type schema (`ldCommittees`, `voterList`, `designatedPetition`)
3. Report record creation in database
4. Job submission to report-server (mock the fetch call)
5. Status transitions: PENDING → PROCESSING, PENDING → FAILED on error
6. Error handling: report-server unreachable, invalid response

---

### T1.3 Committee Discrepancy Handling ✅ Done

|                   |                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Ticket**        | [T1.3 Committee discrepancy handling tests](tickets/T1.3-discrepancy-handling-tests.md)                                              |
| **Effort**        | Medium (1–2 days)                                                                                                                    |
| **Risk**          | Medium — data integrity during BOE updates                                                                                           |
| **Files to test** | `apps/frontend/src/app/api/admin/bulkLoadCommittees/route.ts`, `apps/frontend/src/app/api/admin/handleCommitteeDiscrepancy/route.ts` |

**What to cover:**

1. Bulk load: discrepancy detection and storage
2. Handle discrepancy: accept adds member with updated data, reject skips
3. Authentication (Admin only)
4. Edge cases: no discrepancies, all discrepancies, voter not found

---

### T1.4 Voter Import Processor

|                   |                                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| **Effort**        | Medium (2–3 days)                                                                                              |
| **Risk**          | High — incorrect imports corrupt the authoritative voter data                                                  |
| **Files to test** | `packages/voter-import-processor/src/voterRecordProcessor.ts`, `parseVoterFile.ts`, `dropdownListProcessor.ts` |

**What to cover:**

1. CSV parsing: valid file, malformed rows, missing columns, encoding
2. Record transformation: string-to-date conversion, field mapping
3. Bulk save: create vs. update logic, newer-record detection
4. Dropdown list extraction and save
5. Batch processing: buffered writes, large file handling
6. Cleanup: existing archive records deleted correctly

**Note:** This package has no test infrastructure. Will need a `jest.config` or `vitest.config` and mock Prisma client.

---

### T1.5 Report-Server Core

|                   |                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| **Effort**        | Large (3–5 days)                                                                                |
| **Risk**          | Medium — report generation is complex but failures are recoverable                              |
| **Files to test** | `apps/report-server/src/index.ts`, `committeeMappingHelpers.ts`, `xlsxGenerator.ts`, `utils.ts` |

**What to cover:**

1. Job queue: request validation, concurrency limiting, queue ordering
2. Committee data mapping: `mapVoterRecordToMember`, `mapCommitteesToReportShape`
3. XLSX generation: column configuration, data formatting, worksheet creation
4. PDF generation: HTML generation for committee reports and petitions (mock Puppeteer)
5. Webhook callback: signature creation, payload format
6. S3 utilities: upload/download (mock S3 client)

**Note:** Report-server has no test infrastructure at all. Will need Jest/Vitest setup, plus mocks for Prisma, Puppeteer, and S3.

---

## Testing Tier 2 — UI Components Without Tests (Medium Priority)

These are user-facing components that work today but could break silently during refactoring.

---

### T2.1 CommitteeSelector Component

|            |                                                          |
| ---------- | -------------------------------------------------------- |
| **Effort** | Medium (1–2 days)                                        |
| **File**   | `apps/frontend/src/app/committees/CommitteeSelector.tsx` |

**What to cover:**

1. City selection → leg district dropdown → election district dropdown cascade
2. Committee member list rendering
3. Add member flow (admin vs. request-access branching)
4. Remove member flow
5. Empty states: no committees, no members, permission denied
6. Loading states

---

### T2.2 AddCommitteeForm Component

|            |                                                         |
| ---------- | ------------------------------------------------------- |
| **Effort** | Small (1 day)                                           |
| **File**   | `apps/frontend/src/app/committees/AddCommitteeForm.tsx` |

**What to cover:**

1. Search integration (renders RecordSearchForm)
2. Capacity enforcement: button disabled when committee full
3. Duplicate detection: "Already in this committee" / "Already in a different committee"
4. Admin direct-add vs. RequestAccess request flow
5. Loading states during API calls

---

### T2.3 CommitteeRequestForm & RequestCard

|            |                                               |
| ---------- | --------------------------------------------- |
| **Effort** | Small (1 day)                                 |
| **Files**  | `CommitteeRequestForm.tsx`, `RequestCard.tsx` |

**What to cover:**

1. Request creation with add/remove member
2. Notes field validation (max 1000 chars)
3. RequestCard display and accept/reject actions

---

### T2.4 Report Generation Forms

|            |                                                  |
| ---------- | ------------------------------------------------ |
| **Effort** | Small (1 day)                                    |
| **Files**  | `XLSXConfigForm.tsx`, `GeneratePetitionForm.tsx` |

**What to cover:**

1. Field selection and validation
2. Form submission and API call
3. Report status tracking display

---

## Testing Tier 3 — Tests for New Feature Work (Ongoing)

As each Tier 1/2 implementation item is built, tests should be written alongside. This section defines the testing expectations for each new feature.

---

### T3.1 Committee Term Model Tests

| Follows    | 1.1                      |
| ---------- | ------------------------ |
| **Effort** | Included in 1.1 estimate |

- Model creation/validation
- Active term filtering
- Migration correctness (existing data backfilled)

---

### T3.2 Membership Lifecycle Tests

| Follows    | 1.2, 2.3, 2.4, 2.5               |
| ---------- | -------------------------------- |
| **Effort** | Included in each item's estimate |

- Status transitions: SUBMITTED → CONFIRMED → ACTIVE
- Rejection: SUBMITTED → REJECTED (terminal)
- Resignation: ACTIVE → RESIGNED
- Removal: ACTIVE → REMOVED (with reason)
- Invalid transitions rejected
- History preservation (no deletions)

---

### T3.3 Eligibility Validation Tests

| Follows    | 2.1, 2.2                     |
| ---------- | ---------------------------- |
| **Effort** | Included in 2.1/2.2 estimate |

- Each hard stop individually
- All hard stops combined
- Warning generation (non-blocking)
- Edge cases: voter not in DB, party field null, AD field null

---

### T3.4 Weight Calculation Tests

| Follows    | 2.7                      |
| ---------- | ------------------------ |
| **Effort** | Included in 2.7 estimate |

- Basic: 4 petitioned, all occupied → full weight
- Vacant petitioned seat → zero contribution (not redistributed)
- Appointed in petitioned seat → weight restored
- Appointed in non-petitioned seat → no weight
- Mixed scenarios: some petitioned occupied, some vacant, some appointed
- Decimal weight precision

---

### T3.5 Petition Outcome Tests

| Follows    | 2.6                      |
| ---------- | ------------------------ |
| **Effort** | Included in 2.6 estimate |

- Won/Lost/Tie/Unopposed outcome recording
- Tie → weighted but vacant
- Losers retained in history
- Winner → ACTIVE status
- Base committee immutability for term

---

### T3.6 Jurisdiction Scoping Tests

| Follows    | 3.1                      |
| ---------- | ------------------------ |
| **Effort** | Included in 3.1 estimate |

- Leader sees only assigned committees
- Leader can only submit to assigned jurisdiction
- Admin sees all (bypass)
- Reports auto-scoped

---

## Testing Sequence Summary

```
Immediate (before new feature work):
├── T1.1 handleRequest route tests — [ticket](tickets/T1.1-handleRequest-route-tests.md) Done
├── T1.2 Report generation API tests — [ticket](tickets/T1.2-report-generation-api-tests.md) Done
├── T1.3 Discrepancy handling tests — [ticket](tickets/T1.3-discrepancy-handling-tests.md) Done
├── T1.4 Voter import processor tests           (2–3 days)
└── T1.5 Report-server core tests               (3–5 days)

Alongside feature work:
├── T2.1 CommitteeSelector component tests      (1–2 days)
├── T2.2 AddCommitteeForm component tests       (1 day)
├── T2.3 Request form/card component tests      (1 day)
└── T2.4 Report generation form tests           (1 day)

With each new feature (Tier 3):
└── Tests written as part of feature implementation
```

**Total testing remediation effort:** ~12–18 days for existing gaps.

---

## Combined Timeline

| Week | Implementation                                                                                                                                              | Testing                           |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 0–4  | Phase 0 & 1 done: Backend enforcement, Foundation (Terms, LTED crosswalk, Governance Config, CommitteeMembership, Membership Type, Seat model, Audit Trail) | T1.1–T1.3 done                    |
| 5    | **Phase 1 follow-up remediation:** 1.R.1, 1.R.2, 1.R.3                                                                                                      | T1.5 Report-server tests (start)  |
| 6    | **Phase 1 follow-up remediation:** 1.R.4, 1.R.5, 1.R.6, 1.R.7, 1.R.8, 1.R.10                                                                                | T1.5 Report-server tests (finish) |
| 7    | **Phase 1 follow-up remediation cleanup:** 1.R.9, 1.R.11, 1.R.12                                                                                            | T2.1 CommitteeSelector tests      |
| 8    | 2.1 Eligibility Hard Stops, 2.1a Email/Phone + tests                                                                                                        | T2.2–T2.4 Component tests         |
| 9    | 2.2 Warnings, 2.3 Resignation + tests                                                                                                                       | — (tests included in feature)     |
| 10   | 2.4 Meeting Record + Confirmation + tests                                                                                                                   | —                                 |
| 11   | 2.5 Removal Reasons, 2.6 Petition Tracking                                                                                                                  | —                                 |
| 12   | 2.7 Weight Logic + tests                                                                                                                                    | —                                 |
| 13   | 2.8 BOE Flagging + tests                                                                                                                                    | —                                 |
| 14   | 3.1 Jurisdiction Scoping + tests                                                                                                                            | —                                 |
| 15   | 3.2 Sign-In Sheet, 3.3 Weight Report                                                                                                                        | —                                 |
| 16   | 3.4 Vacancy, Changes & Petition Outcomes Reports                                                                                                            | —                                 |
| 17   | 3.5 Audit Trail UI + Export                                                                                                                                 | —                                 |

**Current status:** Phase 0, Phase 1 foundation, T1.1–T1.3, and Phase 1 remediation (1.R.1–1.R.12) are complete. **Current focus:** Tier 2 implementation starting at 2.1 Eligibility Validation.
