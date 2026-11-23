# 06 - Extend `/code-review`: PR input, review file, merge readiness, follow-through

Status: wontfix
Absorbed into: 01 (one repo-owned code-review skill). The evidence below is kept for reference.
Type: task
Source: transcript analysis, 2026-11-20 (see ../README.md)

## Problem

`/code-review` was run about 12 times and works well (Standards and Spec in parallel). But the same follow-ups came
after it almost every time:

- "write your review to a .md file" (4 times)
- "is it ready to merge?" (about 10 times)
- "fix everything you found, push, then do a new blind review" (about 7 times)
- "ticket these" for non-blocking findings (5 times)

Gaps observed:

- It silently skipped the Spec half when there was no issue file.
- It didn't run `test:pg`.
- It didn't check `.scratch` merge-blocker tickets.
- It didn't propose concrete fixes.
- Two review rounds were lost to the 5-hour usage limit mid-run.

## Changes

- **Input:** a PR URL or number (`git fetch origin pull/N/head:pr-N`), plus the uncommitted and HEAD == main
  cases, which needed workarounds 3 times.
- **Output:** always write `.scratch/<feature>/reviews/pr-N-review.md` (redact voter PII).
- **Spec:** say when it's skipped and why.
- **Merge readiness:**
  - `gh pr checks` (and `gh run view --log-failed`), the merge state, unresolved review threads (GraphQL)
  - a trial merge with current `origin/main`
  - `TZ=UTC jest` (snapshots that bake in today's date)
  - `test:pg` when SQL changed (04)
  - merge-blocker tickets
  - whether the change was exercised in the real app
  - retargeting a PR's base doesn't re-trigger CI
- **Ending:** a verdict, a fix-now vs ticket-later list, QA before and after deploy, deploy order (frontend vs
  report server, migrations first?), then an offer to run the fix-and-re-review loop (01) and file tickets (08).
- **Optional deploy-safety reviewer:** see 01's open question.

## Open questions

- `code-review` is a vendored skill (`.claude/skills/code-review`). Edit it in place, or wrap it in a repo skill so
  upstream updates don't clobber the changes?
