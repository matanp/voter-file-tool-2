# SRS Implementation Tickets

**February 2026**

Implementation tickets for the MCDC Committee Membership & Governance system. Each ticket maps to a section in the [SRS_IMPLEMENTATION_ROADMAP.md](../SRS_IMPLEMENTATION_ROADMAP.md) and provides concrete acceptance criteria for implementation.

---

## Quick Start (New Implementers)

1. ~~[0.1 Backend enforcement](0.1-backend-enforcement-already-in-committee.md)~~ — **Done**
2. ~~[1.1 Committee Term Model](1.1-committee-term-model.md)~~ — **Done**
3. ~~[1.1b LTED-to-Assembly-District Mapping](1.1b-lted-assembly-district-mapping.md)~~ — **Done**
4. ~~[1.1c Committee Governance Config](1.1c-committee-governance-config.md)~~ — **Done**
5. ~~[1.2 CommitteeMembership Model](1.2-committee-membership-model.md)~~ — **Done**
6. ~~[1.3 Membership Type](1.3-membership-type.md)~~ — **Done**
7. ~~[1.4 Seat Model](1.4-seat-model.md)~~ — **Done**
8. ~~[1.5 Audit Trail Infrastructure](1.5-audit-trail-infrastructure.md)~~ — **Done** (1.5a → 1.5b → 1.5c)
9. **Current queue (Phase 1 follow-up remediation):** [1.R.1 Leader Privilege Escalation](1.R.1-leader-privilege-escalation.md) (P0, first)
10. [1.R.2 requestAdd Resubmission for Non-Active Memberships](1.R.2-requestAdd-resubmission-non-active.md) (P1)
11. [1.R.3 Replacement Flow Not Implemented](1.R.3-replacement-flow-not-implemented.md) (P1)
12. [1.R.4 Bulk Import Incompatible with Phase 1 Schema](1.R.4-bulk-import-phase1-incompatible.md) (P1)
13. [1.R.5 Source-of-Truth Split](1.R.5-source-of-truth-split.md) (P1)
14. [1.R.6 Audit Tests Fail](1.R.6-audit-tests-fail.md) (P2)
15. [1.R.7 Capacity + Seat Assignment Non-Atomic](1.R.7-capacity-seat-assignment-non-atomic.md) (P2)
16. **After follow-up queue:** [2.1 Eligibility Validation](2.1-eligibility-validation.md)

---

## Ticket Index

### Tier 0 — Done

| ID | Title | Status | Roadmap |
| --- | --- | --- | --- |
| [0.1](0.1-backend-enforcement-already-in-committee.md) | Backend enforcement for "Already in Another Committee" | Done | Tier 0 §0.1 |

### Tier 1 — Foundation

| ID | Title | Status | Roadmap |
| --- | --- | --- | --- |
| [1.1](1.1-committee-term-model.md) | Committee Term Model | Done | Tier 1 §1.1 |
| [1.1b](1.1b-lted-assembly-district-mapping.md) | LTED-to-Assembly-District Mapping | Done | Tier 1 §1.1b |
| [1.1c](1.1c-committee-governance-config.md) | Committee Governance Config | Done | Tier 1 §1.1c |
| [1.2](1.2-committee-membership-model.md) | CommitteeMembership Model | Done | Tier 1 §1.2 |
| [1.3](1.3-membership-type.md) | Membership Type (Petitioned vs. Appointed) | Done | Tier 1 §1.3 |
| [1.4](1.4-seat-model.md) | Seat Model | Done | Tier 1 §1.4 |
| [1.5](1.5-audit-trail-infrastructure.md) | Audit Trail Infrastructure | Done | Tier 1 §1.5 |
| [1.5a](1.5a-audit-log-schema-and-seed.md) | ↳ AuditLog Schema & SYSTEM User Seed | Done | Tier 1 §1.5 |
| [1.5b](1.5b-audit-log-utility-and-immutability.md) | ↳ Audit Log Utility & Immutability Guard | Done | Tier 1 §1.5 |
| [1.5c](1.5c-audit-log-route-wiring.md) | ↳ Audit Log Route Wiring | Done | Tier 1 §1.5 |

### Tier 1 — Testing

| ID | Title | Status | Roadmap |
| --- | --- | --- | --- |
| [T1.1](T1.1-handleRequest-route-tests.md) | handleRequest Route Tests | Done | Testing Tier 1 §T1.1 |
| [T1.2](T1.2-report-generation-api-tests.md) | Report Generation API Tests | Done | Testing Tier 1 §T1.2 |
| [T1.3](T1.3-discrepancy-handling-tests.md) | Committee Discrepancy Handling Tests | Done | Testing Tier 1 §T1.3 |

### Tier 1 — Admin IA

| ID | Title | Status | Roadmap |
| --- | --- | --- | --- |
| [IA-01](IA-01-admin-ia-v1-spec.md) | Admin IA v1 spec | Done | SRS_UI_PLANNING_GAPS §16 |

### Phase 1 — Remediation (Bugs / Gaps from Scope Check)

| ID | Title | Status | Priority | Depends on |
| --- | --- | --- | --- | --- |
| [1.R.1](1.R.1-leader-privilege-escalation.md) | Leader Privilege Escalation | Open | P0 (Critical) | — |
| [1.R.2](1.R.2-requestAdd-resubmission-non-active.md) | requestAdd Resubmission for Non-Active Memberships | Open | P1 | 1.2 |
| [1.R.3](1.R.3-replacement-flow-not-implemented.md) | Replacement Flow Not Implemented in handleRequest | Open | P1 | 1.2, T1.1 |
| [1.R.4](1.R.4-bulk-import-phase1-incompatible.md) | Bulk Import Incompatible with Phase 1 Schema | Open | P1 | 1.2, 1.4 |
| [1.R.5](1.R.5-source-of-truth-split.md) | Source-of-Truth Split (committeeMemberList vs CommitteeMembership) | Open | P1 | 1.2, 1.R.4 |
| [1.R.6](1.R.6-audit-tests-fail.md) | Audit Tests Fail (AuditAction Undefined) | Open | P2 | 1.5b |
| [1.R.7](1.R.7-capacity-seat-assignment-non-atomic.md) | Capacity + Seat Assignment Non-Atomic (Race Risk) | Open | P2 | 1.2, 1.4 |

### Tier 2 — Lifecycle Workflows

| ID | Title | Status | Roadmap | Depends on |
| --- | --- | --- | --- | --- |
| [2.1](2.1-eligibility-validation.md) | Eligibility Validation (Hard Stops) | Open | Tier 2 §2.1 | 1.1b, 1.1c, 1.2 |
| [2.1a](2.1a-email-phone-submission.md) | Email/Phone During Leader Submission | Open | Tier 2 §2.1a | 1.2 |
| [2.2](2.2-warning-system.md) | Warning System (Non-blocking Eligibility Warnings) | Open | Tier 2 §2.2 | 2.1, 1.2 |
| [2.3](2.3-resignation-workflow.md) | Resignation Workflow | Open | Tier 2 §2.3 | 1.2, 1.4 |
| [2.4](2.4-meeting-record-confirmation-workflow.md) | Meeting Record + Executive Confirmation Workflow | Open | Tier 2 §2.4 | 1.2, 1.4, IA-01 |
| [2.5](2.5-structured-removal-reasons.md) | Structured Removal with Reasons | Open | Tier 2 §2.5 | 1.2, 2.3 |
| [2.6](2.6-petition-primary-outcome-tracking.md) | Petition + Primary Outcome Tracking | Open | Tier 2 §2.6 | 1.2, 1.3, 1.4, 2.4 |
| [2.7](2.7-weight-designation-logic.md) | Weight / Designation Logic | Open | Tier 2 §2.7 | 1.4, 2.6 |
| [2.8](2.8-boe-driven-automatic-eligibility-flagging.md) | BOE-Driven Automatic Eligibility Flagging | Open | Tier 2 §2.8 | 1.2, 2.1, 2.2, 2.5 |

---

## Dependency Summary

```
1.1 (done) ──► 1.2 (done) ──► 1.3 (done)
                │  ──► 2.1 ──► 2.2 ──► 2.8
                │  ──► 2.1a
                │  ──► 2.3 ──► 2.5 ──► 2.8
                │
                └──► 2.4 ──► 2.6 ──► 2.7
                │
1.1b (done) ──► 2.1
1.1c (done) ──► 1.4 (done, also needs 1.2) ──► 2.3, 2.4, 2.6, 2.7
                │
                └──► 1.5a (done) ──► 1.5b (done) ──► 1.5c (done)

T1.2, T1.3 — parallel, no blockers

Phase 1 Remediation (1.R.x):
  1.R.1 — no deps (P0, do first)
  1.R.2, 1.R.3, 1.R.7 — 1.2
  1.R.4 — 1.2, 1.4
  1.R.5 — 1.2, 1.R.4
  1.R.6 — 1.5b
```

---

## Roadmap Reference

See [SRS_IMPLEMENTATION_ROADMAP.md](../SRS_IMPLEMENTATION_ROADMAP.md) for the full implementation sequence, dependencies, and timeline.

**Implementation plan:** [IA-01-implementation-action-items.md](../IA-01-implementation-action-items.md) — suggested action items and decisions from the IA-01 ticket.
