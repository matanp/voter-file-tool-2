# Dependency security (Dependabot triage, 2026-11-08)

On 2026-11-08 there were 221 open Dependabot alerts. Most were one advisory reported twice, once against
`pnpm-lock.yaml` and once against a `package.json`. They traced back to about eight direct dependencies.

## Done in the `deps/security-bumps` PR (192 of 221 cleared)

- `next` 15.5.7 → 15.5.29 (and `eslint-config-next`): image-optimizer RCE, SSRF, cache poisoning, Server Action DoS.
- `next-auth` 5.0.0-beta.29 → beta.32 and `@auth/prisma-adapter` → 2.11.3 (both pull `@auth/core` 0.41.3):
  session reads now fail closed on a configuration error. Before, `auth()` returned the error object, which is
  truthy. Also covers the email normalizer homoglyph fix and OAuth check cookies bound to their provider.
- Report server `express` 4.21.2 → 4.22.3 (body-parser, qs, path-to-regexp, proxy-addr).
- Root `pnpm.overrides` entries that raise floors within the same major version for vulnerable transitive
  packages (fast-uri, brace-expansion, picomatch, ws, js-yaml, handlebars, …). pnpm 8's
  `update --depth Infinity` did not move these.

## Left open (29 alerts)

| Ticket | Alerts | Why it waits |
| --- | --- | --- |
| [01 – xlsx from the SheetJS CDN](issues/01-xlsx-from-sheetjs-cdn.md) | 9 | npm has no fixed release |
| [02 – puppeteer major bump](issues/02-puppeteer-major-bump.md) | 4 (+2 no-fix) | Major version; install-time-only code |
| [03 – lower-priority tier](issues/03-lower-priority-dependency-alerts.md) | ~16 | Major migrations, dev-only, or low impact |
