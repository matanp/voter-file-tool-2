# One-off orchestrator prompts

Paste each prompt into a **fresh** Claude Code session at the repo root, on branch `committees-workspace`.

---

## Prompt 1: lanes A, B, and C, then 15a

```
You are the orchestrator for the rest of the committees workspace. Your job is to dispatch, merge,
and gate. You do not implement tickets, and you keep this thread lean: don't read source files or
ticket bodies yourself beyond what merging needs. Subagents do the work and report back briefly.

Read only these: .scratch/committees-workspace/lanes.md (the plan) and the "Notes" section of
.scratch/committees-workspace/map.md (standing constraints, gate commands).

1. Check that committees-workspace has no uncommitted changes to tracked files and nothing uncommitted
   under .scratch/committees-workspace/. Other untracked files are fine. If the check fails, stop and tell me.

2. Launch three background subagents at once, each with isolation: "worktree". Give each one only
   the prompt below, with LANE / TICKETS filled in:

     Lane A — tickets 13 then 14
     Lane B — tickets 20 then 11
     Lane C — tickets 18 then 19

   --- lane prompt ---
   You are implementing Lane <LANE> of .scratch/committees-workspace/lanes.md: tickets <TICKETS>,
   in that order, under .scratch/committees-workspace/issues/. Read lanes.md (your lane section,
   Hotspots, and Gate commands), the Notes section of map.md, then each ticket when you start it.
   Follow the `implement` skill per ticket, using `tdd` at the seams the ticket names. Read
   skills/auth-check-patterns/SKILL.md before any role-gated or read-model work.
   - Respect your lane's file rules. If you need to edit a file another lane owns, stop and report.
   - Per ticket: typecheck plus the touched test files while you work. Commit when the ticket is done,
     with its `## Answer` written and `Status: resolved` in the same commit.
   - After the last ticket: run the full gate (all four commands in lanes.md). Then run the
     `code-review` skill against your lane's base commit, fix what it finds, and re-run the gate.
   - Never push. Never merge into committees-workspace yourself.
   - Final report, at most 10 lines: worktree branch name, commits, gate results, review findings
     fixed or deferred, and anything flagged for the orchestrator.
   --- end lane prompt ---

3. Merge as lanes report success, in the order C, then B, then A. If a later lane finishes first,
   wait only for the earlier lanes that are still running, then merge in order. For each lane:
   - `git merge --no-ff <lane branch> -m "merge: tickets NN, NN (wave 3, lane X)"`
   - On conflicts, use the `resolving-merge-conflicts` skill. CONTEXT.md conflicts are append-both.
   - Run the full gate on committees-workspace. If it fails because of the merge, fix it here. If the
     lane's own code is wrong, SendMessage the lane agent with the failure and wait for its fix.
   - If a lane reports a stop (a file-ownership conflict, or a decision it can't make), relay it to me
     verbatim and keep the other lanes going.

4. Once all three lanes have merged and the gate is green, launch one more background subagent
   (isolation: "worktree") for 15a:

   --- 15a prompt ---
   Do part 15a of .scratch/committees-workspace/lanes.md (Phase 2) for ticket
   .scratch/committees-workspace/issues/15-responsive-and-accessibility-verification.md.
   Automate every check in plan §10 you can: tests for the heading hierarchy (h1/h2/h3), focus
   trap/restore/Escape on the drawer, a keyboard path through grid → tabs → row action menu →
   drawer, no state conveyed by color alone, and no horizontal overflow at 375/768/1280 (use the
   `run` skill to launch the app with COMMITTEES_WORKSPACE on, and screenshot each width). Fix what
   fails, with at least one commit per fix. Write a checklist into ticket 15's Comments: each
   check, how it was verified (automated test / screenshot / not automatable), and the result.
   Leave Status open: a human does the manual pass (15b). Run the full gate before reporting.
   Never push. Report at most 10 lines: branch, commits, gate, and the checks left for the human.
   --- end 15a prompt ---

   Merge it the same way (`merge: ticket 15a (wave 4)`) and run the full gate.

5. Stop. Report to me, briefly: what merged, the final gate results, anything deferred, and the list
   of manual checks for 15b (point to ticket 15's Comments rather than restating them). Then list
   the stale worktrees from `git worktree list` and offer to remove them. Don't remove them unasked.

Rules: never push or open a PR. Never change ticket decisions recorded under Gate 0 in lanes.md.
Run at most 4 subagents at once.
```

---

## Prompt 2: cutover (after you've done 15b and marked 15 resolved)

```
Implement ticket .scratch/committees-workspace/issues/16-cutover-and-cleanup.md with one
background subagent (isolation: "worktree"), and keep this thread lean.

Its prompt: Read the ticket, the Notes section of .scratch/committees-workspace/map.md, and
lanes.md Phase 3. First merge main into the branch (don't rebase: that would flatten the wave merge commits) and
resolve conflicts with `resolving-merge-conflicts`. Follow
`implement`. Delete everything the ticket lists, including `_prototype/`. Confirm every §13
completion criterion in the ticket's Answer, one line each. Run the full gate. Run `code-review`
against main, fix what it finds, and re-run the gate. Commit, never push. Report at most 10 lines.

When it reports, fast-forward committees-workspace to its branch, re-run the
full gate here, and give me a summary. Then ask whether to push and open the PR against main.
```
