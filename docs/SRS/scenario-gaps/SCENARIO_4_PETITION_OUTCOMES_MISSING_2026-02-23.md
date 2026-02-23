# Scenario 4 Gaps: Petitioned Member Wins/Loses Primary

Date: 2026-02-23  
Requirement source: `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md` (Scenario 4)

## Missing Items

| Gap ID | Missing item | Evidence | Impact | Severity |
| --- | --- | --- | --- | --- |
| S4-G1 | Petition winner lifecycle uses `ACTIVE` directly instead of explicit petition winner status (`PETITIONED_WON`) that exists in enum. | Enum contains `PETITIONED_WON`: `apps/frontend/prisma/schema.prisma:31`; winner mapping writes `ACTIVE`: `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:21` | Creates lifecycle-model ambiguity and reporting/audit interpretation drift. | Medium |
| S4-G2 | “Why not on committee” explanation is available in reports but not consistently surfaced in committee workspace views. | Petition outcomes include outcome labels: `apps/report-server/src/committeeMappingHelpers.ts:688`; committee list endpoint returns only active memberships: `apps/frontend/src/app/api/fetchCommitteeList/route.ts:91` | Staff/leaders may need to pivot to separate reports to understand exclusions. | Medium |
| S4-G3 | Petition audit granularity is aggregated; no dedicated per-candidate lost/tie audit event pattern. | Aggregated event: `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:176`; only winner activation audit is explicit: `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:138` | Historical defensibility for individual candidate outcome decisions is weaker than it could be. | Low |

## Recommended Fixes

1. Decide and standardize petition status model:
   - Use `PETITIONED_WON` as persisted state before/with activation, or
   - Remove unused enum state and align docs/code.
2. Add optional contextual panel in committee admin UI linking current committee view to latest petition outcomes for that LTED.
3. Add per-candidate petition outcome audit metadata/events (won/lost/tie).

## Definition of Done

- Petition lifecycle states are coherent across schema, routes, and reports.
- Admins can see or navigate to explicit exclusion reasons from committee workspace context.
- Audit trail captures candidate-level outcome decisions clearly.

