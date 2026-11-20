# 26 - Write an audit row when an Admin edits a committee's LTED weight

Status: needs-triage

## Why

Follow-up from [02](02-weights-per-seat-and-weight-report.md) (PR #160). The LTED weight editor
(`PATCH /api/committee/updateLtedWeight`, `apps/frontend/src/app/api/committee/updateLtedWeight/route.ts`)
changes `CommitteeList.ltedWeight` and every seat's weight, but writes no `AuditLog` row. `CommitteeList` has
no `updatedAt` either.

So there is no record of who changed a weight, when, or from what. The PR #160 deploy needed to know whether
any weight had been typed in as a total rather than a per-seat value. The database couldn't say, and we had to
compare every value against the weighted table instead. The audit page's "Committee LTED weight" filter only
shows `WEIGHTED_TABLE_IMPORTED` rows.

## What to build

- In the same transaction as the update and `recomputeSeatWeights`, write an audit row for the committee:
  - entity `CommitteeList`, entity id the committee id;
  - before and after: `ltedWeight` (null allowed);
  - metadata: the active term id, and the number of seats recomputed.
- Pick the action: a new `AuditAction` value (e.g. `LTED_WEIGHT_UPDATED`, which needs a migration) or a
  reuse. Decide this in triage.
- Show the new rows under the audit page's "Committee LTED weight" filter, next to the import rows.
- Skip writing a row when the value doesn't change, or record it anyway. Decide which in triage.

## Acceptance criteria

- [ ] Saving a new LTED weight writes exactly one audit row with the old and new values and the acting Admin.
- [ ] Clearing the weight (null) is audited.
- [ ] If the audit write fails, the weight change rolls back, matching the other transactional audit writes.
- [ ] The audit page's LTED weight filter shows editor changes.
- [ ] Route tests cover the audit row. Follow `skills/auth-check-patterns/SKILL.md` for the Admin-only check
      and `skills/test-type-safety/SKILL.md` for the mocks.
