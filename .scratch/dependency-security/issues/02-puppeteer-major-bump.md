# 02 - Bump the report server's puppeteer 23.11.1 to 24.x (or 25.x)

Status: ready-for-agent
Type: task

## Problem

`apps/report-server` pins `puppeteer@^23.4.0` (resolved 23.11.1). Its `@puppeteer/browsers` helper pulls in
the packages behind the remaining alerts:

- `extract-zip@2.0.1`: 2 high (symlink path traversal / arbitrary file write). No fixed release exists.
- `basic-ftp@5.3.1`: 1 high still open (needs 6.2.1, a major version; pnpm overrides already raised it within 5.x).
- `tar-fs`, `ws`: fixed by overrides in the security-bumps PR, but only through overrides.

Real exposure is low. That code runs only when puppeteer downloads Chrome at install time, never on a
request path. Even so, these alerts will stay open until puppeteer moves. Current
`@puppeteer/browsers` releases drop `extract-zip`, `tar-fs` and the proxy-agent chain (→ `basic-ftp`) in favor
of `modern-tar`. That removes the whole cluster.

## Fix

1. In `apps/report-server/package.json`, bump `puppeteer` to the latest 24.x (24.43.1 on 2026-11-08). 25.x
   (25.16.0) also works: it needs Node ≥ 22.12, and Lightsail installs Node 22 via nvm
   (`infrastructure/scripts/01-install-dependencies.sh`), CI uses 24. Pick 25 only after confirming the
   instance's `node -v`.
2. Review the 24/25 breaking changes against the only call site, `apps/report-server/src/utils.ts:151`
   (`puppeteer.launch` with `headless: true` and the `--no-sandbox`/`--single-process` args), plus
   whatever `page.pdf()` options are used there.
3. Check the Chrome download/cache location still works on the Lightsail instance. Puppeteer's default
   cache moved between majors in the past, and `pnpm install` downloads Chrome there in the postinstall step.
4. Once the dependency is gone, remove the `tar-fs@^3`, `basic-ftp@^5` and `ws@^8` entries from root
   `pnpm.overrides` if nothing else needs them (`pnpm why -r <pkg>`).

## Verification

- `pnpm test` (report-server suite) and `pnpm --filter node-pdf-generation build`.
- Generate one of each PDF report type locally (`pnpm dev`) and compare against a pre-bump PDF: page
  size, landscape/legal handling, fonts, Tailwind styles.
- `pnpm why -r extract-zip` returns nothing.
