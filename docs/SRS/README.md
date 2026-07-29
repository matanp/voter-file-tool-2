# SRS Docs Index

Use this index as the starting point for SRS implementation planning and branch review.

## Branch Status (feat/srs-implementation — merged)

**Start here:** [FEAT_SRS_IMPLEMENTATION_BRANCH_CHANGELOG.md](FEAT_SRS_IMPLEMENTATION_BRANCH_CHANGELOG.md)

Single-page overview of everything delivered on the branch, formal scenario assessment, post-merge open work, and known follow-ups. Merged to `main` and production DB migrated (2026-07-29).

Post-merge P1 compliance gaps: [fix-plans/2026-07-06-srs-branch-findings-confirmation.md](fix-plans/2026-07-06-srs-branch-findings-confirmation.md).

---

## Current Canonical Docs

1. [FEAT_SRS_IMPLEMENTATION_BRANCH_CHANGELOG.md](FEAT_SRS_IMPLEMENTATION_BRANCH_CHANGELOG.md) — branch deliverables, scenario status, post-merge open work
2. [SRS_FORMAL_REQUIREMENTS_ASSESSMENT_2026-02-23.md](SRS_FORMAL_REQUIREMENTS_ASSESSMENT_2026-02-23.md) — detailed formal assessment (post Tier 4 closeout)
3. [SRS_USER_STORY_VALIDATION_MATRIX_2026-02-23.md](SRS_USER_STORY_VALIDATION_MATRIX_2026-02-23.md) — per-acceptance-criterion evidence with file:line refs
4. [tickets/README.md](tickets/README.md) — ticket index, statuses, dependency graph
5. [tickets/4.0-srs-governance-gap-remediation-program.md](tickets/4.0-srs-governance-gap-remediation-program.md) — Tier 4 remediation closeout + commit refs
6. [SRS_IMPLEMENTATION_ROADMAP.md](SRS_IMPLEMENTATION_ROADMAP.md) — implementation sequence
7. [SRS_DATA_MODEL_CHANGES.md](SRS_DATA_MODEL_CHANGES.md) — schema/migration spec

## Traceability & Scenario Mapping

- [SRS_REQUIREMENTS_IMPLEMENTATION_TRACEABILITY_2026-02-24.md](SRS_REQUIREMENTS_IMPLEMENTATION_TRACEABILITY_2026-02-24.md) — requirements ↔ code investigation; includes non-blocking gap list
- [user-story-mapping/](user-story-mapping/) — per-scenario implementation mapping (Scenarios 1–7)

## Phase 1 Closeout (Historical)

- [PHASE1_FINALIZATION.md](PHASE1_FINALIZATION.md) — Phase 1 closure record (foundation + 1.R.* remediation)
- [PHASE1_CODE_REVIEW_FINDINGS.md](PHASE1_CODE_REVIEW_FINDINGS.md) — post-closeout code review findings

## Supporting Specs

- [SRS_LTED_WEIGHT_SOURCE.md](SRS_LTED_WEIGHT_SOURCE.md)
- [SRS_IMPLEMENTATION_ADMIN_OVERRIDE.md](SRS_IMPLEMENTATION_ADMIN_OVERRIDE.md)
- [SRS_IMPLEMENTATION_INACTIVE_VOTER_WARNING.md](SRS_IMPLEMENTATION_INACTIVE_VOTER_WARNING.md)
- [COMMITTEES_WORKSPACE_REDESIGN_SPEC.md](COMMITTEES_WORKSPACE_REDESIGN_SPEC.md)
- [SRS_GAPS_AND_CONSIDERATIONS.md](SRS_GAPS_AND_CONSIDERATIONS.md)
- [SRS_UI_PLANNING_GAPS.md](SRS_UI_PLANNING_GAPS.md)
- [ACCESSIBILITY_MOBILE_CHECKLIST.md](ACCESSIBILITY_MOBILE_CHECKLIST.md) — draft checklist for open ticket 3.6
- [REPORT_PARAMETER_MATRIX.md](REPORT_PARAMETER_MATRIX.md)

## Historical / Superseded

- [BRANCH_REVIEW_DEVELOP_VS_FEAT_SRS_IMPLEMENTATION.md](BRANCH_REVIEW_DEVELOP_VS_FEAT_SRS_IMPLEMENTATION.md) — Feb 19 snapshot (Phase 0 + Phase 1 only); superseded by branch changelog

## Notes

- Phase 1 review artifacts were consolidated during closeout. See [PHASE1_FINALIZATION.md](PHASE1_FINALIZATION.md) §7.
- Tier 4 (tickets 4.1–4.8) closed all SRS v0.1 scenarios as **Implemented** on 2026-02-24. Post-merge open work is tracked in the branch changelog [Post-merge open work](FEAT_SRS_IMPLEMENTATION_BRANCH_CHANGELOG.md#post-merge-open-work), [tickets/README.md](tickets/README.md) (P1/P2 gaps plus 2.9, 3.6, T1.4–T2.4), and [fix-plans/2026-07-06-srs-branch-findings-confirmation.md](fix-plans/2026-07-06-srs-branch-findings-confirmation.md).
