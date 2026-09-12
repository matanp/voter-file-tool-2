# 09: Preserve the roster's membership type through discrepancy resolution

**Status:** resolved

**Priority:** P1 (production blocker from the branch code review)

**What to fix:** A canonical roster entry carries the county's `membershipType`, and the bulk
import writes it correctly when the row has no voter-file discrepancy. The value is lost when
the row becomes a `CommitteeUploadDiscrepancy`. If an Admin later accepts that discrepancy,
`handleCommitteeDiscrepancy` creates the membership as `APPOINTED`, or uses `APPOINTED` as the
fallback while reactivating an untyped membership. The incoming 2026–2028 roster is entirely
`PETITIONED`, so accepting any name or address discrepancy records the wrong way that member won
the seat.

Preserve the source membership type as typed data on every import-created discrepancy and use it
when acceptance creates or reactivates a membership. Prefer an explicit nullable
`incomingMembershipType` field on `CommitteeUploadDiscrepancy` over hiding domain state inside a
display-oriented discrepancy key. Mirror the Prisma schema change everywhere this repo requires,
and update the route's create and reset-on-upsert paths together.

Legacy discrepancy rows will have no incoming type. Keep their current `APPOINTED` fallback so
this migration does not reinterpret old imports. A membership that already has a non-null type
continues to keep it, matching the importer's existing reactivation rule.

The audit event must report the type actually written. Undo must continue restoring the complete
pre-resolution membership snapshot.

**Blocked by:** None

## Acceptance criteria

- [x] Every discrepancy produced from a canonical roster entry carries that entry's
      `membershipType` through persistence, including ordinary field mismatches, missing-voter
      discrepancies and apply-time active-elsewhere conflicts.
- [x] Accepting a `PETITIONED` discrepancy creates a `PETITIONED` membership; accepting an
      `APPOINTED` discrepancy creates an `APPOINTED` membership.
- [x] Reactivating an existing typed membership preserves its recorded type; reactivating an
      untyped membership uses the discrepancy's incoming type.
- [x] A legacy discrepancy whose incoming type is null retains the existing `APPOINTED` fallback.
- [x] `MEMBER_ACTIVATED` audit `afterValue` and membership-subject metadata describe the type
      actually written.
- [x] Rejecting a discrepancy writes no membership and leaves the incoming type attributable on
      the resolved discrepancy row.
- [x] Undo tests prove that accepting and undoing both create and reactivate outcomes restore the
      prior membership state.
- [x] Route tests drive the path from a roster entry through discrepancy persistence and acceptance;
      a unit test that injects the value directly into the resolution handler is not sufficient.

## Verification

- Run the bulk-import, discrepancy-resolution and discrepancy-undo test suites.
- Run `pnpm --filter voter-file-tool exec tsc --noEmit --pretty false`.
- Run the API trust-boundary check from the repository root.

## Out of scope

- Correcting membership types already written by earlier imports.
- Adding a persisted `CommitteeImport` run record or changing the discrepancy table's global
  VRCNUM uniqueness.

## Comments

`CommitteeUploadDiscrepancy` gained a nullable `incomingMembershipType` column
(migration `20260907000000_discrepancy_incoming_membership_type`), and
`DiscrepanciesAndCommittee` carries the same value as a required-but-nullable field, so every
place that builds a discrepancy has to state it. Planning sets it from the canonical entry for
field mismatches and missing-voter rows; `ensureImportDiscrepancy` takes it as a parameter, so
the duplicate-assignment and active-elsewhere flags carry it too, including the apply-time
flags raised inside the write transaction. The bulk-load route writes it on both the create and
the reset-on-upsert path.

Resolution reads `discrepancy.incomingMembershipType ?? "APPOINTED"`: a legacy row with no
incoming type keeps the historical reading rather than being reinterpreted. Creating a
membership uses that value; reactivating uses `existingMembership.membershipType ?? incoming`,
matching the importer's rule. The `MEMBER_ACTIVATED` audit event reports the type actually
written in `afterValue` and in the membership subject — `buildMembershipAuditSubject` now takes
an optional `membershipType`, included only when a caller states it.

Rejecting still writes no membership, and neither resolution nor undo touches
`incomingMembershipType`, so the row stays attributable after either.

New `committeeDiscrepancyMembershipType.test.ts` drives the real routes end to end: the import
route persists the discrepancy for a name mismatch, a missing voter and an active-elsewhere
conflict; the row it wrote is what the resolution route reads when accepting; and the
`resolutionMetadata` the acceptance recorded is replayed into the undo route for both the
created and the reactivated outcome. Reverting either resolution-side change fails that suite.
