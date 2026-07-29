# SRS Branch Findings Confirmation and Fix Plan Index

Date: 2026-07-06 (updated 2026-07-29)
Source review: `docs/SRS/SRS_BRANCH_CODE_REVIEW_2026-07-06.md`

**Status:** `feat/srs-implementation` merged to `main`; production database migrated (2026-07-29). Remaining P1 items below are **post-merge backlog**, not merge blockers.

## Confirmation Summary

I rechecked every finding in the branch review against the current code, tests, and SRS documents. Two findings have since been fixed and removed from this index (along with their fix-plan docs); two P1 findings remain open and worth addressing for full SRS compliance.

| Finding | Status | Worth Addressing | Fix Plan |
| --- | --- | --- | --- |
| P1 - RequestAccess users can submit committee requests outside any jurisdiction | Confirmed, open | Yes | [01-requestadd-leader-jurisdiction-scope.md](01-requestadd-leader-jurisdiction-scope.md) |
| P1 - Admin direct-add bypasses Executive Committee confirmation | Confirmed, open | Yes | [02-admin-direct-add-exec-confirmation.md](02-admin-direct-add-exec-confirmation.md) |

**Related (not from July review):** [P1 — Replacement workflow on full committees](../tickets/P1-replacement-workflow-full-committee-fix.md) — preflight and `requestAdd` CAPACITY gates still naive (UI partial fix in `384226e`).

### Resolved and removed

- P1 - Several membership-changing flows still commit when audit writes fail — fixed in `68e8193` (fail-closed `logAuditEventOrThrow` across the compliance-critical membership/petition/import sites; `requestAdd` write + audit wrapped in a single transaction).
- P2 - Changes report excludes events later on the selected end date — fixed in `0c2e168` (Changes report end date made inclusive).
- P2 - Changing maxSeatsPerLted does not reconcile existing seats or weights — fixed in `0fdca5d` (`reconcileSeatsForMaxSeatsChange` on governance config PATCH).

## Review Notes

- The original review's merge stance is still justified: the P1 findings are server-side workflow or audit gaps, not cosmetic issues.
- I did not modify `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md`, which explicitly says not to update that file.
- The local guidance files were read before this confirmation pass:
  - `skills/auth-check-patterns/SKILL.md`
  - `skills/adding-reports/SKILL.md`
  - `skills/test-type-safety/SKILL.md`

## Commands and Artifacts Reviewed

- `docs/SRS/SRS_BRANCH_CODE_REVIEW_2026-07-06.md`
- `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md`
- `docs/SRS/SRS_ADDITIONAL_REQUIREMENTS_Governance_Config.md`
- `docs/SRS/SRS_IMPLEMENTATION_ROADMAP.md`
- Route, helper, and test files cited in each individual plan.

## Recommended Order

1. **[01] Fix `requestAdd` privilege and jurisdiction scope.** Direct authorization issue and the highest-risk gap. Do it first because it also settles the submission contract (wrapper at `Leader`, jurisdiction guard) that plan 02 builds on.
2. **[02] Remove or harden admin direct activation.** It can create active appointed members outside the Executive Committee confirmation chain. Depends on 01: the submit-on-behalf path reuses `requestAdd`'s submission logic, so land 01 first to avoid reworking it.
3. **[P1-replacement-full]** Extend effective-capacity pattern from `handleRequest` into eligibility preflight and `requestAdd` (see replacement ticket).
