# Working order and parallelization plan (conservative)

Written 2026-10-09. Ticket statuses and `Blocked by:` lines were re-checked against `issues/` on that date; the dependency graph in each ticket is unchanged.

## State

- Done: 01 (Variant A promoted, with B's mobile list↔detail navigation), 02, 04, 05, 06.
- Open: 03 (human grilling, `claimed`), 07–16.
- New cross-project dependency: [leader-petition-visibility/01](../leader-petition-visibility/issues/01-hide-petition-generation-and-outcomes-from-leaders.md) group B requires ticket 06's detail endpoint to omit `petition_outcome` history events for non-Admins (see ticket 06 Comments). Ticket 12 must not start before that lands.

Critical path: **07 → 08 → 09 → 13 → 14 → 15 → 16**.

## Ground rules

- Commit the working-tree ticket edits (01, 06, 12, 08 addendum) before creating worktrees.
- One worktree and one agent session per ticket. Merge each wave into `committees-workspace` before the next wave starts.
- At most 3 concurrent tickets, and only if they touch different files.
- Gate before resolving any ticket: `pnpm --filter voter-file-tool test|lint|build` and `pnpm check:api-routes`.
- Read `skills/auth-check-patterns/SKILL.md` before any role-gated work.

## Waves

| Wave | Tickets | Mode | Notes |
|---|---|---|---|
| 0 | **07** (shell part 1) ‖ **03** (RequestAccess grilling) ‖ **LPV-01** (leader-petition-visibility/01) | 07 agent; 03 human, no code; LPV-01 agent | LPV-01 first lands the detail-endpoint slice (group B: omit `petition_outcome` for non-Admins, with a serialized-body Leader test), so the response type settles before 08 consumes it. The rest of LPV-01 (report gates, report-server) touches no workspace files. If the agent session is large, split the endpoint slice out and do it first. |
| 1 | **08** (shell part 2) | Solo | Shared seam. Acceptance addendum requires per-tab stub files so 09–12 never touch a shared registry. |
| 2 | **09** (Roster) ‖ **10** (Pending) ‖ **12** (History) | 3 worktrees | 12 requires the LPV-01 endpoint slice merged. 12 also owns the `CONTEXT.md` edits this wave. |
| 3 | **13** (drawer: add and submit) ‖ **11** (Seats & Weight) | 2 worktrees | 13 needs 09 and 03. Move 11 after 14 if it touches the drawer or `adapters.ts`. |
| 4 | **14** (remove, resign, replace in drawer) | Solo | Shares the drawer and `adapters.ts` with 13, and edits `CommitteeSelector.tsx`. |
| 5 | **15** (responsive and a11y verification) | HITL, solo | Land any follow-up fixes before 16. |
| 6 | **16** (cutover and cleanup) | Solo | Rebase on latest `main` first. Deletes flag, `CommitteeSelector`, `AddCommitteeForm`, `/api/fetchCommitteeList`, `_prototype/`, interim layout. |

## Conservative choices

- 13 never overlaps 14. 13 defines the full `CommitteeAction` union up front, including the actions 14 implements.
- Open fog from the map is settled at gates, not in code: grid pagination and scale (07/08), "Add another member" (after 13), merged vs sectioned History (12).
- If 03 is slow it only blocks 13: run 11 and 12 ahead of it.

## Watch-outs from the petition-visibility work

- **Group C is unresolved** (is "Petitioned"/"Appointed" seat type a petition reference for Leaders?). Tickets 09 and 11 keep `isPetitioned`/`petitionedVacant` as-is until Avi answers. Keep that display behind one small helper so a later change is one edit. If the answer arrives mid-flight, revisit 09 and 11 before 15.
- **Ticket 03 interaction:** LPV-01 raises Designated Petition and Petition Outcomes to Admin, which removes them from RequestAccess users. 03's decision should account for that when it weighs the remaining RequestAccess-gated routes.
- 12's "Election outcomes" section is Admin-only and absent for Leaders. Test it through `actingPermissions`.
- `fetchCommitteeList` still leaks `submissionMetadata` to Leaders until 16 deletes it. Don't build anything on it.
