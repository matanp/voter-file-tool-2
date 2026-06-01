# SRS Gap Remediation Plan (Prioritized)

Date: 2026-02-23  
Inputs:
- `docs/SRS/scenario-gaps/SCENARIO_1_LEADER_SUBMISSION_MISSING_2026-02-23.md`
- `docs/SRS/scenario-gaps/SCENARIO_2_ELIGIBILITY_FAILURE_MISSING_2026-02-23.md`
- `docs/SRS/scenario-gaps/SCENARIO_3_EXEC_CONFIRMATION_MISSING_2026-02-23.md`
- `docs/SRS/scenario-gaps/SCENARIO_4_PETITION_OUTCOMES_MISSING_2026-02-23.md`
- `docs/SRS/scenario-gaps/SCENARIO_5_RESIGNATION_MISSING_2026-02-23.md`
- `docs/SRS/scenario-gaps/SCENARIO_6_BOE_INELIGIBILITY_MISSING_2026-02-23.md`
- `docs/SRS/scenario-gaps/SCENARIO_7_LEADER_REPORTS_MISSING_2026-02-23.md`

## Priority Framework

- `P0`: compliance/security/procedural integrity risk
- `P1`: functional SRS miss with clear user impact
- `P2`: important consistency/traceability improvements
- `P3`: documentation/quality-of-life cleanup

## Prioritized Remediation Backlog

| ID | Priority | Covers scenarios | Remediation | Why first | Suggested effort |
| --- | --- | --- | --- | --- | --- |
| R1 | P0 | 3 | Make meeting-confirmation flow authoritative for approvals; remove/bound direct-accept bypass. | Prevents process bypass of Executive Committee confirmation model. | M |
| R2 | P0 | 3 | Add `validateEligibility` re-check in bulk meeting decisions before activation. | Prevents stale/ineligible approvals at meeting time. | S |
| R3 | P0 | 5, 6 (cross-cutting) | Make audit durability policy explicit and enforced for membership-changing endpoints. | Core defensibility/compliance requirement. | M |
| R4 | P0 | 7 | Harden report API auth/scope for `ldCommittees` and non-scoped report types. | Reduces potential over-broad data exposure risk. | S |
| R5 | P1 | 1, 2 | Add leader-facing preflight eligibility UX + clear reason rendering + “contact staff” guidance. | Closes core submission UX/acceptance gaps. | M |
| R6 | P1 | 7 | Implement or formally redefine leader “current roster generation” capability. | Direct Scenario 7 acceptance closure item. | M |
| R7 | P1 | Additional requirements | Build governance-config admin management (party code, max seats, AD toggle, non-overridable reasons), with validation against dropdown party codes. | Completes configurable-governance requirement operationally. | M |
| R8 | P2 | 4 | Harmonize petition lifecycle model (schema cleanup) + candidate-level audit clarity. | Improves model correctness and traceability. | M (Done via ticket 4.4) |
| R9 | P2 | 6 | Auto-resolve stale pending eligibility flags on rescans. | Reduces admin review noise and improves signal quality. | M |
| R10 | P2 | 1 | Clarify/implement seat-assignment timing at submission vs activation. | Aligns behavior with SRS wording and prevents ambiguity. | S/M |
| R11 | P2 | 5 | Add structured resignation reason and include notes in audit payload. | Improves resignation audit context quality. | S |
| R12 | P3 | 7 | Align SRS export wording (`PDF/CSV`) with actual supported formats (or add CSV where needed). | Prevents acceptance ambiguity and docs drift. | S |

## Execution Sequence

### Wave 1 (P0)

1. R1: meeting flow authority and direct-accept deprecation/path hardening  
2. R2: bulk decision eligibility revalidation  
3. R3: audit durability policy enforcement  
4. R4: report API auth/scope hardening

Exit criteria:
- No path can activate without required procedural context.
- Bulk and single approval use same eligibility policy.
- Audit failure behavior is deterministic and documented.
- Non-admin cannot generate non-scoped countywide-sensitive reports unless explicitly allowed.

### Wave 2 (P1)

1. R5: leader preflight and failure UX clarity  
2. R6: leader roster-generation gap closure  
3. R7: governance config admin management and validation

Exit criteria:
- Scenario 1/2/7 acceptance criteria are directly demonstrable in UI.
- Governance config is operationally editable with guardrails.

### Wave 3 (P2/P3)

1. R8: petition lifecycle/status consistency  
2. R9: stale flag auto-resolution  
3. R10: seat-assignment timing alignment  
4. R11: resignation reason enrichment  
5. R12: docs/format alignment

Exit criteria:
- Remaining “implemented with risks” items move to “implemented.”
- Documentation and code semantics are aligned.

## Verification Strategy (per remediation item)

For each remediation ticket:
- Add/extend API tests in `apps/frontend/src/__tests__/api/...`
- Add workflow integration tests for admin approval/report generation paths
- Add regression tests for authorization boundaries and audit behavior
- Update requirement traceability matrix with new evidence lines

## Recommended First Ticket Set (immediate)

1. R1 + R2 in a single “approval hardening” epic.
2. R3 as a dedicated “audit durability” epic (shared utility + endpoint updates).
3. R4 as a focused auth hardening ticket before broader UX changes.
