# 17: Distinguish already-active members from activations in plan and apply

**Status:** ready-for-agent

**Priority:** P2 (follow-up from the final branch review)

## Problem

The plan reports, and the apply performs, an "activation" for every eligible voter the file places
in a committee — including voters whose membership in that same committee is already `ACTIVE`.
Since dry-run-then-apply is now the intended workflow, re-running an unchanged roster is routine,
and today it reports N planned activations and writes N `MEMBER_ACTIVATED` audit events when
nothing has changed.

In `apps/frontend/src/app/api/admin/bulkLoadCommittees/bulkLoadUtils.ts`:

- `planRosterImport` already queries `activeMemberships` for every activation candidate
  (`bulkLoadUtils.ts:470`), but uses the result only for the active-elsewhere check. A voter
  already active *here* is pushed to `plan.activations` and counted in `counts.activations`
  exactly like a voter who would be newly seated.
- `applyRosterImport` finds the existing membership and, when one exists
  (`bulkLoadUtils.ts:935`), unconditionally runs `committeeMembership.update` setting
  `status: ACTIVE`, `seatNumber`, and nulling `confirmedAt`, `resignedAt`, `removedAt`,
  `rejectedAt`, `rejectionNote`, `resignationDateReceived`, `resignationMethod`,
  `removalReason`, `removalNotes`, `petitionVoteCount` and `petitionPrimaryDate`
  (`bulkLoadUtils.ts:958`), then logs `MEMBER_ACTIVATED` (`bulkLoadUtils.ts:971`) and appends to
  `applied.activations`. This runs even when the membership is already `ACTIVE` in this
  committee, so a re-import erases `confirmedAt`, `petitionVoteCount` and `petitionPrimaryDate`
  on members whose seat the file did not change, and adds a spurious audit event per member.

The nulling of those fields on reactivation is pre-existing from `main`; this branch inherited it.
What is new is that the plan claims these as activations, so the plan an Admin reads before
applying is not truthful about what will change.

## Change

Plan and apply both treat "already active in this committee" as its own outcome, not an activation.

In `planRosterImport`:

- Use the `activeMemberships` result to recognise voters whose active membership is in *this*
  committee (`committeeListId` matches the existing `CommitteeList` row).
- Do not push them to `plan.activations`. Record them separately — e.g. a per-committee
  `unchangedMembers: string[]` on `PlannedCommittee` and a top-level `counts.unchanged` — so the
  plan states how many members the file leaves as they are.
- `counts.activations` becomes the number of memberships the import would actually create or
  reactivate.

In `applyRosterImport`:

- When `existingMembership.status === ACTIVE_MEMBERSHIP_STATUS` for this committee, skip the
  `update`, skip the `MEMBER_ACTIVATED` audit event, and do not append to `applied.activations`.
  Count it under `applied.counts.unchanged` (or equivalent) so applied and planned can still be
  compared.
- Reactivation of a non-active existing membership (`REMOVED`, `RESIGNED`, etc.) keeps its current
  behaviour, including the field resets, which are the intended clean slate for a returned member.

Extend the shared response contract in
`packages/shared-validators/src/schemas/committeeRosterImport.ts` (`importCountsSchema`,
`appliedCountsSchema`, and `PlannedCommittee` if it is serialised) so the new count is on the
wire, and update `describeApplied` in `route.ts` if the message should mention unchanged members.

## Acceptance criteria

- [ ] A dry run of a roster whose members are all already active in their listed committees
      reports `counts.activations: 0` and the number of already-active members under the new
      count.
- [ ] Applying that roster performs no `committeeMembership.update`, logs no `MEMBER_ACTIVATED`
      event, and leaves `confirmedAt`, `petitionVoteCount` and `petitionPrimaryDate` intact on
      every already-active membership.
- [ ] A voter whose existing membership in the listed committee is not `ACTIVE` is still planned
      and applied as an activation, with the same field resets as today.
- [ ] A voter active in a *different* committee is still flagged active-elsewhere, unchanged.
- [ ] `applied.counts.activations` equals `applied.activations.length` and planned versus applied
      counts still reconcile (`activations + skippedActivations + unchanged`).
- [ ] The response schemas are updated and the route test parses the new bodies at runtime.

## Tests

- `apps/frontend/src/__tests__/api/admin/bulkLoadCommittees.plan.test.ts`: an active membership
  in the same committee is excluded from `plan.activations` and counted as unchanged; an active
  membership elsewhere is still flagged.
- `apps/frontend/src/__tests__/api/admin/bulkLoadCommittees.bulkLoadUtils.test.ts`: apply with an
  already-active membership makes no `update` call and no audit call for that voter, while a
  `REMOVED` membership in the same committee is still reactivated.
- `apps/frontend/src/__tests__/api/admin/bulkLoadCommittees.test.ts`: route response carries the
  new count and still satisfies `bulkLoadCommitteesResponseSchema`.

## Out of scope

- Changing which fields a genuine reactivation resets.
- Detecting seat-number or membership-type changes for already-active members as "updates".
- Persisting import plans or runs.
