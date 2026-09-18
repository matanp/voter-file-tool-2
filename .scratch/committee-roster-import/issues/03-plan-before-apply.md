# 03: Computing what an import would do, separately from doing it

**What to build:** An Admin can find out what an import will do before it changes anything.
Today the only way to learn that is to let it happen: the importer writes as it goes and
removes any membership absent from the file, so a misread file destroys the roster silently.

Split the importer into two stages over the same data. **Planning** reads the database and
computes, without writing: the entries that would activate a membership, the currently-active
memberships absent from the file that would be removed and who they are, the entries that would
become discrepancies and why, the rows the parser rejected with their row numbers and reasons,
and counts of each. It performs the same checks the import performs today — voter exists, voter
not already active in another committee for the term, no voter assigned to two committees within
the one file, per-committee capacity against the configured seat maximum — recording each as a
planned outcome rather than acting on it. Capacity overflow stays a hard failure of the whole
import, naming the committee, surfaced on the plan.

**Applying** takes those entries and performs the writes exactly as today: upsert each
committee, ensure seats exist, remove absent memberships with the existing removal reason and
audit event, activate or create memberships with seat assignment, write discrepancy records,
and emit the same audit events with the same metadata. Row-level locking on the committee and
the transaction boundaries around each committee's reconciliation are unchanged.

The plan is data, not a database record — computed and returned within one request. Persisting
import runs is out of scope. An apply recomputes rather than trusting a plan handed back to it,
because the database can change between the two.

**Blocked by:** 02

**Status:** resolved

- [x] Planning computes activations, removals (with the identities of who would be removed),
      discrepancies with reasons, rejected rows, and counts, without writing to the database
- [x] Planning applies the same checks the import applies today, recording each as a planned
      outcome; a committee over the seat maximum fails the import with a message naming it
- [x] Applying performs today's writes, audit events, metadata, locking and transaction
      boundaries unchanged
- [x] Applying recomputes from entries rather than accepting a plan as an input
- [x] The existing importer test scenarios carry over as plan assertions — clean roster, voter
      missing from the voter file, voter active in another committee, voter twice in one file,
      active member absent from the file, committee over the seat maximum — reusing the
      existing mock helpers for voters, memberships, audit assertions and the active term
- [x] The existing membership create, membership update and audit log write assertions still
      hold, now driven from a plan
- [x] The pure accumulation helper's existing unit cases survive, either in place or moved up
      into the planning tests

## Comments

`bulkLoadUtils.ts` now exposes `planRosterImport(parseResult, actor)` and
`applyRosterImport(parseResult, actor)`. Applying calls planning and then writes; it never
takes a plan as an input, so a plan an Admin looked at cannot be replayed against a
database that has since moved.

- `ImportPlan` carries `term`, `maxSeatsPerLted`, `committees`, `activations`, `removals`
  (membership id, VRCNUM, the person's name, and the committee), `discrepancies`,
  `rejectedRows`, `capacityFailures`, and a `counts` block (entries, matchedVoters,
  activations, removals, discrepancies, rejectedRows).
- Planning reads: the voter record per entry, the cross-committee active-membership
  snapshot, each committee's existing `CommitteeList` row, that committee's currently
  active memberships, and one `voterRecord.findMany` to name the removals. It writes
  nothing — asserted directly, not inferred.
- Capacity is now a hard failure **before any writes**, rather than mid-loop after earlier
  committees had already been committed. The thrown message is unchanged
  (`Committee X-1-1 has N members, exceeding maxSeatsPerLted=M`), and the plan lists every
  offending committee rather than only the first one reached.
- Planning decides "already active in another committee" from the snapshot. Applying keeps
  both live guards inside the transaction — `isVoterActiveInAnotherCommittee` and the
  unique-constraint catch — so a race still lands as a discrepancy rather than a bad write.
  A voter planning has already ruled out is skipped in the write loop by consulting the
  plan rather than by re-deriving the reason.
- Writes, audit events, metadata, the `FOR UPDATE` committee lock and the per-committee
  transaction boundary are byte-for-byte what they were; the existing membership create,
  membership update and audit assertions still pass unchanged (see
  [[04-membership-type-from-file]] for the one assertion that deliberately changed).
- New `bulkLoadCommittees.plan.test.ts` carries the six scenarios over as plan assertions
  and adds a rejected-rows-on-the-plan case; `accumulateCommitteeMember`'s own unit test
  survives in place.
