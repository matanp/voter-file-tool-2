# Committees Workspace Redesign Spec (PRD + Architecture)

**Date:** February 19, 2026  
**Status:** Proposed  
**Owner:** Product + Engineering  
**Primary Route:** `/committees`

---

## 1. Purpose

Define a full redesign of the committees page as a single **Committee Operations Workspace** that supports:

- Daily leader workflows (submit candidates, view vacancies, track pending status)
- Daily admin workflows (activate, remove, resign, review, override)
- Future meeting-centric confirmation flow
- Seat/vacancy/weight visibility at LTED scale

This document is conceptual and architecture-focused. It defines data flow, state transitions, and system boundaries, not UI pixel specs or implementation tasks.

---

## 2. Inputs and Source-of-Truth References

Primary requirements:

- `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md`
- `docs/SRS/SRS_IMPLEMENTATION_ROADMAP.md`
- `docs/SRS/SRS_IMPLEMENTATION_ADMIN_OVERRIDE.md`
- `docs/SRS/SRS_IMPLEMENTATION_INACTIVE_VOTER_WARNING.md`
- `docs/SRS/IA-01-implementation-action-items.md`
- `docs/SRS/SRS_UI_PLANNING_GAPS.md`
- `docs/UI_ARCHITECTURE_REVIEW/03_RECOMMENDATIONS.md`
- `docs/UI_ARCHITECTURE_REVIEW/04_SRS_GAP_MAPPING.md`

Current implementation constraints observed in code:

- `apps/frontend/src/app/committees/page.tsx`
- `apps/frontend/src/app/committees/CommitteeSelector.tsx`
- `apps/frontend/src/app/committees/AddCommitteeForm.tsx`
- `apps/frontend/src/app/committees/CommitteeRequestForm.tsx`
- `apps/frontend/src/app/committees/requests/page.tsx`
- `apps/frontend/src/app/committees/requests/RequestCard.tsx`
- `apps/frontend/src/app/api/fetchCommitteeList/route.ts`
- `apps/frontend/src/app/api/committee/add/route.ts`
- `apps/frontend/src/app/api/committee/requestAdd/route.ts`
- `apps/frontend/src/app/api/committee/handleRequest/route.ts`
- `apps/frontend/src/app/api/committee/remove/route.ts`
- `apps/frontend/prisma/schema.prisma`

---

## 3. Problem Statement

Current committees UX and service boundaries are functional but fragmented:

- Single-committee drill-down model is slow for multi-LTED operations.
- Lifecycle commands are split across disparate UI surfaces and APIs.
- Replacement intent is captured but not enforced end-to-end.
- Meeting workflow is planned but not integrated in committee operations.
- Hard-stop/warning/override contract is not yet centralized.
- Role/scope behavior is inconsistent with target Leader jurisdiction model.
- UI composition is coupled to record-search primitives and card-heavy layout.

Result: higher operational friction, policy drift risk, and lower confidence in status transitions.

---

## 4. Product Goals

1. Reduce committee operations time for admins and leaders.
2. Make membership lifecycle state explicit, traceable, and defensible.
3. Centralize validation and transition rules to prevent route-level divergence.
4. Support both one-off and bulk (meeting-based) review flows without duplicating logic.
5. Preserve clean/simple UX while providing high-density committee intelligence.

---

## 5. Design Principles

1. **Overview first, detail on demand**: multi-LTED table + detail pane.
2. **One domain model**: `CommitteeMembership` is authoritative for lifecycle.
3. **Commands over ad hoc mutations**: explicit transition endpoints with guards.
4. **Server decides eligibility**: UI renders decisions, never re-implements business rules.
5. **Audit by default**: every status-changing command logs before/after + context.
6. **Progressive enhancement**: ship read-model and interaction improvements before full workflow replacement.

---

## 6. Scope

### In Scope

- Redesign `/committees` into a split-pane operations workspace
- Define canonical query and command contracts
- Define lifecycle transition matrix and invariants
- Define role capability model (Admin, Leader, RequestAccess, ReadAccess)
- Define integration points with meetings, warnings, override, removal, resignation, and seat/weight logic
- Define phased rollout and backward compatibility strategy

### Out of Scope

- Visual polish details (spacing/typography tokens at component-level)
- Full `/admin/meetings` implementation details
- Petition outcome entry UI details
- Crosswalk/weight importer UI details

---

## 7. Information Architecture

### 7.1 Route Strategy

- Keep `/committees` as primary operations page.
- Keep `/committees/requests` as transition surface until meeting workflow becomes default; add strong CTA to `/admin/meetings`.
- Keep `/admin/meetings` as formal bulk decision context.

### 7.2 Page Anatomy

`/committees` is restructured into:

1. **Top Bar**
   - Term chip
   - Scope chip (Admin countywide / Leader jurisdiction)
   - Global metrics (open seats, pending submissions, active memberships)
   - Primary actions (new submission, open pending queue)

2. **Left Pane: Committee Grid**
   - Table rows = LTEDs
   - Columns: City/Town, LD, ED, Active/Capacity, Open Seats, Weighted Seats, Current Weight, Pending Count
   - Filters: city, LD, ED, vacancy status, pending status, weight status

3. **Right Pane: Committee Detail Workspace**
   - `Roster` tab
   - `Pending` tab
   - `Seats & Weight` tab
   - `History` tab

4. **Action Drawer**
   - Context-sensitive forms:
     - Submit/Add candidate
     - Replace member
     - Remove member
     - Record resignation
     - Confirm/reject pending (one-off)
     - Override modal (admin only)

### 7.3 Wireframe-Level Component Map

```text
CommitteesWorkspacePage
  CommitteesWorkspaceHeader
  CommitteesWorkspaceLayout
    CommitteeGridPane
      CommitteeFilters
      CommitteeDataTable
    CommitteeDetailPane
      CommitteeContextHeader
      CommitteeTabs
        RosterTab
        PendingTab
        SeatsWeightTab
        HistoryTab
  CommitteeActionDrawer
    CandidateSearchStep
    EligibilityReviewStep
    TransitionConfirmationStep
```

---

## 8. Domain Model and Data Ownership

### 8.1 Core Entities

- `CommitteeList`: LTED identity + term + LTED total weight context
- `CommitteeMembership`: lifecycle and actor actions (authoritative)
- `Seat`: occupancy and seat-level weight/petitioned status
- `CommitteeGovernanceConfig`: eligibility and policy configuration
- `CommitteeTerm`: active term authority
- `AuditLog`: immutable transition evidence

### 8.2 Planned/Future Entities

- `MeetingRecord` relation from `CommitteeMembership`
- `UserJurisdiction` for leader scoping
- BOE flag review model (or equivalent queue surface)

### 8.3 De Facto Constraints

- `CommitteeRequest` and `committeeMemberList` are legacy compatibility structures and should not be expanded.
- New behavior must flow through `CommitteeMembership` and seat utilities.

---

## 9. Lifecycle Transition Model

### 9.1 Canonical Status Transitions

| From | To | Actor | Trigger |
|---|---|---|---|
| none | SUBMITTED | Leader/Admin | Submit candidate request |
| SUBMITTED | REJECTED | Admin | One-off reject or meeting reject |
| SUBMITTED | CONFIRMED | Admin | Meeting confirm |
| CONFIRMED | ACTIVE | System/Admin | Activation + seat assignment |
| SUBMITTED | ACTIVE | Admin | Direct accept flow (compatibility path) |
| ACTIVE | RESIGNED | Admin | Record resignation |
| ACTIVE | REMOVED | Admin/System | Structured removal / BOE-confirmed removal |
| ACTIVE | PETITIONED | Admin | Petition outcome winner/unopposed |
| ACTIVE | PETITIONED_LOST | Admin | Petition outcome |
| ACTIVE | PETITIONED_TIE | Admin | Petition outcome |

### 9.2 Transition Invariants

1. Capacity and seat assignment must be atomic.
2. `ACTIVE` membership in another LTED for same term blocks activation/submission.
3. Replacement is a compound transition (remove target + activate candidate) and must be atomic.
4. `REMOVED` and `RESIGNED` are semantically distinct and require distinct metadata.
5. Warnings never block by themselves; hard stops block unless override rules allow bypass.

---

## 10. API Architecture

### 10.1 Query Model (Read APIs)

Introduce workspace read-model endpoints (BFF-style) to avoid N+1 client composition:

1. `GET /api/committees/workspace`
   - Returns term context, capability flags, aggregate metrics, filter options, and committee rows.
2. `GET /api/committees/{committeeListId}/detail`
   - Returns roster, pending, seats, weight, and recent history for one committee.
3. `GET /api/committees/{committeeListId}/eligibility?voterRecordId=...`
   - Preflight eligibility contract for UX (same service as command validation).

Read-model responses are role-aware and already scoped (Admin countywide, Leader jurisdiction).

### 10.2 Command Model (Write APIs)

Define transition-oriented command contracts:

1. `POST /api/committees/submit`
   - Creates or reopens `SUBMITTED` membership.
2. `POST /api/committees/activate`
   - Admin direct activation path.
3. `POST /api/committees/review`
   - One-off accept/reject for pending requests.
4. `POST /api/committees/replace`
   - Compound remove+activate command.
5. `POST /api/committees/remove`
   - Structured removal (`REMOVED`) with required reason.
6. `POST /api/committees/resign`
   - Resignation (`RESIGNED`) with date+method.

Compatibility mapping:

- Existing `committee/add`, `committee/requestAdd`, `committee/handleRequest`, `committee/remove` can be retained short-term, but should internally delegate to the same command service.

### 10.3 Canonical Eligibility Contract

All relevant commands consume one eligibility service:

```ts
{
  eligible: boolean;
  hardStops: IneligibilityReason[];
  warnings: EligibilityWarning[];
}
```

Override contract:

```ts
{
  forceAdd?: true;
  overrideReason?: string;
}
```

If override is used, bypassed reasons and rationale are always audited.

---

## 11. Role and Capability Model

| Capability | Admin | Leader | RequestAccess | ReadAccess |
|---|---|---|---|---|
| View scoped committee rows | Yes | Yes (jurisdiction-scoped) | Limited | Limited |
| View member PII | Yes | Policy-dependent scoped | No | No |
| Submit candidate | Yes | Yes | Yes (transition policy) | No |
| Activate / reject | Yes | No | No | No |
| Remove / resign | Yes | No | No | No |
| Override hard stops | Yes | No | No | No |
| Update LTED weight | Yes | No | No | No |
| Access meeting workflow | Yes | No | No | No |

Final Leader PII policy must be confirmed by product/policy before rollout.

---

## 12. Workflow Data Flows

### 12.1 Leader Submission

1. Select LTED from grid.
2. Search/select candidate in action drawer.
3. Run preflight eligibility.
4. If hard stop: block with reason.
5. If warnings: allow submit with warning display.
6. Create/reopen `SUBMITTED` membership with metadata.
7. Refresh pending count and pending tab.

### 12.2 Admin Direct Add

1. Same candidate selection + eligibility contract.
2. If overridable hard stop: optional override modal with reason.
3. On commit: atomic capacity check + seat allocation + activation.
4. Audit event with transition and optional override metadata.

### 12.3 Replacement

1. Admin selects add candidate + remove target in same committee context.
2. System validates remove target is active and candidate is eligible.
3. Atomic transaction:
   - Target -> `REMOVED`
   - Candidate -> `ACTIVE`
   - Seat assignment integrity preserved
4. Emit dual audit events with shared operation correlation ID.

### 12.4 Remove vs Resign

- Remove requires `removalReason`, and `removalNotes` when `OTHER`.
- Resign requires `resignationDateReceived` + `resignationMethod`.
- Both transition away from `ACTIVE`, but with distinct semantic tags and reporting lineage.

### 12.5 Pending Review

- Committee detail `Pending` tab supports one-off accept/reject.
- CTA routes to `/admin/meetings` for bulk decisions and meeting-record attachment.

---

## 13. Non-Functional Requirements

1. **Consistency:** one command service for transition logic.
2. **Integrity:** transactional guardrails for seat/capacity-changing commands.
3. **Auditability:** all transitions log before/after + metadata.
4. **Performance:** workspace list and detail endpoints should avoid client-side waterfall fetching.
5. **Accessibility:** keyboard navigable table, filters, drawer, and modal interactions.
6. **Resilience:** deterministic user-facing error schema for all command failures.

---

## 14. Rollout and Migration Plan

### Phase A: Transition Engine Consolidation

- Centralize eligibility and command handling.
- Close current gaps (replacement acceptance behavior, atomic confirmation path, strict removal contract).

### Phase B: Read Model Introduction

- Ship workspace query endpoints.
- Keep current UI while validating payload correctness and permissions.

### Phase C: New Workspace UI Behind Flag

- Introduce split-pane grid/detail architecture.
- Preserve legacy endpoints and `/committees/requests` during transition.

### Phase D: Unified Action Drawer

- Move add/request/remove/resign/review into canonical command contracts.
- Introduce override UX and warning surfaces.

### Phase E: Meeting-Centric Integration

- Harden `/admin/meetings` linkage and promote as primary bulk path.

### Phase F: Legacy Contraction

- Reduce old selector/request surfaces to compatibility wrappers.
- Retire duplicate state mutation logic paths.

---

## 15. Acceptance Criteria for Redesign Completion

1. `/committees` supports multi-LTED operations with filterable grid + detail pane.
2. All membership changes are executed through canonical transition commands.
3. Eligibility outcomes are consistent across all add/submit/review flows.
4. Replacement transition is atomic and auditable.
5. Remove/resign metadata requirements are enforced by contract.
6. Pending workflow supports both one-off and meeting-linked progression.
7. Role scoping and capability gates are enforced server-side.
8. No new behavior depends on deprecated `committeeMemberList` or `CommitteeRequest` as system-of-record.

---

## 16. Open Decisions

1. Leader PII visibility scope on roster detail.
2. Exact timeline for moving from one-off request review to meeting-primary review.
3. Whether term switching is user-controlled on `/committees` in v1 of redesign or fixed to active term.
4. Whether `RequestAccess` remains a submission role or is fully replaced by `Leader`.

---

## 17. Traceability Matrix (SRS -> Redesign)

| SRS / Ticket Theme | Redesign Coverage |
|---|---|
| Membership lifecycle statuses | Sections 8, 9, 12 |
| Hard stops + warnings + override | Sections 10.3, 12 |
| Meeting-based confirmation | Sections 7, 12, 14 |
| Resignation + structured removal | Sections 9, 12 |
| Vacancy + weight visibility | Sections 7, 8 |
| Jurisdiction-scoped leader access | Sections 10.1, 11 |
| Audit trail requirements | Sections 9.2, 13 |
| CommitteeSelector future redesign requirement | Entire workspace architecture |
