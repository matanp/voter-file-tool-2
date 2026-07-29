# Whole-App Dev Experience & Local Reproducibility Review Methodology

**Status:** Vector overlay. Shared manifest, workflow, citations, and Appendix B:
[WHOLE_APP_REVIEW_METHODOLOGY.md](./WHOLE_APP_REVIEW_METHODOLOGY.md).  
**Skill:** `skills/whole-app-dev-experience-review/SKILL.md`

**Purpose:** Findings-only review at branch tip for whether a new contributor (or a reviewer running
this methodology cold) can reproduce the local dev environment and this review's own findings:
setup drift between `.env.example` and required runtime env vars, seed data completeness, test
database ergonomics, scripts that silently require external state (a running Postgres, S3/R2
credentials, network access), and package-manager or Node-version assumptions that aren't enforced.
Not a general operations review — use the operations vector for deployed-environment hygiene; use
this vector for local setup and reproducibility of the dev/test loop.

---

## Delta from base

| Topic | Dev experience & local reproducibility vector |
| --- | --- |
| **Axis** | Setup/config drift × reproducibility of the local dev and test loop |
| **Scan profile** | `dev-experience-reproducibility` |
| **Deliverable** | `docs/WHOLE_APP_DEV_EXPERIENCE_REPRODUCIBILITY_REVIEW_<model-slug>_YYYY-MM-DD.md` |

## Run

```bash
MODEL_SLUG=<your-model-slug> pnpm review:freeze dev-experience
pnpm review:scans dev-experience
```

Run freeze and scans back-to-back in the same session; triage only the `scan-*.txt` files inside the
run directory printed by freeze (see `.review/current`).

## Severity rubric

| Severity | Meaning |
| --- | --- |
| **High** | A documented setup path (`db:setup`, `.env.example`, README quick start) is broken, missing a required var, or produces a database/test state that doesn't match what tests or seed scripts assume. |
| **Medium** | A script or test silently depends on external state (real Postgres, network, credentials) with no guard, error message, or fallback, so failures look like unrelated bugs. |
| **Low** | Cosmetic setup friction (stale comment, unclear script name, missing but inferable default) with an easy workaround. |

## Lane emphasis

- **A (high):** `package.json` scripts (`db:setup`, `sync-prisma`, `db:seed-*`, `test`), `scripts/setup-dev-db.sh`, `apps/frontend/docker-compose.yml`.
- **B (medium):** Seed/backfill scripts and their assumed starting schema state vs. current `schema.prisma`.
- **C (medium):** `apps/report-server/.env.example` vs. code that reads `process.env.*` in that workspace.
- **D (low):** Import/bulk-load scripts that assume local fixture files or a specific working directory.
- **E (low):** Any frontend dev script assuming a running backend/report-server without a documented order of operations.
- **F (high):** `.env.example` files (frontend and report-server) vs. every `process.env.<VAR>` reference in each workspace; `scripts/review/*` tooling's own setup requirements (does `review:doctor` catch drift here too?).

Apply `skills/adding-reports/SKILL.md` when reproducibility gaps involve report-server seed/fixture
data specifically.

## Mechanical scans

`scan-dev-experience.txt`, `scan-operations.txt`, `scan-migration-data.txt`, `scan-shared-helpers.txt`.

Triage order: dev-experience hits grouped by concern (env var, setup script, seed/test-db, container),
then operations for `process.env` reads not covered by an `.env.example` entry, then migration-data for
backfill/seed scripts whose preconditions may have drifted from current schema.

### Env-var parity check (pre-finalize)

For each workspace with an `.env.example` (`apps/frontend`, `apps/report-server`), diff the variable
names in `.env.example` against every `process.env.<VAR>` reference in that workspace's source. Flag:

- A `process.env` read with no corresponding `.env.example` entry (new contributor has no way to know
  the var exists).
- An `.env.example` entry no longer read anywhere (stale, misleads setup).

## Cross-vector routing

Route borderline observations to the matching vector rather than reporting them here:

| Observation | Route to |
| --- | --- |
| Missing env var causes a production failure mode (not just local setup friction) | Operations readiness |
| Seed/backfill script correctness for a real migration rollout | Migration & data evolution |
| Test coverage gaps unrelated to environment reproducibility | Validation & testability |
| Shared helper duplication used only to work around local setup | Architecture & maintainability |

## Not a finding examples

- A documented manual step (e.g., "run `pnpm db:setup` once after cloning") that works as described,
  even if it isn't automated.
- Optional env vars with a sensible in-code default that don't need an `.env.example` entry.
- Seed data intentionally minimal for a fast local loop, with fixture-based tests covering realistic
  data separately.

## Final checklist

- [ ] Freeze and scans completed in the same session; only run-local `scan-*.txt` triaged.
- [ ] Each workspace's `.env.example` checked against actual `process.env.*` reads for parity in both directions.
- [ ] `db:setup` / seed / docker-compose paths traced against current `schema.prisma` for drift.
- [ ] Findings name the exact script, file, or env var and the specific reproducibility break — not "setup could be better."
- [ ] No finding relies only on "this could be automated" without a concrete reproduction failure.
- [ ] Cross-vector items deferred per table above.
