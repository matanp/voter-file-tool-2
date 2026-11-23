# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Where the tracker lives

- **One live copy.** `.scratch` is in the main checkout and is ignored by this repo. In every other worktree,
  `.scratch` is a symlink to that copy, so all agents read and write the same files.
- **Edits take effect immediately.** They aren't tied to a branch or a PR. Never `git add` `.scratch` to this repo.
- **`.scratch` is its own git repo** (private, `origin` is `opensource-politics-docs`).
- **Commit every tracker edit as you make it**, directly, with no branch, PR or approval:
  `git -C .scratch add <your files> && git -C .scratch commit -m "<effort> NN: <summary>"`. Add your own files by
  path, never `-A`: other sessions may have edits in progress. Don't push; the user does.
- **Never discard tracker files you didn't write.** No `checkout`, `restore`, `stash`, `reset` or `clean` on another
  session's changes. Leave them for that session, or for wrap-up to report.
- **Setup on a new machine or fresh clone:** in the main checkout, `git clone <private tracker repo> .scratch`
  (needs access) and `cp scripts/git-hooks/post-checkout .git/hooks/`.
- **Missing symlink?** Run `scripts/link-scratch.sh` from the worktree. With the hook installed, a new worktree
  gets it automatically. A real `.scratch` folder in a worktree means its branch predates the untrack and its copy is
  stale. Don't trust it; rebase the branch onto `main`, resolve `.scratch` delete conflicts with `git rm`, then run
  the script.
- **Remote agents** (cloud sessions, remote-isolation subagents) don't get the tracker. Paste the ticket into their
  prompt.
- **Don't check out a pre-untrack branch in the main checkout.** Git overwrites ignored files when it switches
  branches, so it would replace the live tracker with that branch's copy, and switching back deletes it. Use a
  worktree for old branches. To update `main` there, run `git fetch` then `git checkout -B main origin/main`.
  For the same reason, never run `git clean -x` or `-X` in the main checkout.
- **Search it by path.** `.scratch` is gitignored, so repo-wide `rg` and the Grep tool skip it. Search
  `.scratch/` explicitly.
- **Large local output** (screenshots, exports, run output) goes in a `data/` folder, which the tracker repo
  ignores. The tracker repo is private, so voter data in it is fine; keep it out of this public repo.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed), then commit it in `.scratch`.

## When a skill says a PR closes a ticket

A PR can't close a ticket here. After the PR merges and passes its production check, set the ticket's
`Status: resolved` and commit it in `.scratch`. Until then, a built but unmerged ticket is `ready-for-human`.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed`, save, and commit it in `.scratch` before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
