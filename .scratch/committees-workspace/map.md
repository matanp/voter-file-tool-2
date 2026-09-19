# Committees workspace

Label: wayfinder:map

## Destination

The split-pane Committee Operations Workspace shipped as the unconditional `/committees` experience, with the old `CommitteeSelector` orchestration, inline `AddCommitteeForm`, and `/api/fetchCommitteeList` deleted — i.e. §13 of [the implementation plan](../../docs/SRS/COMMITTEES_WORKSPACE_UI_IMPLEMENTATION_PLAN.md) met.

## Notes

- Source plan: `docs/SRS/COMMITTEES_WORKSPACE_UI_IMPLEMENTATION_PLAN.md`. Its §3 Design Decisions are settled and are not re-litigated on this map; each ticket cites the plan section it executes rather than restating it. The redesign spec is `docs/SRS/COMMITTEES_WORKSPACE_REDESIGN_SPEC.md`.
- **Execution map.** This overrides wayfinder's plan-only default: the plan's decisions are made, so `task` tickets here *build* the PR sequence in plan §14, sized to one agent session each. Decision tickets (`prototype`, `grilling`) exist only where the plan is genuinely open.
- Domain: county committee membership. Glossary at `apps/frontend/CONTEXT.md`; keep it current via `domain-modeling` when a ticket names a new user-facing concept (e.g. the History tab's labels).
- Skills every session should consult: `auth-check-patterns` (read before any read-model, route, or role-gated UI ticket — mandatory per CLAUDE.md); `implement` for task tickets; `tdd` for the shell and drawer tests; `prototype` for ticket 01; `grilling` + `domain-modeling` for HITL tickets.
- Standing constraints (plan §5 requirements, §12.3 checklist): every route wrapped with `withPrivilege`/`withBackendCheck`/`withPublic`; server privilege decides authorization and PII, `actingPermissions` only client visibility; Zod validation in `lib/validations/committee.ts`; no parallel copy of vacancy/weight math; no virtualization or split-pane library. Run `pnpm --filter voter-file-tool test|lint|build` and `pnpm check:api-routes` before resolving any task ticket.
- Charted 2026-09-18 from the plan, on branch `clarify-member-contact-info`.

## Decisions so far

- Charting, Q1: execution map, not decision map — tickets are the plan's PR sequence plus the few open decisions.
- Charting, Q3: Phase 0 stays a live `prototype` ticket (Variant A only, plus a 375px pass); Variants B and C are built only on real disagreement.
- Charting, Q4: the interim detail layout (`docs/SRS/tickets/P2-committee-detail-interim-layout.md`) ships on its own ahead of this effort and is deleted by cutover; see Out of scope.
- Charting, Q5: spec §16 item 4 (`RequestAccess` as a submission role) is a `grilling` ticket blocking the drawer; item 2 (meeting-primary review timeline) is out of scope.
- Charting, Q6: shell splits into two tickets (flag + grid + URL state; detail loading + responsive nav + tests); detail tabs are one ticket each.
- Charting: membership history has in-repo sources (`CommitteeMembership.resignedAt/removedAt`, `AuditLog.action/metadata`, `MeetingRecord`), so the History inventory is an AFK `task`, not external `research`.

## Not yet specified

- What the grid looks like at Admin scale once real county-wide ED counts and the roster endpoint's page size are known: how town grouping interacts with cursor pagination, whether "load more" or auto-fetch on scroll, and what the header's scope-wide counts show while pages are still loading. Sharpens after the read-model and first shell tickets.
- Whether the drawer offers **Add another member** after success (plan §8 marks it optional). Decide once the drawer exists and someone has used it for repetitive entry.
- Whether the History tab is one merged timeline or sectioned (**Committee history** vs **Election outcomes**), and which user-facing labels enter the glossary. Depends on what the history inventory (ticket 04) finds is actually recoverable with actor/reason/meeting context.
- How the `?variant=` prototype code is removed: whether it ever merges to `main` or lives only on a branch that is deleted after the decision is captured.

## Out of scope

- **Command-service consolidation / atomic admin replace** (spec Phase A, plan §3.9 and §8 "Replacement in v1"): the UI ships on thin adapters over `add`/`requestAdd`/`remove`; Admin replace remains remove-then-add. Its own effort.
- **Meeting-centric review replacing `/committees/requests`** (spec §16 item 2, spec Phase E): `/committees/requests` stays for the whole migration; the Pending tab only links to it.
- **Interim detail layout** (`docs/SRS/tickets/P2-committee-detail-interim-layout.md`): a stopgap on the current `CommitteeSelector`, in progress on this branch, deleted by ticket 16.
- **Term switcher on `/committees`** (spec §16 item 3): resolved by plan §3.10 as fixed-to-active-term in v1.
