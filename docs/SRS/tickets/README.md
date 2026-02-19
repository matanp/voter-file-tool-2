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
9. **Next:** [2.1 Eligibility Validation](2.1-eligibility-validation.md)

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

### Tier 2 — Lifecycle Workflows

| ID | Title | Status | Roadmap | Depends on |
| --- | --- | --- | --- | --- |
| [2.1](2.1-eligibility-validation.md) | Eligibility Validation (Hard Stops) | Open | Tier 2 §2.1 | 1.1b, 1.1c, 1.2 |
| [2.1a](2.1a-email-phone-submission.md) | Email/Phone During Leader Submission | Open | Tier 2 §2.1a | 1.2 |
| [2.3](2.3-resignation-workflow.md) | Resignation Workflow | Open | Tier 2 §2.3 | 1.2, 1.4 |

---

## Dependency Summary

```
1.1 (done) ──► 1.2 (done) ──► 1.3 (done)
                │  ──► 2.1 ──► (Tier 2 eligibility-gated work)
                │  ──► 2.1a
                │
1.1b (done) ──► 2.1
1.1c (done) ──► 1.4 (done, also needs 1.2) ──► 2.3
                │
                └──► 1.5a (done) ──► 1.5b (done) ──► 1.5c (done)

T1.2, T1.3 — parallel, no blockers
```

---

## Roadmap Reference

See [SRS_IMPLEMENTATION_ROADMAP.md](../SRS_IMPLEMENTATION_ROADMAP.md) for the full implementation sequence, dependencies, and timeline.

**Implementation plan:** [IA-01-implementation-action-items.md](../IA-01-implementation-action-items.md) — suggested action items and decisions from the IA-01 ticket.
