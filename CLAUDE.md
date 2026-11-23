# Agent Guidance

Before changing or reviewing authentication, authorization, privileges, or role-gated UI, read [skills/auth-check-patterns/SKILL.md](skills/auth-check-patterns/SKILL.md).

Before adding or extending report types, read [skills/adding-reports/SKILL.md](skills/adding-reports/SKILL.md).

## Browser QA on deployed sites

When driving a browser against production or a Vercel preview, open every new tab's first URL with `?qa_agent=1` (e.g. `https://opensourcepolitics.online/?qa_agent=1`). The flag tags that tab's PostHog events so the project's test-account filter drops them from analytics. It sticks to the tab across navigations, so you don't need it on every URL, only the first one in each new tab.

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/<feature-slug>/`: one live, untracked copy shared by every worktree, with its own git repo. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, used as-is (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
