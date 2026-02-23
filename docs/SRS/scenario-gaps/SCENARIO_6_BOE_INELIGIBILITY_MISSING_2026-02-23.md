# Scenario 6 Gaps: BOE File Indicates Member No Longer Eligible

Date: 2026-02-23  
Requirement source: `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md` (Scenario 6)

## Missing Items

| Gap ID | Missing item | Evidence | Impact | Severity |
| --- | --- | --- | --- | --- |
| S6-G1 | Automatic flagging is coupled to voter-import job orchestration; non-import update paths require manual execution. | Auto follow-up configured from voter import: `apps/report-server/src/jobOrchestration.ts:17`; manual route exists: `apps/frontend/src/app/api/admin/eligibility-flags/run/route.ts:27` | BOE-related eligibility drift may persist longer if imports are delayed or alternate data flows are used. | Medium |
| S6-G2 | Flagging job creates/updates pending flags but does not auto-resolve stale pending flags when a condition is no longer detected. | Creates/updates pending flags: `packages/shared-prisma/src/boeEligibilityFlagging.ts:395`, `packages/shared-prisma/src/boeEligibilityFlagging.ts:403`; no stale-flag resolution branch present in run loop | Admin queue can accumulate outdated pending flags, increasing review noise. | Medium |
| S6-G3 | Audit durability risk (cross-cutting) applies to confirmed removals from eligibility reviews. | Review route logs removals/resolutions: `apps/frontend/src/app/api/admin/eligibility-flags/[id]/review/route.ts:194`; audit helper is best-effort: `apps/frontend/src/lib/auditLog.ts:22` | In worst case, removal occurs without durable audit evidence. | High |

## Recommended Fixes

1. Add schedule/operational guardrails to run flagging automatically whenever voter data ingestion completes (and optionally nightly).
2. Extend flagging job to close stale pending flags (e.g., auto-dismiss with reason `RESOLVED_BY_RESCAN`).
3. Apply same audit durability policy as other compliance-critical membership mutations.

## Definition of Done

- Flagging run cadence is enforced by workflow, not operator memory.
- Pending list reflects currently detected issues, not stale residuals.
- Confirmed BOE removals are always auditable under failure conditions.

