# SRS Branch Code Review

Date: 2026-07-06  
Branch: `feat/srs-implementation`  
Reviewer: Codex

> **Status update (2026-07-08):** This is the original point-in-time review. Two findings have since been fixed:
> - **P1 — membership flows commit when audit writes fail** → resolved in `68e8193` (fail-closed `logAuditEventOrThrow`).
> - **P2 — Changes report excludes events on the end date** → resolved in `0c2e168` (inclusive end date).
>
> The three remaining open findings (requestAdd scope, admin direct-add, seat reconciliation) are tracked in `fix-plans/2026-07-06-srs-branch-findings-confirmation.md`. Resolved findings below are marked inline; the doc is otherwise preserved as-is.

## Scope

This review checks the current branch implementation against:

- `docs/SRS/SRS_v0.1_Committee_Membership_Governance.md`
- `docs/SRS/SRS_ADDITIONAL_REQUIREMENTS_Governance_Config.md`

Prior SRS assessments, traceability docs, tickets, and roadmap notes were used as maps, but findings below are based on direct code review.

Command run:

- `pnpm run check:api-routes` — passed: 66 methods across 57 route files are wrapped.

Full test suite was not run. This was a code-review pass, not a test execution pass.

## Merge Stance

Do not merge as fully SRS-compliant until the P1 findings are resolved or explicitly accepted as product deviations. The branch has strong coverage of the SRS objects and many workflows, but several current paths can bypass jurisdiction scope, Executive Committee confirmation, or durable audit expectations.

## Findings

### P1 — RequestAccess users can submit committee requests outside any jurisdiction

Requirement:

- SRS §3.2: local committee leaders have access limited to assigned jurisdictions.
- SRS §11.2: jurisdiction-scoped authorization for leaders.
- Roadmap §3.1 states `committee/requestAdd` should require `Leader`, and leaders can only submit to their jurisdiction.

Evidence:

- `apps/frontend/src/app/api/committee/requestAdd/route.ts:124` only applies jurisdiction checks when `userPrivilegeLevel === PrivilegeLevel.Leader`.
- The route is exported as `withPrivilege(PrivilegeLevel.RequestAccess, ...)` at `apps/frontend/src/app/api/committee/requestAdd/route.ts:345`.
- The create path writes a `SUBMITTED` membership at `apps/frontend/src/app/api/committee/requestAdd/route.ts:304`.
- The happy-path test uses `PrivilegeLevel.RequestAccess` and expects success at `apps/frontend/src/__tests__/api/committee/requestAdd.test.ts:68`.
- Roadmap context says `RequestAccess = invited, not yet assigned jurisdictions` and `committee/requestAdd` should require Leader at `docs/SRS/SRS_IMPLEMENTATION_ROADMAP.md:566` and `docs/SRS/SRS_IMPLEMENTATION_ROADMAP.md:577`.

Impact:

A RequestAccess user can submit a candidate to any active-term committee by POSTing city/town, LD, and ED. This is a server-side scope violation, not just a UI issue.

Recommendation:

Change `/api/committee/requestAdd` to require `PrivilegeLevel.Leader` or make every non-admin path load and enforce `UserJurisdiction`. Add negative tests for RequestAccess, Leader with no jurisdictions, Leader out-of-scope, and Leader in-scope.

### P1 — Admin direct-add bypasses Executive Committee confirmation

Requirement:

- SRS §6.4: vacancies are filled via Executive Committee vote, and confirmation is recorded against a meeting record.
- Scenario 3: admin selects candidates approved at a meeting; status moves Submitted -> Confirmed; confirmation date and meeting reference are stored; member becomes Active.

Evidence:

- Admin UI calls the direct add mutation from `AddCommitteeForm` at `apps/frontend/src/app/committees/AddCommitteeForm.tsx:253`.
- `/api/committee/add` creates or updates `CommitteeMembership` directly to `ACTIVE` at `apps/frontend/src/app/api/committee/add/route.ts:226` and `apps/frontend/src/app/api/committee/add/route.ts:271`.
- Reactivation explicitly clears `confirmedAt` at `apps/frontend/src/app/api/committee/add/route.ts:236`.
- New direct-add records set `activatedAt` but no `confirmedAt` or `meetingRecordId` at `apps/frontend/src/app/api/committee/add/route.ts:276`.

Impact:

An appointed vacancy fill can become an active committee member without a submitted request, Executive Committee meeting, confirmation timestamp, or meeting reference. That conflicts with the core defensibility workflow in Scenario 3.

Recommendation:

Retire direct activation for appointed vacancy fills. Admin “submit on behalf” should create `SUBMITTED` records, then use the meeting decision flow. If an emergency direct activation remains, require `meetingRecordId`, set confirmation fields, emit `MEMBER_CONFIRMED` and `MEMBER_ACTIVATED`, and label it as an audited override.

### P1 — Several membership-changing flows still commit when audit writes fail — RESOLVED (`68e8193`, 2026-07-08)

Requirement:

- SRS §11.1: audit trail is an immutable log of all changes and records user, role, action, timestamp, and before/after values.

Evidence:

- `logAuditEvent` catches audit write errors and does not rethrow because `throwOnError` is false at `apps/frontend/src/lib/auditLog.ts:72`.
- `requestAdd` creates/resubmits memberships and then calls fail-open `logAuditEvent` at `apps/frontend/src/app/api/committee/requestAdd/route.ts:282` and `apps/frontend/src/app/api/committee/requestAdd/route.ts:317`.
- `committee/add` writes direct activation and then calls fail-open `logAuditEvent` inside the transaction at `apps/frontend/src/app/api/committee/add/route.ts:292`.
- Petition outcome recording updates/creates memberships and seats, then uses fail-open `logAuditEvent` repeatedly at `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:218`, `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:284`, and `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts:344`.

Impact:

If audit insertion fails, these mutations can still commit. That means the system can change membership status, activate members, or record petition outcomes without the audit row the SRS requires.

Recommendation:

Use `logAuditEventOrThrow` for all compliance-critical membership and petition mutations, inside the same transaction as the state change. Keep fail-open only for explicitly non-critical telemetry-style events, and document that policy.

### P2 — Changing maxSeatsPerLted does not reconcile existing seats or weights

Requirement:

- Governance config §2.2 says `maxSeatsPerLted` affects capacity checks, seat model creation, and `seatWeight = ltedWeight / maxSeatsPerLted`.

Evidence:

- The governance config route updates only the singleton config at `apps/frontend/src/app/api/admin/governance-config/route.ts:156`.
- Seat creation is only performed by `ensureSeatsExist`, which exits when existing seat count is already greater than or equal to the configured max at `apps/frontend/src/app/api/lib/seatUtils.ts:47`.
- Weight recomputation divides by the current max at `apps/frontend/src/app/api/lib/seatUtils.ts:131`, but the governance config update route never calls it.
- Roster row construction uses persisted seats whenever any seats exist, only synthesizing from `maxSeatsPerLted` when there are zero seats at `apps/frontend/src/app/api/committee/roster/buildSeatRosterRows.ts:85`.

Impact:

After changing max seats from 4 to 6, existing committees with four seat rows still render as four-seat committees until another write path creates missing seats. After changing 4 to 2, stale extra seats and stale per-seat weights can remain visible. Capacity checks and roster/weight presentation can disagree.

Recommendation:

When `maxSeatsPerLted` changes, run a transaction that reconciles all active-term committees: create missing seat rows when increasing, define policy for extra seats when decreasing, and recompute weights for every committee with `ltedWeight`. Add integration tests for 4 -> 6 and 4 -> 2.

### P2 — Changes report excludes events later on the selected end date — RESOLVED (`0c2e168`, 2026-07-08)

Requirement:

- SRS §10.2 requires Changes reports.
- Scenario 6 requires confirmed removals to appear in the Changes report.

Evidence:

- `fetchChangesData` parses `dateTo` with `new Date(dateTo)` at `apps/report-server/src/committeeMappingHelpers.ts:457`.
- The query uses `lte: toDate` for `removedAt`, `resignedAt`, `activatedAt`, etc. at `apps/report-server/src/committeeMappingHelpers.ts:470`.
- Row filtering repeats `m.removedAt <= toDate` and similar checks at `apps/report-server/src/committeeMappingHelpers.ts:526`.
- Current tests only cover invalid dates and missing jurisdiction at `apps/report-server/src/__tests__/committeeMappingHelpers.test.ts:631`.

Impact:

For a date range like `2026-07-06` to `2026-07-06`, `toDate` is midnight at the start of July 6. A removal at noon on July 6 is excluded, even though users naturally expect the end date to be inclusive.

Recommendation:

Treat date ranges as `[startOfDay(dateFrom), startOfNextDay(dateTo))`, or explicitly append end-of-day for date-only inputs. Add tests for events at midday and 23:59 on `dateTo`.

## Positive Coverage

- Core SRS data models exist: `CommitteeTerm`, `CommitteeMembership`, `Seat`, `MeetingRecord`, `EligibilityFlag`, `AuditLog`, and `CommitteeGovernanceConfig`.
- The meeting decision flow revalidates eligibility and uses the shared `confirmSubmittedMembership` transaction.
- Removal/resignation and eligibility-flag review paths use fail-closed audit writes.
- Scoped report generation validates leader jurisdiction before queueing jobs, and report-server fetchers apply scope filters.
- The API trust-boundary wrapper check passed.

## Checklist Assessment

- Trust boundary: wrapper check passed, but route-level policy gaps remain in `/api/committee/requestAdd`.
- Negative auth: missing tests for RequestAccess submission denial and out-of-scope non-admin submissions.
- State race: core add/confirm capacity paths use row locking; governance config reconciliation is incomplete.
- Validation: reviewed SRS routes generally use Zod/shared validators.
- Data scope: report scoping is mostly solid; request submission scope is not.
- Audit/state invariants: several membership-changing paths remain fail-open for audit writes.

## Suggested Fix Order

Remaining open items (see `fix-plans/2026-07-06-srs-branch-findings-confirmation.md`):

1. Lock down `/api/committee/requestAdd` to Leader+jurisdiction or equivalent non-admin scoping.
2. Replace/admin-gate direct activation through the meeting confirmation flow.
3. Reconcile seats/weights on governance config max-seat changes.

Resolved:

- ~~Convert membership and petition mutations to fail-closed audit writes.~~ Done in `68e8193`.
- ~~Fix inclusive date handling in Changes reports and add regression tests.~~ Done in `0c2e168`.
