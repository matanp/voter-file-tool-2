# 04 - Inventory what membership history is recoverable today

Type: task
Status: open
Parent: ../map.md

## Question

For the detail endpoint (ticket 06) and the History tab (ticket 12): which of "additions, replacements, resignations, removals with actor, date, reason, and meeting context" (plan §5, §7.4) can actually be assembled from existing data, and from where?

Known sources: `CommitteeMembership` (`status`, `resignedAt`, `removedAt`, `submissionMetadata.removeMemberId`), `AuditLog` (`action`, `metadata`), `MeetingRecord`, and the petition-outcome context `fetchCommitteeList` already returns. Produce, as a short committed artifact under `.scratch/committees-workspace/`:

- For each history event kind, the table(s) and columns it comes from, and which of actor / date / reason / meeting context are present, derivable, or absent.
- Whether `AuditLog` is queryable per committee (what its target/scope columns are) and whether it is PII-bearing for non-Admin readers.
- Any event kind that cannot be reconstructed at all, so ticket 12 can drop it honestly rather than fake it.

AFK. This decides nothing itself; it is the fact base for 06 and 12.
