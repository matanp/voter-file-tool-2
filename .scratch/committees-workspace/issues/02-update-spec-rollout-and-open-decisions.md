# 02 - Update the redesign spec's §14 and §16 to match the plan

Type: task
Status: open
Parent: ../map.md

## Question

Make `docs/SRS/COMMITTEES_WORKSPACE_REDESIGN_SPEC.md` agree with the plan before any code lands (plan §3.9, §3.10, §14 item 1):

- §14 Rollout: record that Phase A (transition engine consolidation) is deferred and the UI ships first on adapters over existing mutation endpoints. Renumber or annotate Phases B–F accordingly.
- §16 Open decisions: mark item 1 resolved (roster contact info stays Admin-only, matching `includeContact` in `api/committee/roster/route.ts`) and item 3 resolved (`/committees` fixed to the active term in v1). Leave items 2 and 4 open; item 4 is ticket 03 on this map.

AFK. Resolved when the spec edit is committed; the answer links the commit.
