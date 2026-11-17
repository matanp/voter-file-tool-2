# 09 - Open the PR for 06 with synthetic-data screenshots

Status: done

The user has asked for this PR, which authorizes committing, pushing the branch and opening it. Don't merge.

## State

- Ticket [06](06-mobile-name-search.md) is built on local branch `mobile-record-search`, **uncommitted**
  (one staged deletion: `apps/frontend/src/hooks/useWindowSize.tsx`). Its Comments section has the full
  write-up. Use that write-up for the PR body.
- Commit only 06's files: the `apps/frontend/src/...` changes, the new tests, `src/lib/quickNameSearch.ts`,
  `app/recordsearch/VoterRecordCardList.tsx`, the run-frontend skill's `SKILL.md` and
  `steps/record-search-quick-name.mjs`, and tickets 06/09. The working tree has many unrelated
  `.scratch/` and `CONTEXT.md` changes. Leave those alone.

## Screenshots: no real voter data

The repo (`matanp/voter-file-tool-2`) is **public**. The existing shots in `data/…-06-mobile-baseline/` and
`data/…-06-mobile-after/` show real voters and **must not** be uploaded or committed. Retake them:

1. Start the app and sign in with `apps/frontend/.claude/skills/run-frontend/` (`serve.sh --workspace`,
   `session.sh Leader` / `Developer`).
2. Add a step file that calls `page.route('**/api/fetchFilteredData', …)` and fulfills it with about 15
   made-up `VoterRecord`s (for example `ALEX SAMPLE`, phone `(555)010-01xx`, `100 EXAMPLE ST`, ED/LD
   numbers). Then it runs the same flow as `steps/record-search-quick-name.mjs`, with `NAME="Alex Sample"`.
3. Shots needed:
   - "Before": stash the branch's changes or use a `main` worktree, then take record search results and
     details at 375 and 1280.
   - "After": record search empty, results and details at 375, 768 and 1280, plus the Developer header
     at 375, 768 and 1280.
   - `/petitions` at 375 and 1280.
   Check that every shot reports no `OVERFLOW`, and **look at each one** to confirm it contains no real
   names or addresses before it leaves the machine.
4. `gh` can't upload images to a PR body. Commit the PNGs to a separate branch
   `pr-assets/mobile-record-search` (not the PR branch), push it, and embed them in the PR body with
   `https://github.com/matanp/voter-file-tool-2/blob/pr-assets/mobile-record-search/<file>?raw=true`, in a
   before/after table.

## Subagents (for token efficiency)

Screenshots are expensive to read. Run one subagent for steps 1–3: retake the shots and look at them for
leftover real data and for layout problems. It should report back only file paths, overflow numbers and
anything wrong. Meanwhile, the main agent commits and pushes the code branch and drafts the PR body from
06's Comments. Open the PR once the assets branch is pushed. Then run `session.sh --cleanup` and stop the
server.

## Done when

- [x] PR open against `main` from `mobile-record-search`, containing only 06's files.
- [x] The PR body summarizes 06 and has embedded before/after screenshots, all with synthetic data.
- [x] No real voter data in any commit, branch or PR text.
- [x] Link to the PR added under 06's Comments.

## Comments

**2026-11-16.** The PR adds the whole `apps/frontend/.claude/skills/run-frontend/` folder, not only
`SKILL.md` and `steps/record-search-quick-name.mjs`. The folder didn't exist on `main`, and the
screenshot steps need the server, session and driver scripts it contains. The other step files are part
of the same tool. This is on purpose, not a stray change.
