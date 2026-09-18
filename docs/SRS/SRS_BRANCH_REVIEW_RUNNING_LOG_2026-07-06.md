# SRS Branch Review Running Log

Date started: 2026-07-06
Branch: `feat/srs-implementation`

## Purpose

Checkpoint log for the current branch review against the SRS baseline. This file is updated during the review so work can resume if the session pauses.

## Review artifacts

- Final review document: `docs/SRS/SRS_BRANCH_CODE_REVIEW_2026-07-06.md`
- Baseline SRS: `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md`
- Governance extension: `docs/SRS/SRS_ADDITIONAL_REQUIREMENTS_Governance_Config.md`

## Status

- 2026-07-06: Review started.
- 2026-07-06: Identified SRS baseline and governance extension as source requirements.
- 2026-07-06: Read auth review guidance because scope includes authorization, privilege checks, and role-gated UI.
- 2026-07-06: Extracted baseline review areas from SRS v0.1 and governance extension:
  - Users/roles and jurisdiction-scoped access.
  - BOE voter data and LTED district mapping inputs.
  - Committee term model and single active leader submission term.
  - Membership lifecycle: submitted, confirmed, active, resigned, removed, petition won/lost/tie.
  - Hard stops: registration, party, Assembly District, LTED capacity, duplicate active membership.
  - Warnings: inactive voter, recent resignation, potential duplicate submission.
  - Seat and designation weight logic.
  - Leader/admin workflows and reports.
  - Immutable audit trail and before/after values.
  - Governance config: `requiredPartyCode`, `maxSeatsPerLted`, `requireAssemblyDistrictMatch`.
- 2026-07-06: Backend/schema pass completed for core SRS objects and mutation routes.
- 2026-07-06: Report generation pass completed for API scoping and report-server worker filters.
- 2026-07-06: Frontend workflow pass completed for committee add/request split.
- 2026-07-06: Test coverage pass completed for key route tests and prior SRS assessment claims.
- 2026-07-06: Ran `pnpm run check:api-routes`; result passed with 66 methods across 57 route files. Trust-boundary gaps found in this review are policy/scope issues inside wrapped routes, not missing wrappers.

## Working Notes

- Current branch from `git status --short --branch`: `feat/srs-implementation...origin/feat/srs-implementation [ahead 51]`.
- Existing dirty docs files were present before this review; avoid modifying them unless explicitly needed.
- The SRS folder README says to start with the branch changelog and identifies canonical supporting docs. For correctness, use prior assessment docs as maps and re-check claims against code.

## Open Questions

- None yet.

## Findings Draft

- Finding draft 1: `/api/committee/requestAdd` is exposed at `RequestAccess` and only enforces jurisdiction when `session.user.privilegeLevel === Leader`. RequestAccess users can create `SUBMITTED` memberships in any active-term committee. This conflicts with SRS §3.2 and §11.2 plus roadmap notes that `committee/requestAdd` should require Leader and jurisdiction scope.
- Finding draft 2: Admin UI direct-add flow calls `/api/committee/add`, which writes memberships directly to `ACTIVE` with seat assignment and no `meetingRecordId` / `confirmedAt`. This bypasses Scenario 3's Executive Committee confirmation workflow for appointed vacancy fills.
- Finding draft 3: Some membership-changing paths still use fail-open `logAuditEvent` after state changes (`committee/add`, `committee/requestAdd`, petition outcome recording, meeting creation). SRS §11.1 says audit is an immutable log of all changes; fail-open means a mutation can commit without an audit row.
- Finding draft 4: Updating `CommitteeGovernanceConfig.maxSeatsPerLted` updates the config used by capacity checks but does not backfill/remove seat records or recompute existing `Seat.weight`; roster views can continue to show stale seat counts/weights until another operation touches each committee.
- Finding draft 5: Changes report date range parses `dateTo` as midnight, so events later on the selected end date are excluded. This weakens the admin Changes report required by SRS §10.2 and Scenario 6 removal visibility.
