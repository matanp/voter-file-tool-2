# 02 - Move Vercel build settings into apps/frontend/vercel.json

Status: needs-triage
Type: task

## Why

The project standards prefer service configuration in the repo. Vercel's build settings for `voter-file-tool-2`
(team `matan-presbergs-projects`) are set only in the dashboard. As read with `vercel project inspect` on
2026-10-25:

| Setting | Value |
| --- | --- |
| Root Directory | `apps/frontend` |
| Framework | Next.js |
| Install Command | `cd ../.. && pnpm install --filter=./apps/frontend --filter=./packages/shared-prisma --filter=./packages/shared-validators` |
| Build Command | `pnpm run build` |
| Node.js Version | 24.x |

They're recorded in README "Manual setup" for now. This needs a decision, not just a change, because a wrong value
breaks production deploys.

## Decide

- **Whether to do it.** `vercel.json` overrides the dashboard values for install and build commands. Once they're in
  the file, edits made in the dashboard stop taking effect, which could surprise someone.
- **The Node version.** These disagree with each other:
  - Vercel: 24.x
  - the local `.vercel/project.json` cache: 20.x
  - CI (`.github/workflows/test.yml`): Node 20
  - `docs/LOCAL_DEVELOPMENT.md`: Node 22

  Pick one and set it in `engines.node` in `apps/frontend/package.json`, which Vercel reads. `vercel.json` has no
  Node version setting.

## To do (if yes)

- Add `apps/frontend/vercel.json` with `framework`, `installCommand` and `buildCommand` matching the table above.
  Root Directory can't be set in `vercel.json`, so it stays a dashboard setting.
- Deploy a preview from a branch and confirm the build log shows the commands from the file.
- Update README "Manual setup" so the Vercel entry lists only what remains in the dashboard: root directory, env
  vars, domains.
- Consider changing Vercel's `config` in `~/.config/project/voter-file-tool.toml` from `gui` to `text`. Env vars and
  domains stay in the dashboard either way.
