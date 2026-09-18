# Whole-App Developer Experience & Reproducibility Review

## Basis
- **Branch:** `feat/srs-implementation` · **Commit:** `ca9af8f` · **Date:** 2026-07-10 · **Model:** `claude-opus-4-8`
- **Deliverable:** `docs/WHOLE_APP_DEV_EXPERIENCE_REPRODUCIBILITY_REVIEW_claude-opus-4-8_2026-07-10.md`
- **Methodology:** manual read of the build/test/setup surface (no scan profile exists for this axis; findings cite files directly).
- **Axis:** can a new engineer — or CI, or a future clone of this repo — reproduce a working build, a green test run, and a runnable local stack from a clean checkout, deterministically? What silently drifts, defaults, or diverges between "works on my machine," "passes CI," and "runs in prod"?
- **Surface reviewed:** root and per-package `package.json` scripts, `.github/workflows/test.yml`, `scripts/run-tests.ts`, the two Jest configs, `pnpm-workspace.yaml`, `tsconfig.base.json`, `apps/frontend/docker-compose.yml`, `scripts/setup-dev-db.sh`, both `.env.example` files, `apps/report-server/nodemon.json`, and `docs/LOCAL_DEVELOPMENT.md` / root `README.md`.

## At a glance
| # | Finding | Severity | Blast | Opportunity |
|---|---------|----------|-------|-------------|
| 1 | CI gates on `pnpm test` only — no typecheck, lint, or build | High | large | Add tsc/lint/build gates; `strict` is unenforced |
| 2 | Canonical test run silently skips the Node-env API test config | High | large | Wire `jest.api.config.cjs` into the aggregator/CI |
| 3 | CI Node major (20) ≠ required runtime (22); local Node unpinned | High | large | `.nvmrc` + matching CI + `engine-strict` |
| 4 | R2/DB env duplicated across two `.env` files with no shared source | Medium | medium | Single source or documented sync/derivation |
| 5 | Local Postgres pinned to `postgres:latest` (floating major) | Medium | medium | Pin to prod's major version |
| 6 | Three overlapping install/build hooks with fragile `cd ../../` | Medium | small | One ordered build path; drop redundant hooks |
| 7 | `check:api-routes` invariant gate exists but nothing runs it | Medium | medium | Run route-wrapper + review gates in CI |
| 8 | `dbconnect` hardcodes one developer's DB creds | Low | small | Derive from `.env` like the other DB scripts |
| 9 | `setup-dev-db.sh` migrates but never seeds a usable DB | Low | small | Run `db:seed` (or offer to) in the one-shot setup |

**Counts:** 9 findings · 4 backlog-only notes

## Subsystem map
| Subsystem | Surfaces reviewed | Depth |
|---|---|---|
| CI pipeline | `.github/workflows/test.yml` | high |
| Test orchestration | `scripts/run-tests.ts`, `apps/frontend/jest.config.cjs`, `apps/frontend/jest.api.config.cjs`, per-package `test` scripts | high |
| Toolchain pinning | root/app `package.json` (`packageManager`, `engines`, `@types/node`), absence of `.nvmrc`/`.npmrc`, `pnpm-lock.yaml`, `tsconfig.base.json` | high |
| Install/build lifecycle | root `prepare` + `build:packages`, frontend `postinstall`, report-server `prestart`, `nodemon.json` | high |
| Local environment | `docs/LOCAL_DEVELOPMENT.md`, `apps/frontend/.env.example`, `apps/report-server/.env.example` | high |
| Local database | `scripts/setup-dev-db.sh`, `apps/frontend/docker-compose.yml`, `db_migrate` / `db:seed` / `dbconnect` scripts | high |

## Findings

### 1. CI gates on `pnpm test` only — no typecheck, lint, or build
**Severity: High · Blast radius: large**

**What & where.** `.github/workflows/test.yml` runs exactly one quality step: `pnpm install --frozen-lockfile` then `pnpm test`. There is no `tsc --noEmit`, no `eslint`, and no `next build` / package build in the pipeline. A workspace-wide grep for a typecheck script (`"typecheck"`, `tsc --noEmit`, `tsc -p`) returns only the two shared-package `build` scripts — there is no standalone typecheck target anywhere, and neither app package exposes one.

**Why it hurts.** `tsconfig.base.json` sets `"strict": true`, so the codebase *advertises* type safety, but nothing in CI ever runs the compiler in check mode. `next build` type-checks the frontend and `ts-node` type-checks the report-server at boot — but neither runs in CI. The result: a PR that introduces a type error, an unused-variable lint violation, or a broken production build merges green as long as Jest passes. The strictness guarantee is aspirational rather than enforced, and "reproducibly builds" is untested on every commit.

**Opportunity.** Add a `typecheck` script per app (`tsc --noEmit`) and run typecheck + lint + a build (at least `next build` for the frontend and `build:packages`) as CI steps alongside `pnpm test`.

**Evidence.** `test.yml` steps end at `pnpm test`; `strict: true` in `tsconfig.base.json:3`; no typecheck script in any `package.json`; frontend/report-server type-checking only happens as a side effect of build/boot, which CI never invokes.

### 2. The canonical test run silently skips the Node-environment API test config
**Severity: High · Blast radius: large**

**What & where.** CI runs `pnpm test` → root `test` → `tsx scripts/run-tests.ts`. For each package the runner spawns `pnpm exec jest --json …` with **no `--config`** (`scripts/run-tests.ts:64`), so the frontend uses the default `jest.config.cjs`, whose `testEnvironment` is `jsdom` and whose `testMatch` (`**/__tests__/**/*.[jt]s?(x)`) sweeps in all 46 files under `src/__tests__/api/`. The dedicated `jest.api.config.cjs` — which explicitly sets `testEnvironment: "node"` "for API route tests" and a `src/__tests__/api/**` matcher — is only reachable through the `test:api` script, which neither `run-tests.ts` nor CI invokes. None of the 46 API test files carry a `/** @jest-environment node */` docblock to override the default, so **in CI every API route test executes under jsdom**, contrary to the config author's stated intent.

**Why it hurts.** API route handlers run against Web/Node primitives (`Request`/`Response`, streams, `Buffer`, undici). jsdom and node provide materially different globals, so a test's pass/fail can depend on which config runs it. Today a developer running `pnpm test:api` locally exercises the *node* environment while CI exercises *jsdom* — the exact "passes locally, fails in CI" (or the reverse) reproducibility trap this axis exists to catch. The node config is dead weight that reads as authoritative but is never run, so it will also drift out of sync unnoticed.

**Opportunity.** Pick one source of truth: either fold the API suite into the default run with per-file `@jest-environment node` docblocks (and delete `jest.api.config.cjs`), or have `run-tests.ts`/CI additionally run `jest --config jest.api.config.cjs` so the node environment the tests were written for is the one CI enforces.

**Evidence.** `scripts/run-tests.ts:56-70` spawns `jest` with no config; `jest.config.cjs` = jsdom + `**/__tests__/**` match with no `api` ignore; `jest.api.config.cjs` = node + `src/__tests__/api/**`; `grep -rl "@jest-environment" src/__tests__/api` → 0 of 46 files.

### 3. CI Node major (20) does not match the required runtime (22); nothing pins local Node
**Severity: High · Blast radius: large**

**What & where.** `.github/workflows/test.yml` runs `actions/setup-node@v4` with `node-version: '20'`. Meanwhile `apps/report-server/package.json` declares `"engines": { "node": ">=22.0.0" }`, `docs/LOCAL_DEVELOPMENT.md` says "**Node.js 22** (nvm recommended)," and report-server pins `@types/node: ^22`. There is no `.nvmrc` or `.node-version` file anywhere in the repo, and no `.npmrc` at all — so `engine-strict` is off and the `engines` field is advisory only. The frontend and root pin `@types/node: ^20`, adding a third data point.

**Why it hurts.** Three "supported Node" answers coexist: CI tests on 20, the report-server *requires* ≥22 and is typed against 22, and the frontend is typed against 20. CI therefore runs the report-server's tests on a major the package says it doesn't support — any Node 22-only API (or a behavior change between 20 and 22) passes or fails in CI on the wrong runtime, and prod (Node 22 per docs) can diverge from what CI validated. With no `.nvmrc`, "nvm recommended" gives a new developer nothing to `nvm use`; they pick a major by guesswork, and `pnpm install` won't warn because `engine-strict` is unset.

**Opportunity.** Commit a `.nvmrc` (`22`), bump CI `setup-node` to match, align `@types/node` to the runtime major across packages, and add `.npmrc` with `engine-strict=true` so the `engines` field is enforced at install.

**Evidence.** `test.yml` `node-version: '20'`; `report-server/package.json` `engines.node >=22.0.0` and `@types/node ^22`; frontend/root `@types/node ^20`; `LOCAL_DEVELOPMENT.md` line "Node.js 22"; no `.nvmrc`/`.node-version`/`.npmrc` present.

### 4. R2 and database env are duplicated across two `.env` files with no shared source
**Severity: Medium · Blast radius: medium**

**What & where.** `docs/LOCAL_DEVELOPMENT.md` and both `.env.example` files instruct the developer to set the **same** `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` and the **same** `POSTGRES_PRISMA_URL` independently in `apps/frontend/.env` *and* `apps/report-server/.env`. There is no root `.env`, no shared env module, and no derivation — the values are hand-copied into two files.

**Why it hurts.** The two apps must agree on the storage bucket and database to function together (the frontend presigns an upload key that the worker later reads; both write the same Postgres). Duplicated-by-hand config drifts: a developer rotating a dev R2 key or pointing at a fresh DB in one file and forgetting the other gets a stack that half-works in confusing, hard-to-diagnose ways (uploads succeed, imports read an empty/old bucket). This is a classic reproducibility failure mode — the "environment" is not a single artifact.

**Opportunity.** Provide a single source (root `.env` consumed by both, or a documented `direnv`/symlink/derivation) for the shared R2 + DB block, keeping only genuinely app-specific vars (`PORT`, `CALLBACK_URL`, `PDF_SERVER_URL`, BOE schedule) split.

**Evidence.** `LOCAL_DEVELOPMENT.md` R2 section ("same R2 variables in **both** apps") and Database Option B ("in both `apps/frontend/.env` and `apps/report-server/.env`"); identical R2 blocks in `apps/frontend/.env.example` and `apps/report-server/.env.example`.

### 5. Local Postgres is pinned to `postgres:latest` (floating major)
**Severity: Medium · Blast radius: medium**

**What & where.** `apps/frontend/docker-compose.yml` uses `image: postgres:latest`. The image tag carries no major-version pin, and there is no comment tying it to the production Postgres (Neon) major.

**Why it hurts.** `latest` is resolved at `docker compose up` time, so two developers who set up the stack months apart — or the same developer after a `docker pull` — can silently land on different Postgres majors, and both can differ from Neon prod. Migrations, `pg_stat_statements` behavior (the compose file preloads it), collation, and default SQL semantics can vary across majors, so a migration that applies cleanly locally may behave differently in prod, defeating the point of a local DB as a prod stand-in.

**Opportunity.** Pin the image to the production major (e.g. `postgres:16`) and note the intended parity with Neon.

**Evidence.** `apps/frontend/docker-compose.yml` `image: postgres:latest`, `command: postgres -c shared_preload_libraries=pg_stat_statements …`.

### 6. Three overlapping install/build hooks with a fragile `cd ../../`
**Severity: Medium · Blast radius: small**

**What & where.** Three lifecycle scripts orchestrate the same shared-package builds along different paths:
- Root `prepare`: `pnpm run build:packages` (builds all of `packages/**`).
- Frontend `postinstall`: `prisma generate && cd ../../ && pnpm --filter @voter-file-tool/shared-prisma build && pnpm --filter @voter-file-tool/shared-validators build`.
- Report-server `prestart`: builds `voter-import-processor`, `shared-validators`, and `shared-prisma`.

**Why it hurts.** A single `pnpm install` at root triggers both `prepare` (build all packages) and the frontend `postinstall` (build shared-prisma + shared-validators *again*) — redundant work whose net result depends on hook ordering. The `postinstall` reaches the workspace root via a literal `cd ../../`, which only holds because the package sits exactly two levels deep; any move of the app, or invocation from an unexpected CWD, silently builds the wrong tree or no-ops. Three independent, partially-overlapping definitions of "how to build the shared packages" is exactly the kind of implicit ordering that makes clean-clone builds flaky and slow to reason about.

**Opportunity.** Consolidate to one ordered build entrypoint (root `build:packages`, or a Turbo/pnpm task graph) and have app hooks depend on it rather than re-issuing filtered builds; replace `cd ../../` with `pnpm -w` / workspace-root-relative invocation.

**Evidence.** Root `package.json` `prepare` + `build:packages`; `apps/frontend/package.json` `postinstall` with `cd ../../`; `apps/report-server/package.json` `prestart`.

### 7. The `check:api-routes` invariant gate exists but nothing runs it
**Severity: Medium · Blast radius: medium**

**What & where.** Root `package.json` exposes `check:api-routes` (`node scripts/check-api-route-wrappers.mjs`) plus a family of `review:*` gates (`review:gate`, `review:doctor`, `review:test-map`, `review:route-inventory`, …). None of these appear in `.github/workflows/test.yml`, which runs only `pnpm test`. There are no other workflow files.

**Why it hurts.** `check-api-route-wrappers.mjs` enforces a real security-relevant invariant for this app (every API route is wrapped in the correct privilege guard — the exact class of bug catalogued across the trust-boundary and contracts reviews). Because it is not wired into CI, a new route that forgets its `withPrivilege` wrapper merges without objection; the checker only helps developers who remember to run it manually. An unenforced gate is, reproducibly, an ungated one.

**Opportunity.** Run `pnpm check:api-routes` (and the cheap `review:*` invariant checks) as a required CI step.

**Evidence.** Root `package.json` scripts `check:api-routes` and `review:*`; `test.yml` invokes none of them.

### 8. `dbconnect` hardcodes one developer's database credentials
**Severity: Low · Blast radius: small**

**What & where.** `apps/frontend/package.json`: `"dbconnect": "psql -h localhost -U matanAdmin -d postgres1"`. The user (`matanAdmin`) and database (`postgres1`) are literals, and they don't match the `your_user` / `your_database` placeholders the `.env.example` and `setup-dev-db.sh` steer new developers toward.

**Why it hurts.** For anyone other than the original author, `pnpm dbconnect` fails against the DB their own `.env`/setup script just created — a small but concrete "the documented convenience command doesn't work on a fresh clone" papercut, and a minor leak of personal environment details into a shared script.

**Opportunity.** Derive the connection from `POSTGRES_USER`/`POSTGRES_DB`/`POSTGRES_PORT` in `.env` (as `setup-dev-db.sh` already does), or `psql "$POSTGRES_PRISMA_URL"`.

**Evidence.** `apps/frontend/package.json` `dbconnect` literal creds vs. `.env.example` placeholders and `setup-dev-db.sh` env-derived usage.

### 9. `setup-dev-db.sh` migrates but never seeds a usable database
**Severity: Low · Blast radius: small**

**What & where.** The "one-shot" `scripts/setup-dev-db.sh` ends after `pnpm db_migrate` (Step 7) and prints "Dev environment is ready." It never runs `pnpm db:seed`, even though the frontend defines both a Prisma `seed` (`tsx prisma/seed.ts`) and a `db:seed` script.

**Why it hurts.** A developer who follows the documented happy path lands on a schema-correct but empty database — no users, committees, terms, or reference data — so the app is not actually exercisable without extra, undocumented steps. "Ready for development" overstates the end state, which is the kind of gap that turns a 10-minute onboarding into an afternoon of asking what to run next.

**Opportunity.** Run `pnpm db:seed` at the end of a fresh setup (or prompt for it), and mention seeding in the `LOCAL_DEVELOPMENT.md` quick-start checklist.

**Evidence.** `setup-dev-db.sh:216-247` stops at migrate; `apps/frontend/package.json` defines `db:seed` and a `prisma.seed` entry that the setup flow never calls; `LOCAL_DEVELOPMENT.md` quick-start omits seeding.

## Already good

- **Committed lockfile + frozen install.** `pnpm-lock.yaml` (12,106 lines) is checked in and CI uses `pnpm install --frozen-lockfile`, so dependency resolution is deterministic between CI and clones.
- **`packageManager` pinned consistently.** Root and report-server both declare `pnpm@8.15.7`, and CI's `pnpm/action-setup@v4` reads that field rather than hardcoding a version — the package manager is reproducible without duplication.
- **Aggregated test runner is genuinely nice.** `scripts/run-tests.ts` runs all four package suites concurrently with a clean summary table and surfaces full output only on failure — good DX (its config-selection gap is Finding 2, not a knock on the design).
- **`.env.example` files are thorough and honest.** Both list every variable with inline guidance ("same vars in report-server," the `openssl rand -hex 32` recipe for `WEBHOOK_SECRET`, the BOE schedule knobs) and explicitly promise no secrets.
- **`setup-dev-db.sh` is defensive.** It checks the Docker daemon, validates required env vars before acting, waits on `pg_isready` with a bounded retry, and supports `--fresh` — well beyond a bare `docker compose up`.
- **Reproducible *review* tooling.** The `review:freeze` / `doctor` / `scope-gate` scripts and the checksum'd Basis blocks in the sibling whole-app reviews make the review process itself reproducible — a pattern worth keeping.
- **`strict: true` in the base tsconfig** is the right default (its only problem is that nothing enforces it in CI — Finding 1).

## Backlog-only notes

### B1. CI triggers only on PRs into `develop`/`main`
`test.yml` runs on `pull_request` to `develop`/`main` only — no `push` trigger. Feature branches get no signal until a PR is opened against those bases, and pushes to other long-lived branches run nothing. Low urgency, but a `push` trigger on active branches shortens the feedback loop.

### B2. No coverage or test-count floor
`test:coverage` / `test:api:coverage` exist but CI enforces no threshold, and the aggregator discards the coverage numbers. Nothing prevents a PR from deleting tests. Defer until the API-config split (Finding 2) is resolved, since coverage is meaningless while half the suite runs under the wrong config.

### B3. `@types/node` majors diverge from the runtime
Frontend/root pin `@types/node: ^20` while the app targets Node 22 (Finding 3). The type surface a developer codes against (Node 20 APIs) lags the runtime, so a Node 22-only API type-errors in the editor despite being valid at runtime. Fold into the Node-pinning cleanup.

### B4. React majors differ across apps (19 vs 18)
Frontend runs React `19.1.1`; report-server runs React `^18.3.1` for its `react-dom/server` PDF rendering. They are separate deployables sharing only non-React packages, so this is contained — but the split is undocumented and a future shared UI/render helper would collide. Worth a one-line note in the README's monorepo section.

## Not a finding

- **`SKIP_ENV_VALIDATION: '1'` in CI** — intentional and necessary: `env.js` requires real auth secrets that CI shouldn't hold; the escape hatch is the documented mechanism.
- **`xlsx-tester` package absent from the test aggregator** — it has no `test` script; the four-package `PACKAGES` list in `run-tests.ts` correctly covers everything testable.
- **Report-server `dev` via `nodemon` + `start` via `node -r ts-node/register`** — two entrypoints for two purposes (watch vs. one-shot); both type-check via ts-node, so this is deliberate, not drift.
- **Prod migration uses `prisma migrate deploy` absence** — already captured as an operations/deploy finding (Operations Readiness #8); out of scope for the local-dev/reproducibility axis and not re-scored here.
- **Late-failing env vars (`PDF_SERVER_URL` localhost default, etc.)** — an operations/deploy concern already owned by the Operations Readiness review (#1–#3); listed there, not duplicated.
