# 08: Treat a term-scoped committee identity as a value

**Status:** ready-for-agent

**Priority:** P2 hardening follow-up. This is not a merge or launch blocker while roster imports
remain strictly scoped to one resolved term: every identity in the current plan carries the same
`termId`, so the missing field cannot change today's result. Complete this before multi-term
planning, accepting externally constructed plans, or reusing these identity helpers outside the
single-term importer; any such change promotes this issue to a blocker. Because roster application
performs destructive reconciliation, keep the single-term invariant enforced and covered until
this lands.

**What to fix:** The importer identifies one `CommitteeList` row by four fields:
`cityTown`, `legDistrict`, `electionDistrict`, and `termId`. The database enforces that same
four-field identity with
`@@unique([cityTown, legDistrict, electionDistrict, termId])`, but the importer does not carry
the invariant through its in-memory operations.

Today `bulkLoadUtils.ts` uses the human label
`` `${cityTown}-${legDistrict}-${electionDistrict}` `` for three different jobs:

- `:133` — `formatCommitteeIdentity()` produces the label.
- `:300` — the accumulation map rebuilds that label inline and uses it as a key.
- `:561` — applying a plan compares two identities by comparing their labels.

The label omits `termId` and is not a total encoding: delimiter characters may occur in string
fields. Two term-scoped committees can therefore be distinct database records while comparing
or keying as the same value. A single import currently resolves one active term, so the defect is
masked by the call path rather than prevented by the types.

The label is also observable. It appears in `capacityFailures[].committee`, in the
`committeeAssignmentConflict` and `alreadyActiveInAnotherCommittee` discrepancy values, and in
the thrown capacity error. Keying concerns must not be allowed to change those strings.

## Domain language

For this work, **term-scoped committee identity** means the four fields that identify one
`CommitteeList` record. `RosterCommitteeIdentity` remains the parser's three-field value because
the importer supplies the resolved term. This ticket does not decide whether the natural-language
Committee is an enduring three-field entity across terms; use the term-scoped name when describing
the four-field value so those concepts are not silently collapsed.

## Design

Give the four-field value two representations with separate purposes:

1. **Canonical key.** Add an opaque `CommitteeIdentityKey` (a branded string is sufficient) and a
   single function that derives it from all four identity fields. Encode an ordered tuple, for
   example with
   `JSON.stringify([cityTown, legDistrict, electionDistrict, termId])`; delimiter joining is not a
   total encoding. The key preserves exact field values and performs no additional normalization.
2. **Display label.** Keep a presentation function that returns exactly
   `` `${cityTown}-${legDistrict}-${electionDistrict}` ``. Human-facing strings call this function
   and never inspect or render the canonical key.

Export an inferred type for the existing `committeeIdentitySchema` in shared validators and use
that type instead of repeating the four-field object shape locally. Keep the key and display
operations in the bulk-loader directory; extraction into a wider shared module can wait for a
second caller with the same term-scoped semantics.

Make the accumulation interface own its invariant. `accumulateCommitteeMember` accepts the
committee identity and derives the map key internally; callers no longer pass an independently
forgeable `mapKey`. Type the accumulation map with `CommitteeIdentityKey`, and narrow the stored
committee data to the identity fields it actually needs rather than the broader Prisma create
input when possible.

Remove the apply-time identity scan rather than replacing its display comparison with a second
field list. Build an activation index once from `plan.activations`, keyed by the canonical
committee key, then look up the current planned committee by that key. A small semantic equality
helper may compare canonical keys if another caller genuinely needs equality, but the canonical
key remains the single definition of which fields constitute identity.

## Observable compatibility

This is an internal refactor. It must not change the plan shape, database reads or writes,
transaction boundaries, audit behavior, discrepancy behavior, API response, or thrown capacity
message.

The following values remain byte-for-byte unchanged:

- `capacityFailures[].committee`
- `committeeAssignmentConflict.incoming`
- `alreadyActiveInAnotherCommittee.incoming`
- `Committee X-1-1 has N members, exceeding maxSeatsPerLted=M`

## Tests

Test identity behavior through the production interface rather than exporting implementation
details only for tests:

- Accumulating two identities that differ only by `termId` creates two map entries.
- A collision pair for naive delimiter joining creates two map entries. For example,
  `("A-1", 2, 3, "T")` and `("A", 1, 2, "3-T")` must key apart.
- Repeated equal identities accumulate into one entry.
- The plan retains the exact `committeeAssignmentConflict.incoming` label.
- The plan retains the exact `alreadyActiveInAnotherCommittee.incoming` label.
- Planning and applying retain the exact capacity-failure label and thrown message.
- The route response assertion continues to prove that the already-formatted capacity failure is
  passed through unchanged; planner tests are the proof that the formatter itself did not move.

Update the existing accumulation tests to use the new interface instead of preserving their
manually supplied three-field keys.

## Acceptance criteria

- [ ] The four-field TypeScript type is inferred from `committeeIdentitySchema` and reused by the
      importer.
- [ ] A canonical, opaque key includes all four fields through an unambiguous ordered encoding and
      performs no normalization.
- [ ] The accumulation map is typed with that key, and `accumulateCommitteeMember` derives the key
      from its committee argument rather than accepting a separate string key.
- [ ] Applying builds a canonical-key activation index once and performs no identity comparison
      through display text.
- [ ] Display has its own function and all four observable strings listed above remain exact.
- [ ] Tests prove equal accumulation, term separation, delimiter-collision resistance, and every
      human-facing compatibility requirement.
- [ ] Existing plan, importer, route, and accumulation behavior passes after the accumulation tests
      are updated to cross the new interface.

## Out of scope

- A class-based value object or a generic compound-key framework.
- Changing `RosterCommitteeIdentity` to include a term.
- Changing the `ImportPlan` or API response shape.
- Replacing Prisma compound unique inputs, which already represent the four fields structurally.
- Rewriting other `cityTown`/district maps. Some are intentionally scoped to one term or normalize
  source data and therefore encode different semantics; assess them separately before sharing this
  key.
