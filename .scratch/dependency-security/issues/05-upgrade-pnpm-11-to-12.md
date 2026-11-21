# 05 - Upgrade pnpm 11 to 12

Status: needs-triage
Type: task

Blocked by [04](04-upgrade-pnpm.md) (pnpm 8 → 11).

## Why

pnpm 12 (12.0.0 on 2026-08-26) is a rewrite in Rust and is where new fixes land. 04 targets 11 because 12 was
three months old with heavy churn when it was written (39 releases, many `--frozen-lockfile` fixes, and a
credentials-leak security fix in 12.19.0). Move once 12 has settled.

## When to start

All of these should hold:

- 04 is done and the report server is running pnpm 11.
- 12's recent changelog entries no longer include `--frozen-lockfile` or lockfile-format fixes for a few months.
- Vercel can run pnpm 12 (check its build log for the "Detected pnpm" line after the PR's preview build).
- 11 is approaching end of maintenance, or 12 has a fix or feature we need.

## Expected size: a pin bump

Verified in a sandbox on 2026-11-20 (11.28.13 → 12.21.0): same lockfile v9, same `…/store/v11` store, same JSON
`.modules.yaml`, and the same `allowBuilds` / `pnpm-workspace.yaml` settings. pnpm 12 ran
`install --frozen-lockfile` on pnpm 11's `node_modules` and reused it in place, with no reinstall.
`check-pnpm-store.sh` should pass unchanged.

pnpm 12-specific changes to check:

- It fails on any `pnpm-workspace.yaml` key it doesn't recognize (`ERR_PNPM_UNRECOGNIZED_WORKSPACE_SETTINGS`).
- Git dependencies on known hosts resolve through canonical HTTPS URLs (we have none today; check that's still true).
- The npm package installs a per-platform native binary through optional dependencies and a postinstall. Check
  that `npm install -g pnpm@12` on the box gives a working `pnpm` (the box's Linux x64 needs a prebuilt binary).

## Plan

1. Pin `pnpm@12.x.y` (plain, no `+sha512`) in both `package.json` files. Run `pnpm install`, then
   `CI=true pnpm install --frozen-lockfile`. Expect a small or empty lockfile diff.
2. Rerun 04's Part A checks 4-7: builds, overrides, store check, and full verification.
3. Vercel: confirm the preview build uses 12.
4. Box, before merge: `npm install -g pnpm@12.x.y` (a global pnpm 12 still runs the pinned 11 until merge).
   After merge: a normal `bash scripts/deploy-lightsail.sh`, with no `node_modules` deletion. Then verify as in
   04's Part C step 5. If the deploy unexpectedly does a full reinstall, it's only slower; the store doesn't change.

## Acceptance

- CI, Vercel, and the report server all on pnpm 12, with one PDF generated in production.
