# 22 - Stronger CI, a PR template, and a shorter review loop

Status: needs-triage
Type: grilling
Source: workflow review, 2026-11-20 (see ../README.md)
Related: 01, 04

## Problem

Review happens late and gets repeated: about 12 `/code-review` runs in a month, some PRs reviewed 4 or more times,
two review rounds lost to usage limits, and "is it over-engineered?" asked 3 times. Meanwhile the automatic checks
are thin. `.github/workflows/test.yml` runs `pnpm install`, `pnpm test`, frontend lint, and the infrastructure
Python tests. It doesn't run `tsc`, `test:pg`, `test:api` (unless `pnpm test` covers it; check), the API-route
check, or any browser check. There's no PR template and there are no git hooks.

## Parts to discuss

1. **CI additions:**
   - `tsc --noEmit` for frontend and report server
   - `test:pg` with a Postgres service container (and migrations applied)
   - `pnpm run check:api-routes`
   - `pnpm build:packages` / the build, so package drift is caught
   - later, a browser smoke test (26)
   Questions: time budget per run, which checks are required for merge (branch protection), and is the build worth
   its minutes on every push?
2. **PR template** (`.github/pull_request_template.md`) with: Ticket, What changed, Deploy order, Migration (y/n),
   Backfill or prod script, QA before deploy, QA after deploy, Screenshots, Follow-ups. Agents fill it in during
   `ship-ticket` (05), and `prod-runbook` (10) reads it.
3. **Review budget:** two blind rounds, then decide. Past that, more review mostly finds nits. Encode this in 01.
4. **Bug class to rule:** whenever a reviewer finds a *kind* of bug, ask whether it can become a lint rule, a type, a
   test or a script, and file that as a ticket. The calendar-date lint rule (no `toLocaleDateString` without a time
   zone) is the model. Add this step to 01's merge-readiness output.
5. **"Ready to merge?"** then mostly reads off green required checks plus a completed template, and review is
   left with what automation can't catch.

## Questions

- Any of this in pre-commit or pre-push hooks instead of CI, or CI only? (Hooks slow down agent commits.)
- Is report-server code covered by CI at all today?

## Comments

- 2026-11-22 — Main broke even though every PR passed CI. #186 renamed `mockHasPermission` →
  `mockHasPrivilege` and the `GlobalContext` fields `actingPermissions`/`setActingPermissions` →
  `actingPrivilege`/`setActingPrivilege`. #183 added tests that still used the old names. The two were
  merged a minute apart with no textual conflict. The production build of `0313e4d7` then failed
  `next lint` (`no-unsafe-call` at `requestAdd.test.ts:337`). The drawer-test leftover was a type
  error that lint alone doesn't catch. The #181 merge (`9742792b`) fixed both, so #196, an identical
  fix, merged as a no-op. Cause: `main` has no branch protection, and `test.yml` only runs on
  `pull_request`, against each PR's own older base. Options for part 1: require branches to be
  up to date before merging, or a merge queue (needs a `merge_group:` trigger in `test.yml`).
  Either way, make `tsc --noEmit` a required check.
