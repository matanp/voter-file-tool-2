# Scenario 4 Gaps: Petitioned Member Wins/Loses Primary

Date: 2026-02-23  
Requirement source: `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md` (Scenario 4)
Status: Resolved in [ticket 4.4](../tickets/4.4-scenario4-petition-outcomes-traceability.md)

## Resolution Summary

| Gap ID | Resolved item | Resolution evidence | Impact |
| --- | --- | --- | --- |
| S4-G1 | Canonical petition lifecycle standardized and dead status removed. | `apps/frontend/prisma/schema.prisma` (no `PETITIONED_WON`), migration `apps/frontend/prisma/migrations/20260223090000_remove_petitioned_won_status/migration.sql`, canonical mapping in `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts` | Eliminates lifecycle ambiguity and keeps route/report semantics aligned. |
| S4-G2 | Committee workspace now exposes petition outcome context without manual filter rebuild. | Petition context panel + deep link in `apps/frontend/src/app/committees/CommitteeSelector.tsx`; filtered landing via `apps/frontend/src/app/admin/petition-outcomes/page.tsx` | Improves discoverability of exclusion outcomes (`lost`, `tie`) for selected committee/LTED. |
| S4-G3 | Petition audit now includes explicit per-candidate metadata. | Candidate-level audit metadata emitted in `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts`; payload shape covered by `apps/frontend/src/__tests__/api/admin/petition-outcomes/record.test.ts` | Strengthens historical traceability for why each candidate did or did not activate. |
