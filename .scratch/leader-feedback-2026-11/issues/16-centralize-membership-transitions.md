# 16 - Centralize membership transitions

Status: needs-triage

## Why

Ticket 01 introduced `writeMembershipExit` and `writeMembershipLeavingActive` so every path that moves a
membership out of `ACTIVE` clears an Exit Report consistently. The persistence invariant is centralized, but
the complete transition still spans each workflow: the caller chooses the transition, writes workflow-specific
fields, selects an audit action, and constructs audit metadata.

That distribution is currently correct, but the next cross-cutting membership invariant would again require
finding and editing bulk import, eligibility review, replacement acceptance, petition outcomes, discrepancy undo,
and direct Admin actions. This ticket decides whether those call sites should share a deeper transition service.

## Design question

Can one domain interface own a membership transition and its audit record without becoming a switchboard for
unrelated workflows?

Explore an interface shaped around domain causes rather than raw Prisma data, for example:

```ts
transitionMembership(tx, {
  membership,
  transition: { kind: "removed", cause: "bulk_import_sync", reason: "OTHER" },
  actor,
});
```

The interface should make the legal state transition, timestamps, exit/report clearing, audit action, and common
metadata exhaustive. Workflow-specific orchestration stays with the caller.

## Investigation

1. Inventory every production write to `CommitteeMembership.status` and group it by domain transition and cause.
2. Identify which audit fields are invariant and which genuinely belong to a workflow.
3. Prototype the interface against at least direct removal, bulk synchronization, replacement acceptance, and
   petition loss. Reject the design if adding one cause requires editing a central switch plus multiple unrelated
   modules.
4. Decide whether the existing two helpers are already the deepest useful seam. Record that decision rather than
   forcing a refactor.

## Out of scope

- Changing Exit Report storage or replacing `exitReportedAt` as its concurrency token.
- Changing membership behavior, audit history, privilege rules, or API contracts.
- Combining unrelated workflow transactions.

## Acceptance criteria

- [ ] Every production membership-status write is inventoried and assigned to an owning domain operation.
- [ ] A proposed interface demonstrates how state, Exit Report invariants, and audit invariants stay atomic.
- [ ] The proposal keeps workflow-specific policy out of the shared module.
- [ ] The decision is recorded in an ADR or in this ticket with concrete examples and migration steps.
- [ ] If implemented, existing behavior tests remain at API/workflow seams and every direct status write is removed
      or explicitly documented as outside the transition service.

## Comments

- 2026-11-02: Split from the review of ticket 01. This is a design follow-up, not a blocker for Exit Reports.

