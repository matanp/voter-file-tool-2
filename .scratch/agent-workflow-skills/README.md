# Agent workflow skills

Skills, scripts, hooks and CLAUDE.md defaults to stop re-typing the same instructions, and to stop agents
re-deriving the same setup every session.

Source: on 2026-11-20, six agents read one month of this project's Claude Code transcripts (225 sessions,
2026-10-25 to 2026-11-21). Their condensed findings are in [research/](research/); session ids there refer to
`~/.claude/projects/-Users-matan-Documents-voter-file-tool/<id>*.jsonl`. Voter PII is redacted.

## Headline findings

- The biggest waste isn't your typing. It's agents re-deriving setup: the local DB URL by hand 34 times in a week,
  worktree setup about 20 times, and the screenshot upload and `gh pr edit` workarounds 3–5 times each.
- Real incidents, not just friction: sourcing `.env` exposed the prod URL (Neon rotation), a `git stash` used to
  check which tests already failed conflicted the tree, and PR screenshots showed the bug instead of the fix.
- Existing skills are under-used. `triage` can't be loaded unless you type `/triage`, the repo `skills/*` were only
  ever read with `cat`, and `/code-review` is always followed by the same four follow-up asks.

## Tickets

Every ticket starts at `needs-triage`, to go through one by one.

| #  | Ticket | Kind |
|----|--------|------|
| 01 | [repo-owned code-review skill](issues/01-blind-review-skill.md) | skill (absorbs 06) |
| 02 | [worktree bootstrap script](issues/02-worktree-bootstrap-script.md) | script, plus the `.env`-in-worktrees decision |
| 03 | [local DB URL helper](issues/03-local-db-url-helper.md) | script |
| 04 | [test:pg script](issues/04-test-pg-script.md) | script |
| 05 | [ship-ticket skill](issues/05-ship-ticket-skill.md) | skill (needs 01, 02) |
| 06 | [extend /code-review](issues/06-extend-code-review.md) | wontfix: absorbed into 01 |
| 07 | [tickets.py subcommands](issues/07-tickets-py-subcommands.md) | script |
| 08 | [ticket-handling skill and triage invocability](issues/08-tickets-skill-and-triage.md) | skill (needs 07) |
| 09 | [wrap-up skill](issues/09-wrap-up-skill.md) | skill |
| 10 | [prod-runbook skill](issues/10-prod-runbook-skill.md) | skill |
| 11 | [chrome-qa skill](issues/11-chrome-qa-skill.md) | skill, plus a memory fix |
| 12 | [pdf-verify skill](issues/12-pdf-verify-skill.md) | skill |
| 13 | [orchestrate-tickets skill](issues/13-orchestrate-tickets-skill.md) | skill (needs 02, 05) |
| 14 | [ticket-ready skill](issues/14-ticket-ready-skill.md) | skill |
| 15 | [branch-cleanup skill](issues/15-branch-cleanup-skill.md) | skill |
| 16 | [hook: block sourcing .env](issues/16-guard-against-sourcing-env.md) | hook (stopgap for config-and-secrets/07) |
| 17 | [permission allow rules](issues/17-permission-allow-rules.md) | settings |
| 18 | [CLAUDE.md standing defaults](issues/18-claude-md-standing-defaults.md) | docs |
| 19 | [push / PR policy](issues/19-push-and-pr-policy.md) | policy |

### From the workflow review (2026-11-20), triaged

| #  | Ticket | Status | Kind |
|----|--------|--------|------|
| 20 | [cheap model for quick questions](issues/20-cheap-model-for-quick-questions.md) | ready-for-agent | skill + script |
| 21 | [agent-readable prod state](issues/21-agent-readable-prod-state.md) | needs-triage (to discuss) | grilling: pull scripts vs shipping logs, DB access |
| 22 | [CI, PR template, review loop](issues/22-ci-pr-template-review-loop.md) | needs-triage (to discuss) | grilling |
| 23 | [grilling surfaces what matters](issues/23-grilling-surfaces-what-matters.md) | needs-triage | skill change |
| 24 | [synthetic dataset](issues/24-synthetic-dataset.md) | needs-triage | script |
| 25 | [PII pre-commit hook](issues/25-pii-pre-commit-hook.md) | needs-triage | hook |
| 26 | [Playwright smoke suite](issues/26-playwright-smoke-suite.md) | needs-triage (needs 24) | tests |
| 27 | [status in the Tickets pane](issues/27-ticket-status-in-tickets-pane.md) | needs-triage (needs 07) | tooling |
| 28 | [overnight pipeline (umbrella)](issues/28-overnight-ticket-pipeline.md) | needs-triage (needs many) | umbrella |
| 29 | [herdr workspace culler](issues/29-herdr-workspace-culler-skill.md) | resolved | skill |

### From the usage investigation (2026-11-21)

Source: [claude-code-usage/01](../claude-code-usage/01-investigate-usage-limit-drivers.md). Requests over 150k
context were 60% of context tokens. Always-on context rose from about 40k to about 51k with the PostHog and Sentry
plugins. PDF-review PNG reads were the largest Read source.

| #  | Ticket | Status | Kind |
|----|--------|--------|------|
| 30 | [session sizing and output hygiene](issues/30-session-sizing-and-output-hygiene.md) | needs-triage | habit + rule for 13, 28 |
| 31 | [plugin and connector defaults](issues/31-plugin-and-connector-defaults.md) | ready-for-human | settings |
| 32 | [skills-listing budget](issues/32-skill-listing-budget.md) | needs-triage | rule for new skills |

Also from this investigation, added as comments rather than new tickets: diff discipline on 01; screenshot cap on
11; no PNG re-reads on 12; one-session-per-lane on 13; lean subagent start-up on 14; output defaults on 18; run caps
on 28; and scheduled-claude-runs 03, 05 and 06. The harness side of PDF review is
[report-server-provisioning/28](../report-server-provisioning/issues/28-cut-llm-review-image-volume.md).

## Working habits (not tickets)

From the same review. These are things to do differently, not things to build.

- **Start sessions from a ticket path**, not a pasted summary or a Tickets-pane row, and let 09 write the end state
  back into the ticket. 110 of 227 sessions last month had 3 or fewer of your messages, and many began by
  reconstructing status.
- **Keep agents out of the main checkout.** Code work happens in worktrees, and the main checkout is yours. Most
  collisions (ticket numbers, shared worktrees, a reviewer and implementer on the same uncommitted changes) came
  from parallel sessions sharing it.
- **One session per phase** (build, review, deploy and QA), with the ticket and PR template as the handoff. 21
  sessions spanned more than a day, and they're the most context-heavy.
- **Rules that cost damage when broken get enforced** (hook, script, permission), not remembered. Memory is for
  preferences. Review the memories now and then: preference, or a rule that needs enforcing?
- **Review budget:** two blind rounds, then decide.
- **When accepting "all recommended", ask what each recommendation adds.** Until 23 lands, ask for the smallest
  version first.

## Suggested order

1. Safety and policy first, since they're small and stop real damage: 16, 19, 17.
2. Foundations other things call: 02, 03, 01.
3. The big time-savers: 05, 09.
4. Discussions: 21, 22, 23.
5. Enablers for the pipeline (28): 24, 25, 26, 27.
6. The rest as they come up.

## Related

- [config-and-secrets/07](../config-and-secrets/issues/07-local-dev-worktrees-ci-scripts.md): the long-term fix
  for how worktrees and scripts get config (affects 02, 03, 16).
- [dev-environment/06](../dev-environment/issues/06-untrack-scratch-shared-across-worktrees.md): untrack `.scratch`
  (affects 07's cross-worktree numbering).
- [claude-code-usage/01](../claude-code-usage/01-investigate-usage-limit-drivers.md): always-on context size
  (affects how much goes into CLAUDE.md in 18).
