# 01 - Repo-owned `code-review` skill (replaces the vendored one)

Status: needs-triage
Type: task
Source: transcript analysis, 2026-11-20 (see ../README.md)
Absorbs: 06

## Problem

"Blind review" is the most repeated instruction of the month (about 40 times, about 30 sessions). It's
handled two ways, both weak:

- Hand-written reviewer prompts, about 20 different ones. Of 107, only 7 stop the reviewer from reading the
  PR description, so reviewers passed on implementer claims ("the PR says the tests pass") without checking.
- The vendored `/code-review`. It has no bug-hunt axis, so in one session the agent added its own
  "Correctness" pass, and that pass found the main defect. It finds the spec through commit messages, so it
  isn't blind. It stops at a report, but in 10 of 21 runs the next message was "fix everything".
  It also can't be extended: it lives in a gitignored, hash-pinned folder (`skills-lock.json`) that
  worktrees don't have.

## What "blind" means

Not a separate kind of review. It means what a good review should have by default:

1. A fresh reviewer: a new subagent, not a fork, sharing none of the implementer's context.
2. No trust in the implementer's account: it doesn't read the PR description, commit messages, the ticket's
   `## Comments` or any existing `*review*.md`. It works out the intent from the diff, and checks claims
   itself instead of repeating them.
3. It hunts for bugs, not just style or spec conformance.

## What the skill does

1. **Scope.** Accept uncommitted changes, a SHA range, a branch, or a PR number (`git fetch origin
   pull/N/head:pr-N`). List the in-scope files explicitly and tell reviewers to ignore everything else
   (there are almost always unrelated `.scratch` edits). Commit locally first when possible so reviewers see
   a fixed SHA.
2. **Pre-checks:** `scripts/check-changed.sh <files>`, run before spending a reviewer. It matches the
   `verify` list in `scripts/overnight/adapter.ts`:
   - tsc, `jest --findRelatedTests`, eslint
   - prettier only on files that were clean at HEAD
   - a grep for test casts (`as jest.Mock`, `as never`, `as unknown as`)
   It also prints `deploy-sensitive: yes|no`, based on `prisma/`, raw SQL and route config.
   Pre-existing failures are checked in a throwaway worktree, never with `git stash`.
3. **Round 1: two reviewers in parallel.**
   - *Correctness and standards*: sees the diff and repo docs only (CLAUDE.md, AGENTS.md, CONTEXT.md,
     `docs/adr/`, `skills/test-type-safety`, plus `skills/auth-check-patterns` if a route or role-gated UI is
     touched). It looks for:
     - bugs
     - every consumer of anything whose meaning changed
     - auth or PII leaks to a lower role
     - Next.js server/client boundary problems
     - accessibility problems
     - "would the tests pass if the code were broken?"
     - the smell baseline, carried over from the vendored skill as judgement calls
     - when `deploy-sensitive: yes`, deploy safety: migration or `prisma generate` needed, raw SQL casts vs
       real column types, transaction timeout vs `maxDuration`, operator steps after deploy
   - *Spec*: sees the diff and the ticket body only. If there's no ticket it is skipped, and the report says so.
   - Both are read-only: no edits, commits, pushes, PR comments, stash/switch or database access. Probes go in
     the scratchpad.
   - Both follow the same report contract: blocker / should-fix / nit, each with file:line, a failure scenario
     and a fix. Every claim is verified and speculation is dropped. Under ~400 words. End with exactly CLEAN or
     NOT CLEAN.
   - An optional "known and accepted" list stops reviewers re-flagging settled decisions.
4. **Report.** Keep the two axes separate and don't rerank across them. The result is CLEAN only if neither
   axis has a should-fix item.
5. **Follow-through, only when the request asks for it.** Otherwise end by offering it.
   - *Fix and commit*: fix whatever survives your own check of the reviewer's claims. Re-run
     `check-changed.sh`. A round 2 is one fresh reviewer on the fix commits only, given the ticket too if a fix
     changes behaviour. At most 2 rounds unless asked. `git add` explicit paths only; commit with a heredoc
     message.
   - *Push or open a PR*: only if the request says so (see 19).
   - *Merge readiness* (from 06):
     - `gh pr checks`, merge state, unresolved threads
     - a trial merge with `origin/main`
     - `TZ=UTC jest`, plus `test:pg` when SQL changed (04)
     - `.scratch` merge-blocker tickets
     - whether the change was exercised in the real app
     - a verdict with a fix-now vs ticket-later list and deploy order
     - for each *kind* of bug found, whether it can become a lint rule, type, test or script; offer to ticket it
       (from 22)
   - *Write the review* to `.scratch/<feature>/reviews/<target>-review.md`, with voter PII redacted.
6. **Final report:**
   - SHA and files committed
   - files deliberately left uncommitted
   - test counts
   - findings, and what was fixed
7. **Unattended runs** (05, 13, 28): never ask. With no ticket, run Correctness only. If it's still NOT
   CLEAN after round 2, stop and report.

## Layout (location open, see below)

    <skill dir>/
      SKILL.md            scope, pre-checks, dispatch, report, unattended defaults
      briefs/contract.md  read-only rules, report format, CLEAN/NOT CLEAN
      briefs/correctness.md
      briefs/spec.md
      follow-through.md   fix/commit loop, PR, merge readiness, review file
    scripts/check-changed.sh

Reviewers are given brief paths and read the briefs themselves, so the main context stays small.

## Retiring the vendored skill

Remove `code-review` from `skills-lock.json`. Copy its smell baseline into `briefs/correctness.md` with a
header naming the upstream source and hash, so upstream changes can be diffed by hand.

## Open questions

- **Location.** `.claude/skills` is a gitignored symlink to the vendored `.agents/skills`, so a skill put
  there isn't committed and doesn't exist in worktrees. The options:
  - Track the symlink plus an un-ignored `.agents/skills/code-review/`. First check that the `npx skills`
    installer doesn't prune or overwrite unknown folders.
  - Use the tracked `skills/` folder with a CLAUDE.md link. It wouldn't be invocable as a skill.
- Does unattended dispatch of subagents work under `claude -p` (needed by 28)?
- The description must trigger on "blind review", "review PR N" and "ready to merge?", but not on `/simplify` or
  the built-in review commands.

## Comments

**2026-11-21 (usage investigation, ../../claude-code-usage/01-investigate-usage-limit-drivers.md):** Add diff discipline to this skill: start with `git diff --stat` / `gh pr diff --name-only`, then read per-file diffs (`git diff main -- <path>`) only for in-scope files; run merge-readiness `gh` checks in a subagent. Whole-branch diffs in the main context drove several of the longest sessions last month (PR 151, 154, 159, 160, 176 reviews peaked at 235–294k context; `git diff` and `git show` were the top Bash output sources). Same rule applies to scheduled-claude-runs/05 (review preset). See 30.
