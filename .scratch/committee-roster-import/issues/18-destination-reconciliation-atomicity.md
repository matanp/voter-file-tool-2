# 18: Keep destination reconciliation atomic during source-first roster moves

**Status:** ready-for-agent

**Priority:** P2

## Problem

When a source committee is processed before a mover's destination, `applyRosterImport` removes stale destination members and activates the mover in the source committee's transaction (`bulkLoadUtils.ts`, at the `removeStaleMembers` call). That transaction commits before the destination committee processes its other members. If the destination's later transaction fails, the earlier removal and activation remain committed. Before the source-first change, those destination writes were in the destination's transaction and rolled back together.

This breaks the per-committee reconciliation boundary described in `.scratch/committee-roster-import/spec.md` under **Plan and apply**.

## Done when

- A destination's stale removals, incoming move, and remaining reconciliation commit together, or all roll back when its reconciliation fails.
- Source-first imports can still free a mover's source seat for a newcomer, and a full destination can still free a stale member's seat for the mover.
- Removal and activation audit events and applied counts describe only committed writes.
- A regression test forces a failure after the destination's early cleanup and proves that no partial destination changes remain.

An import-wide transaction is not required; preserve the documented committee-level boundary.
