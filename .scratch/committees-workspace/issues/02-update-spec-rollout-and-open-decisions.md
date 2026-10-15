# 02 - Update the redesign spec's §14 and §16 to match the plan

Type: task
Status: resolved
Parent: ../map.md

## Question

Make `docs/SRS/COMMITTEES_WORKSPACE_REDESIGN_SPEC.md` agree with the plan before any code lands (plan §3.9, §3.10, §14 item 1):

- §14 Rollout: record that Phase A (transition engine consolidation) is deferred and the UI ships first on adapters over existing mutation endpoints. Renumber or annotate Phases B–F accordingly.
- §16 Open decisions: mark item 1 resolved (roster contact info stays Admin-only, matching `includeContact` in `api/committee/roster/route.ts`) and item 3 resolved (`/committees` fixed to the active term in v1). Leave items 2 and 4 open; item 4 is ticket 03 on this map.

AFK. Resolved when the spec edit is committed; the answer links the commit.

## Answer

Edited `docs/SRS/COMMITTEES_WORKSPACE_REDESIGN_SPEC.md` only. Phase letters were **annotated, not renumbered**: plan §3.9 and §8 and `map.md` cross-reference "Phase A"/"Phase E" by letter.

**§14 Rollout and Migration Plan**

- Added a lead-in blockquote citing plan §3.9: UI ships first; Phase A deferred; B/C/D/F proceed on thin adapters over the existing `add`/`requestAdd`/`remove` endpoints; Phase E out of scope for the UI migration; letters kept for cross-references; executed sequence is plan §14's PR list.
- Phase A: marked **Deferred (plan §3.9, §3.7)**, not a prerequisite, own effort after cutover; Admin replace stays remove-then-add (plan §8 "Replacement in v1"). Original bullets retained.
- Phase B: annotated *Now first (plan §5, PR 2)*.
- Phase C: annotated *Second (plan §6–§7, PRs 3–4)*.
- Phase D: annotated *Third (plan §8–§9, PRs 5–6)*; drawer uses adapters (plan §3.7); canonical command contracts arrive with Phase A.
- Phase E: annotated as not part of the UI migration; `/committees/requests` remains the review path and the Pending tab links to it (points at §16 item 2).
- Phase F: annotated *Fourth (plan §11, PR 7)*.

**§16 Open Decisions**

- Item 1: **Resolved (plan §3.10)** — roster contact info Admin-only, matching `includeContact = isAdmin` in `apps/frontend/src/app/api/committee/roster/route.ts`.
- Item 2: left open; noted out of scope for the UI migration (§14 Phase E).
- Item 3: **Resolved (plan §3.10)** — `/committees` fixed to the active term in v1, no switcher.
- Item 4: left open; noted it is being decided on this map (ticket 03).

Commit: made by the parent session (docs-only change, no code touched).
