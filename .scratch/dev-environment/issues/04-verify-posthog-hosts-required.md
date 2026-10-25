# 04 - Confirm `next dev` fails when a PostHog host is unset

Status: needs-triage
Type: task

## Why

`apps/frontend/.env.example` says both `NEXT_PUBLIC_POSTHOG_HOST` and `NEXT_PUBLIC_POSTHOG_ASSETS_HOST` are required
because "`next dev` exits if either is unset". That was inferred from `apps/frontend/next.config.ts`, which builds
the `/ingest` rewrite destinations from the two variables without a guard (an unset host yields
`undefined/static/:path*`). Nobody has run Next to confirm what actually happens.

## To do

- Unset each host in turn and run `pnpm --filter voter-file-tool dev`. Record whether it exits, warns, or starts
  with broken `/ingest` rewrites.
- Make the `.env.example` comment say what actually happens.
- If Next starts anyway, consider guarding the rewrites in `next.config.ts` (skip them, or fail with a clear
  message) so a missing host doesn't silently break analytics.
