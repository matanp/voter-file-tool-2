# PDF validation harness

Post-deploy validation of every PDF report type, run by an operator. Ticket:
`.scratch/report-server-provisioning/issues/19-post-deploy-pdf-validation.md`. Memory measurement
and failure scenarios are ticket 20 and extend `render`.

Two stages share one run ID:

| Stage | Where | Does | Exit codes |
| --- | --- | --- | --- |
| `render` | Lightsail box, deployed checkout | Renders fixtures through the deployed `dist` code in isolated workers, uploads each PDF to R2, checks bytes (`%PDF-` … `%%EOF`, nonempty), and uploads a manifest | 0 = ready to verify, 1 = failure |
| `verify` | Operator's Mac | Downloads and hash-checks, inspects in the pinned Docker image (Poppler, 144 DPI), checks the fixture expectations, compares with approved baselines, merges the LLM review, deletes the run's R2 objects | 0 = pass, 1 = fail, 2 = needs-review |
| `cleanup` | Either | Deletes a run's listed R2 objects (interrupted or abandoned runs) | 0 / 1 |
| `approve`, `accept` | Mac | Records human approvals in `baselines/approvals.json` | |

All commands run from `apps/report-server`:

```bash
pnpm -s run pdf-validation <command> [options]   # builds the harness (tsc), then runs it
```

## What it validates, and what it doesn't

- Validated: the deployed HTML generators, CSS, `generatePDFAndUpload`, the selected browser, upload
  to R2, and the PDFs' content, pagination, page sizes and rendering.
- Not validated: the frontend, the job queue, database queries and completion callbacks. The worker
  never loads `dist/index.js`, enqueues jobs, queries the database (its database URL can't connect)
  or sends callbacks.
- **The call wiring is mirrored, not imported.** `src/callShapes.ts` repeats, per job type, which
  generator `processJob` in `src/index.ts` calls, with which arguments, and how it calls
  `generatePDFAndUpload` (`useLandscape` and `overrides`). This mirror can drift from `index.ts`.
  Update it whenever those call sites change. Every summary repeats this caveat.

## How the worker uses the deployed code (no production changes)

Each render is a fresh `node` process (`src/worker.ts`) started with an environment built from
scratch: `TZ=UTC`, `LANG=en_US.UTF-8`, and `PORT` set to the harness's own CSS endpoint. The
endpoint serves the deployed `public/tailwind.css`, read once and hashed. The worker also gets the
storage `R2_*` variables and a database URL that can't connect. It runs with the run directory as
its working directory, so `dotenv` in `dist/s3Utils` finds no `.env`. Before requiring `dist/utils`,
it wraps `puppeteer.launch` (the same module instance `dist/utils` uses). The wrapper sets `headless`
and `executablePath` for the selected browser and leaves the production `args` alone. The requested
and effective launch options are recorded per render. `Date` is frozen at `2026-03-02T15:00:00Z`
only while HTML is generated; browser, network and cleanup timers run on the real clock.

## Setup

### Storage (both machines)

Create `pdf-validation/.env.validation` (gitignored). Both machines must point at the same bucket.

```ini
# Preferred: a separate test bucket.
R2_BUCKET_NAME=voter-file-tool-pdf-validation
# Optional: credentials for that bucket. Any R2_* left out is read (read-only) from apps/report-server/.env.
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
```

Without `R2_BUCKET_NAME` in this file, the harness falls back to the service's bucket from
`apps/report-server/.env`. Every key is still under `pdf-validation/<run-id>/`, and approved
baselines go under `pdf-validation/baselines/`. The service's `.env` is never edited. Preflight
checks put, get, list and delete with a probe object.

### Browsers (box)

`render --browser chrome|shell|both` uses the build that the deployed Puppeteer pins. It looks in
the service's cache (`~/.cache/puppeteer`) first, then the harness cache (`pdf-validation/runs/browsers`,
reused across runs). If neither has the browser, it runs `puppeteer browsers install <browser>@<build>`
into the harness cache, never into the service's. The manifest records the build ID, the path and
whether the harness installed it. Pass `--no-install` to fail instead.

- Before #148 the box has full Chrome only, so `shell` is harness-installed.
- After #148 the service uses chrome-headless-shell, and full Chrome may be gone, so `chrome` may be
  harness-installed.

### Comparison image (Mac)

Docker Desktop is required. `verify` builds `comparison-image/Dockerfile` the first time as
`vft-pdf-compare:<12 chars of the Dockerfile's sha256>`. The Dockerfile pins the Node base image by
digest and Poppler `22.12.0-2+deb12u1` from a fixed snapshot.debian.org date. The image runs as
`linux/amd64` by default (emulated on Apple Silicon, so results don't depend on the operator's CPU;
`--platform` overrides it and the override is recorded). It runs with `--network none` and sees only
the run directory, the baseline cache and the compiled harness. Homebrew Poppler is never used.

## Operator sequence

### Before #148 (this harness deployed, #148 not yet merged)

1. **On the box**, after a normal deploy (`scripts/deploy-lightsail.sh`):
   ```bash
   cd /opt/voter-file-tool/apps/report-server
   pnpm -s run pdf-validation render --mode quick --browser chrome
   pnpm -s run pdf-validation render --mode full  --browser chrome
   ```
   Each run prints its run ID and keeps `pdf-validation/runs/<run-id>/` on the box: `render.log`,
   `manifest.json` and `remote-keys.jsonl`.
2. **On the Mac**, for each run:
   ```bash
   pnpm -s run pdf-validation verify --run-id <run-id>
   ```
   Read `runs/<run-id>/summary.md`. Then do the LLM pass: in Claude Code, ask it to follow
   `pdf-validation/llm-review-checklist.md` for `runs/<run-id>/llm-review-request.md`. It writes
   `runs/<run-id>/llm-review.json`. Run `verify` again to merge it.
3. Inspect the images, diffs and findings yourself, then approve the full-Chrome reference baselines
   and the browser-paginated page counts (vacancy, changes, outcomes):
   ```bash
   pnpm -s run pdf-validation approve --run-id <full-run-id> --reviewer "Your Name" --baselines --page-counts
   ```
   Commit `baselines/approvals.json`.
4. Optional: `render --browser shell` (harness-installed). This is diagnostic evidence only.

### After #148 is deployed

5. On the box, run `render --mode quick --browser both`, then `--mode full --browser both`.
   `both` renders each fixture with identical code, CSS and flags in both browsers and alternates
   which goes first.
6. On the Mac, `verify` each run. Headless-shell renders are compared with the approved full-Chrome
   baselines. PR #148 reports glyph advances about 1% wider and three designating-petition paragraphs
   that wrap one word differently. Expect those as needs-review (visual diffs), not failures, as long
   as the content checks pass.
7. Accept or reject each visual difference and each LLM finding explicitly, then approve
   headless-shell baselines for future runs:
   ```bash
   pnpm -s run pdf-validation accept --run-id <id> --reviewer "Your Name" --kind visual-change \
     --item petition-10-long.shell --page 3 --reason "one word wraps differently; same lines"
   pnpm -s run pdf-validation approve --run-id <id> --reviewer "Your Name" --baselines --browser shell
   ```
   If evidence was contaminated or checks failed, render again.

## Statuses

Fail takes precedence over needs-review, which takes precedence over pass. `summary.md` and
`results.json` are generated from the same object.

- **Fail (1):** render failure, preflight or timeout; missing or unreadable PDF; SHA-256 mismatch
  with the manifest; wrong page count or size (0.5 pt tolerance); missing, duplicated or misordered
  rows; missing totals or required text; wrong outcome colour; text or page count that differs from
  an approved baseline; an LLM `defect` nobody accepted; cleanup failure.
- **Needs-review (2):** no approved baseline; no approved page count for a browser-paginated
  fixture; image differences; an LLM `question`; a missing LLM review or unreviewed pages;
  unavailable diagnostics (PM2, OOM log); service restarts or OOM lines during the run; a dirty or
  stale deployed build.
- Image differences are never auto-approved by a tolerance. A reviewer can accept a visual-only
  change for one exact candidate and reference (`accept --kind visual-change`). Content checks
  can't be waived.
- The LLM can only add problems; see `llm-review-checklist.md`. Approvals record the reviewer, run
  ID, browser version, Puppeteer, deployed commit, comparison image, Poppler and embedded fonts.

## Timeouts

| What | Default | Override (recorded in the manifest) |
| --- | --- | --- |
| One render + upload | 180 s | `render --case-timeout-ms` |
| One download | 180 s | `verify --download-timeout-ms` |
| A whole `render` | 60 min | `render --timeout-ms` |

A timeout is a failed check. The harness kills only the worker it started and the Chrome process
group that worker launched (Puppeteer starts Chrome as a group leader). It keeps the evidence. After
each render it also checks that group for leftover processes.

## Cleanup and interrupted runs

- `render` writes each R2 key to `runs/<run-id>/remote-keys.jsonl` before using it. Remote objects
  stay in R2 until `verify` has downloaded and hash-checked all of them. `verify` then deletes
  exactly the manifest-listed objects (`--keep-remote` keeps them).
- SIGINT or SIGTERM during `render` kills the current worker and its Chrome group, marks the
  manifest `interrupted`, and still uploads the log and manifest when it can. A second signal exits
  immediately.
- After an uncatchable interruption (SIGKILL, a dropped box), clean up by run ID on the box, where
  the journal is:
  ```bash
  pnpm -s run pdf-validation cleanup --run-id <run-id>
  pgrep -af 'chrome|headless_shell'   # anything left from the harness? The service's own Chrome only runs during jobs.
  ```
  `cleanup` deletes only keys listed by that run's journal or manifests, all inside
  `pdf-validation/<run-id>/`. It reports anything else under that prefix without deleting it.
- Local evidence is never deleted. Remove `pdf-validation/runs/<run-id>` by hand when done.

## Service safety

`render` leaves the report server running. There is no pause or drain. Run it at a quiet time.
Overlapping production work is recorded per render: the service's PM2 log lines and any Chrome
processes the harness didn't start. It doesn't affect PDF checks. The manifest records PM2 state
before and after, kernel OOM lines since the start (`journalctl -k`, else `dmesg`), and a health
check of the live service (`GET /tailwind.css`). Unavailable diagnostics are reported as such. A
service that isn't `online` after the run fails `render`.

## Run directory

```
runs/<run-id>/
  render.log, manifest.json, remote-keys.jsonl      # box
  downloaded/  manifest.json, pdf/<browser>/<fixture>.pdf, render.log
  inspect/<fixture>.<browser>/  pages/*.png  diff/*.png  text/*.txt  inspection.json
  inspect/tools.json                                # Poppler, OS, Node in the image
  results.json  summary.md  llm-review-request.md  llm-review.json  remote-cleanup.json
```

## Changing fixtures

The fixtures are in `src/fixtures/`. Each family computes its expectations independently of the
production code: page budgets, row order, totals and dates written out. A change to a fixture
changes its hash, so its baselines and page counts no longer apply until they are approved again.
Bump `FIXTURE_MANIFEST_VERSION` when the meaning changes. `src/__tests__/fixtureContracts.test.ts`
fails when the fixture types drift from the deployed inputs. Render and verify must use the same
harness revision; a fixture hash mismatch fails.
