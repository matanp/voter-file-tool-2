# 01 - Triage the 2026-11-21 code-comments review and its incidental defects

Status: needs-triage
Type: task

## What

The whole-codebase code-comments review is in
`docs/WHOLE_APP_CODE_COMMENTS_REVIEW_claude-opus-5-5_2026-11-21.md` (basis HEAD `1032ac09`). It has 14 comment findings
(3 High, 8 Medium, 3 Low) and 4 backlog notes. Its **Escalations** section lists 12 code or config defects found along
the way, which are not comment problems.

Triage means deciding, item by item, what becomes a ticket, what gets folded into an existing series, and what is
`wontfix`. The review is a findings register only. It proposes no fixes.

## Escalations to route first (code defects, not comments)

Severities are the review's routing estimates. None was reproduced by running code.

| Review ID | Severity | Defect | Likely home |
|---|---|---|---|
| E3 | High | Report-server `/start-job` doesn't check the request signature the frontend sends, and `main.tf` opens the worker port to the internet. The 2026-07-08 trust-boundary review rated this High, and no ticket tracks it. | `report-server-provisioning` |
| E2 | High | `scripts/setup-dev-db.sh` sources `apps/frontend/.env` and runs `prisma migrate dev` against whatever URL it holds. It never forces the local container. | `dev-environment` |
| E8 | Medium | The meeting-decisions route catches P2002 inside an interactive `$transaction` and carries on. The transaction is already aborted, so a race can roll back the batch and may still return 200. Write a test to confirm before changing it. | `committees-workspace` or new |
| E4 | Medium | `main.tf` embeds a GitHub token in the clone URL. It persists on the box and in tfstate, and the repo is public. | `report-server-provisioning` / `config-and-secrets` |
| E6 | Low | The `jest.setup.ts` "pre-migration" enum and model stubs have drifted from `schema.prisma`. Two `AuditAction` values are undefined, so an auditLog test passes without testing anything. Fix by deleting the stubs. | `test-type-safety-audit` |
| E7 | Low | `auth.ts` privilege sync fails open: the catch logs and sign-in still succeeds with the stored level. Decide on this with `skills/auth-check-patterns`. | new or auth owner |
| E1 | Low | `scripts/sync-prisma-models.js` overwrites the hand-maintained `packages/shared-prisma/src/index.ts`. It's wired to three `package.json` scripts. | `dev-environment` |
| E5 | Low | `scripts/run-tests.ts` omits `packages/shared-prisma`, so CI never runs its three test files. | `dev-environment` |
| E9–E12 | Low | Concurrent eligibility-flag dismiss double-writes. The audit CSV formula guard breaks quoting. `loadAdmin` writes no audit row and its promotion is undone at next sign-in. The decisions route says "at capacity" for a row it already rejected. | various |

## Comment findings (the review's own axis)

The review answers its four questions as follows:

- **Density:** 7.1% overall, 10.2% product, 3.3% tests.
- **Consistency:** density follows the era a file was written in, not its complexity.
- **Value:** about two-thirds of sampled comment lines are informative.
- **Missing comments:** concentrated in auth/invite, transactions, the voter-import column contract, API-edge security
  and infra scripts.

Decisions needed:

1. **High findings 1–3** (auth/invite reasoning, transaction and lock rules, comments that overstate safety): fix the
   comments directly, or fold them into the auth and committees series?
2. **Ticket-number comments (Finding 5):** about 260 lines cite `ticket NN` / `plan §` / `SRS` in six formats, often as
   the only explanation, and many point into `.scratch/`, which `dev-environment/06` plans to untrack. Pick one
   reference format and the rule "state the reason inline; a reference is optional extra". Decide whether this goes
   into agent guidance (see `test-type-safety-audit/07`).
3. **Noise, stale comments, dead pointers and commented-out code (Findings 6–8, 13):** one sweep, or fix them as files
   are touched?
4. **House standard:** whether to turn the review's "Already good" section into a short comment guideline for
   contributors and agents.

## Open questions from the final review

- The two-thirds figure is one reviewer's classification of 100 lines. To reproduce it, use seed `20261121` over
  product comment lines in sorted path order.
- "A bare `ticket 08` means three different tickets" (Finding 5) is the one specific claim nobody verified
  independently.
- The review notes that the app has no path that lowers or removes a `PrivilegedUser` row. That may be a design issue
  for the auth owner rather than a comments issue.
- Raw lane notes and verifier tables are in `.review/runs/comments-2026-11-21/` (gitignored, local only).

## Comments

### 2026-11-21

Notes from the final review that the review doc doesn't state:

- **Format.** The review departs from the house whole-app format. There is no frozen manifest and no `pnpm review:gate`
  run, because this axis has no `vectors.conf` row. Its scope also includes tests, scripts and infrastructure. If this
  becomes a recurring vector, it needs a registry row, a scan profile and an overlay skill.
- **Model line.** It names only the synthesizer (`claude-opus-5-5`). The method was Sonnet discovery, then Opus
  verification and synthesis, then Fable final review.
- **Unexplained edit.** The deliverable was edited on disk by an unknown party while it was being written (wording in
  Finding 4). The final review checked the whole file for consistency afterwards.
- **Basis.** The basis is `1032ac09`. `main` has since moved to `dcedbdcc`, so re-check cited lines before acting on
  them.
- **Helper files.** Files the review agents made (the era analysis, the test-file list, the stub and schema enum dumps)
  are kept with the lane notes in `.review/runs/comments-2026-11-21/scratchpad/`. That folder is local only.

- 2026-11-21: E3 (unsigned `/start-job`) is now tracked in `.scratch/security-audit/issues/02-authenticate-report-server-start-job.md`, E4 in `.scratch/security-audit/issues/09-drop-github-pat-from-provisioning.md`.
