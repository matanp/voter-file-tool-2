# Phase 1 Scope Check Notes

**February 2026**

Notes from a full scope check of Phase 1 completion (diff against develop, targeted API/tests). Remediation tickets are in [tickets/](tickets/README.md) under **Phase 1 — Remediation**.

---

## Assumptions / Questions

1. **Phase 1 complete = CommitteeMembership as operational source of truth**  
   Assumed "Phase 1 complete" means `CommitteeMembership` is the authoritative model for committee state across *all* active flows (not only the four committee routes). If not, 1.R.4 and 1.R.5 scope may need adjustment.

2. **Replacement semantics**  
   If replacement was intentionally deferred, the done status for T1.1 and the current UI copy should be updated to reflect "planned" rather than "done" to avoid false completion. See [1.R.3](tickets/1.R.3-replacement-flow-not-implemented.md).

---

## Scope Checked

- Reviewed diff against develop in full ticket scope (Phase 0/1 + done test tickets)
- Targeted API/tests: targeted API suites passed; audit test suite fails as noted in [1.R.6](tickets/1.R.6-audit-tests-fail.md)
