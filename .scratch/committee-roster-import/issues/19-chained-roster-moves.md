# 19: Support chained moves through full committees in roster import

**Status:** ready-for-agent

**Priority:** P2

## Problem

In a valid roster chain A→B→C, B may be full until its member moves to C. If A is processed first, `removeStaleMembers` deliberately excludes B's outgoing mover from stale removals. B therefore still has no free seat when A's mover is activated there, and `assignNextAvailableSeat` throws even though the final roster fits each committee's capacity. This limitation also existed before the source-first change.

## Done when

- A full A→B→C chain with room in C applies successfully regardless of source-file committee order.
- Each voter has at most one active membership per term throughout committed state; removals and activations remain attributable in the audit log.
- Planned and applied counts match the completed moves, without duplicate removals or activations.
- Focused tests cover the full intermediate committee and both processing orders.

If a move cycle cannot be completed safely, detect and report it before any membership write rather than failing partway through apply.
