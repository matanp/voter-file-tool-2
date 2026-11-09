# 03 - Lower-priority dependency alerts: plan or dismiss

Status: ready-for-human
Type: task

The rest of the 2026-11-08 Dependabot triage: alerts that need a major migration, affect only dev
tooling, or have little real impact. Each section says what fixes it and what to do in the meantime.
Dismissing alerts and closing PRs happens in the GitHub UI, so this ticket is for a human.

## A. `csv-parse` 6.1.0 → 7.x (2 medium): do this one first

"Prototype replacement still reachable via columns path." `apps/report-server/src/utils/csvProcessor.ts`
parses with `columns: true`, so the CSV header row becomes object keys. A header named `__proto__` is the
attack shape. The uploader is an authenticated user, but the content is untrusted.

- Fix: bump to `csv-parse@^7` (major). Check the 7.0 changelog for `columns`/`bom`/`trim` option changes, then
  run the report-server suite.
- Interim: reject header rows containing `__proto__`, `constructor` or `prototype`, or pass a `columns`
  function that maps headers onto an allow-list.

## B. `zod` 3.x (4 high: memory exhaustion on oversized constrained collections)

Fixed only in zod 4.6.6. A v4 migration touches every schema in `packages/shared-validators` plus both
apps, and `@t3-oss/env-nextjs@0.9` would need an upgrade too, so it's a project of its own.

- Interim: add `.max(n)` to request-facing arrays in `packages/shared-validators/src/schemas/report.ts`
  (`columnOrder`, `cityTownFilters`, `legDistrictFilters`, …) and the other API input schemas. Body limits
  already bound the report server (1 MB JSON, 2 MB gzipped `/start-job`). Large payloads would have to come
  from authenticated users.
- Then dismiss as "tolerable risk", or plan the v4 migration as its own effort.

## C. `@sentry/nextjs` v8 → OpenTelemetry `db.user` span attribute (7 medium)

The `@opentelemetry/instrumentation-*` packages pinned by Sentry 8.55 put the DB username on spans. At worst
the Postgres username reaches Sentry, our own vendor. Fixing it needs a Sentry major (v9/v10) with the
migration guide. That same upgrade drops the old `glob@9/10` and `minimatch@8/9/10` copies (2 medium, both need
glob 14 / minimatch 11) that Sentry's build plugin pulls in.

- Recommend: dismiss as "tolerable risk" now, and fold into a planned Sentry upgrade.

## D. Cross-major transitive alerts with no in-range fix

- `uuid@9.0.1` (1 medium, needs 11): comes from `@aws-sdk/client-s3`. A routine in-range bump of the
  `@aws-sdk/*` packages should drop it. Check with `pnpm why -r uuid` after.
- `basic-ftp@5` (1 high, needs 6): goes away with [02](02-puppeteer-major-bump.md).

## E. Dev-only, never shipped: dismiss

- `deepmerge@4.3.1` (1 low, no fix): from jest. Dismiss as "vulnerable code is not actually used" /
  development dependency.
- `xlsx` in root `package.json` devDependencies (1 high): closes with [01](01-xlsx-from-sheetjs-cdn.md).

## F. Housekeeping

- Close the stale Dependabot PRs the security-bumps PR replaces: #15 (nanoid), #16 (cross-spawn),
  #86/#87 (next-auth beta.30), #88/#92 (next 15.5.7/15.5.9), #96 (webpack). Dependabot will reopen fresh ones if
  still needed.
- The root `pnpm.overrides` block added in the security-bumps PR raises transitive floors within each
  major version. Prune entries once parents ship fixed ranges: for each one, temporarily remove it,
  `pnpm install`, and check the alert stays closed. Revisit whenever `next`, `@sentry/nextjs`, `jest` or
  `puppeteer` get a major bump.
- Consider a Dependabot `groups:` config (one grouped PR per ecosystem per week) so alerts don't pile up
  as dozens of single-package PRs again.
