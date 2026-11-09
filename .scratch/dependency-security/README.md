# Dependency security (Dependabot triage, 2026-11-08)

On 2026-11-08 there were 221 open Dependabot alerts. Most were one advisory reported twice, once against
`pnpm-lock.yaml` and once against a `package.json`. They traced back to about eight direct dependencies.

## Done in the `deps/security-bumps` PR (192 of 221 cleared)

- `next` 15.5.7 → 15.5.29 (and `eslint-config-next`): image-optimizer RCE, SSRF, cache poisoning, Server Action DoS.
- `next-auth` 5.0.0-beta.29 → beta.32 and `@auth/prisma-adapter` → 2.11.3 (both pull `@auth/core` 0.41.3):
  session reads now fail closed on a configuration error. Before, `auth()` returned the error object, which is
  truthy. Also covers the email normalizer homoglyph fix and OAuth check cookies bound to their provider.
- Report server `express` 4.21.2 → 4.22.3 (body-parser, qs, path-to-regexp, proxy-addr).
- Vulnerable transitive packages (fast-uri, brace-expansion, picomatch, ws, js-yaml, handlebars, …)
  re-resolved to fixed versions inside their parents' existing ranges. pnpm 8's `update --depth Infinity`
  doesn't do this on its own.
- In-range `@aws-sdk/*` refresh (3.884 → 3.1164): newer `@aws-sdk/core` no longer depends on the exact-pinned
  `fast-xml-parser@5.2.5`.
- Only two overrides, each scoped to the parent that pins the exact version: `next>postcss` (Next pins
  8.4.31) and `@sentry/nextjs>rollup` (Sentry 8.55.x pins 3.29.5). Both are build-time tools. Remove them when
  Next / Sentry ship fixed pins.

## Left open (29 alerts)

| Ticket | Alerts | Why it waits |
| --- | --- | --- |
| [01 – xlsx from the SheetJS CDN](issues/01-xlsx-from-sheetjs-cdn.md) | 9 | npm has no fixed release |
| [02 – puppeteer major bump](issues/02-puppeteer-major-bump.md) | 4 (+2 no-fix) | Major version; install-time-only code |
| [03 – lower-priority tier](issues/03-lower-priority-dependency-alerts.md) | ~16 | Major migrations, dev-only, or low impact |
