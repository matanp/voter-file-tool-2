# Scenario 5 Gaps: Committee Member Resigns

Date: 2026-02-23  
Requirement source: `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md` (Scenario 5)

## Missing Items

| Gap ID | Missing item | Evidence | Impact | Severity |
| --- | --- | --- | --- | --- |
| S5-G1 | Audit logging is best-effort and can fail silently during resignation operations. | `logAuditEvent` catches and suppresses errors: `apps/frontend/src/lib/auditLog.ts:22`; resignation path relies on it: `apps/frontend/src/app/api/committee/remove/route.ts:115` | Could violate SRS audit defensibility if resignation state changes occur without corresponding audit rows. | High |
| S5-G2 | Resignation rationale is not modeled as a structured required field, despite acceptance wording “action and reason.” | Resignation schema requires date+method but no reason field: `apps/frontend/src/lib/validations/committee.ts:247`; route logs no explicit reason in `after`: `apps/frontend/src/app/api/committee/remove/route.ts:127` | Reduces traceability quality for why resignation was recorded. | Medium |
| S5-G3 | Optional resignation notes are not included in audit `afterValue` payload. | Notes may be persisted: `apps/frontend/src/app/api/committee/remove/route.ts:109`; audit payload omits notes: `apps/frontend/src/app/api/committee/remove/route.ts:127` | Context can be lost for future audits or disputes. | Low |

## Recommended Fixes

1. For resignation/removal endpoints, enforce audit write success (transactional fail if audit insert fails) or explicit dead-letter retry policy.
2. Add optional/required `resignationReason` field (product decision) and include in persisted membership + audit payload.
3. Include `removalNotes`/resignation note data in `afterValue` metadata when provided.

## Definition of Done

- Resignation endpoint cannot complete silently without audit durability policy.
- Reason context is preserved in data model and audit records.
- Resignation audit contains full context used by operators.

