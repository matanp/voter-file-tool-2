# Remaining work: lanes

Written 2026-10-14 at `fdddbda`. Supersedes waves 3–6 of [plan.md](plan.md). Waves 0–2 are merged. Run it with [run-prompt.md](run-prompt.md).

## Gate 0: settled 2026-10-14

- **17 → `wontfix`.** The branch merges to `main` once, after 16 deletes `CommitteeSelector`.
- **19 → `ready-for-agent`.** Read `primaryDate` and `seatNumber` only from the event's own audit metadata, and omit them when absent.
- **21 → resolved, no code.** Keep the Pending/History split.
- **Group C** is out of scope for this map (see [map.md](map.md) Out of scope). 11 shows Leaders what they see today, through one helper.
- **13:** no "Add another member" in v1.
- **16** deletes `_prototype/`.

## What's left

| # | Ticket | Lane | Main files |
|---|---|---|---|
| 13 | Drawer: add-member + submit-candidate | A | new `CommitteeActionDrawer`, `workspace/adapters.ts`, `RosterTab.tsx`, `CommitteeWorkspace.tsx` |
| 14 | Drawer: remove, resign, Leader replace | A | drawer, `adapters.ts`, `CommitteeSelector.tsx` (dialogs at ~1292+) |
| 20 | Failed grid refresh drops later pages | B | `workspace/useGridRefresh.ts` |
| 11 | Seats & Weight tab | B | `workspace/tabs/SeatsWeightTab.tsx` (stub), new `tabs/seats/*` |
| 18 | History limit counts dropped audit rows | C | `api/lib/membershipHistory.ts` `loadMembershipHistory` |
| 19 | Petition-outcome event reads current membership | C | `api/lib/membershipHistory.ts` `buildHistoryEvents` |
| 15 | Responsive and a11y verification | after lanes | 15a AFK agent, 15b human |
| 16 | Cutover and cleanup | last | `page.tsx`, deletions |

## Phase 1: three parallel lanes

Each lane is one agent session in its own worktree off `committees-workspace`, working its tickets in order.

### Lane A: drawer (critical path), 13 → 14

- Both tickets in one session, at least one commit per ticket. **Merge them together**: ticket 13's comment says roster actions are dead until both land, and merging both means no "hide until 14" step.
- 13 defines the full `CommitteeAction` union up front, including 14's kinds.
- Lane A owns `tabs/types.ts`, `CommitteeWorkspace.tsx`, and `CommitteeSelector.tsx`.

### Lane B: workspace UI fixes, 20 → 11

- 20 first: a small fix in `useGridRefresh.ts` plus one test in `CommitteeWorkspace.pendingRefresh.test.tsx`.
- Then 11: fill the `SeatsWeightTab.tsx` stub and add `tabs/seats/*`. Refresh only through what `CommitteeTabProps` already provides. **Don't edit `tabs/types.ts` or `CommitteeWorkspace.tsx`.** If 11 needs to, stop and report. Petitioned-seat display goes through one helper (Group C).

### Lane C: history read model, 18 → 19

- Both edit `membershipHistory.ts`, so they run in sequence. 18 restructures the fetch loop. 19 is a field-level change on top of it.
- Backend only, plus `detail.test.ts`.

### Hotspots

- `apps/frontend/CONTEXT.md`: append-only, and conflicts are trivial.
- Detail-response test fixtures: Lane C changes history construction, and Lanes A and B may build detail fixtures.

### Merge order

Merge each lane once its gates pass, smallest first: **C, then B, then A**. Don't hold a ready lane for an earlier one that's still running. Use one `merge: tickets NN, NN (wave 3, lane X)` commit per lane. After each merge, run the full gate on `committees-workspace`.

## Phase 2: 15, split

- **15a, AFK agent** (after all three lanes merge): automate what can be automated, and fix what fails. That means heading-hierarchy and focus-restore tests, a keyboard path through grid → tabs → row menu → drawer, no color-only state, and 375 / 768 / 1280 checks with the flag on. Write the checklist and its results into 15's Comments.
- **15b, human:** a manual pass on a real phone and with a screen reader, against that checklist. Then mark 15 resolved.

## Phase 3: 16, then PR

A second prompt runs this phase. Merge `main` in first (don't rebase, to keep the wave merge commits), do the deletions, confirm §13 line by line, run `/code-review` against `main`, and ask before opening the PR.

```
Lane A: 13 ─→ 14 ──────────┐
Lane B: 20 ─→ 11 ────┐     ├─→ 15a (AFK) ─→ 15b (human) ─→ 16 ─→ PR
Lane C: 18 ─→ 19 ─┐  │     │
                  └──┴─────┘  merge order C, B, A
```

## Gate commands

`pnpm --filter voter-file-tool test`, `… lint`, `… build`, and `pnpm check:api-routes`.
