# PDF validation harness

Post-deploy validation of every PDF report type, run by an operator. Ticket:
`.scratch/report-server-provisioning/issues/19-post-deploy-pdf-validation.md`. Memory measurement
and failure scenarios (`render --measured`, `render --failure-scenarios`) are ticket 20:
`.scratch/report-server-provisioning/issues/20-post-deploy-memory-and-failure-validation.md`.

Two stages share one run ID:

| Stage | Where | Does | Exit codes |
| --- | --- | --- | --- |
| `render` | Lightsail box, deployed checkout | Renders fixtures through the deployed `dist` code in isolated workers, uploads each PDF to R2, checks bytes (`%PDF-` … `%%EOF`, nonempty), and uploads a manifest. With `--measured` / `--failure-scenarios` it also records memory and failure-cleanup evidence | 0 = ready to verify, 1 = failure |
| `verify` | Operator's Mac | Downloads and hash-checks, inspects in the pinned Docker image (Poppler, 144 DPI), checks the fixture expectations, compares with approved baselines and memory thresholds, merges the LLM review, deletes the run's R2 objects | 0 = pass, 1 = fail, 2 = needs-review |
| `cleanup` | Either | Deletes a run's listed R2 objects (interrupted or abandoned runs) | 0 / 1 |
| `approve`, `accept` | Mac | Records human approvals in `baselines/approvals.json` | |

All commands run from `apps/report-server`:

```bash
pnpm -s run pdf-validation <command> [options]   # builds the harness (tsc), then runs it
```

`pnpm` reports any non-zero exit as 1, so `verify`'s needs-review (2) shows as 1 through `pnpm`.
Read the status line it prints, or run `node pdf-validation/dist/cli.js <command>` after a build
to get the 0/1/2 code itself.

## What it validates, and what it doesn't

- Validated: the deployed HTML generators, CSS, `generatePDFAndUpload`, the selected browser, upload
  to R2, and the PDFs' content, pagination, page sizes and rendering.
- Checked: Committee Roster cells must appear in full, except in the columns a fixture explicitly
  allows to truncate (`allowedTruncation`). This is checked on rosters of up to 60 members;
  larger rosters check row tokens only.
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

## Memory measurement and failure scenarios (ticket 20)

**Measuring happens on the box; judging happens in `verify`.** `render` never compares memory with
thresholds.

### `render --mode full --measured`

- Renders the measured fixtures (`MEASURED_FIXTURES` in `src/measurements.ts`: the large fixture
  of each family plus `roster-ed45-split` as an ordinary single report; together they cover every
  job type) `--repetitions` times per browser (default 3). Within a repetition, each fixture's
  browsers run back to back, and which browser goes first alternates between repetitions.
  `--fixtures` narrows the set. A measured run replaces the normal fixture plan, so it isn't
  also ticket 19's full run: run `--mode full` without `--measured` for that.
- Each repetition gets a 10 s idle baseline (`--idle-ms`) with no worker running, then sampling
  every 100 ms (`--sample-interval-ms`) from fork to worker exit. Downloading and hashing the PDF
  and uploading evidence happen outside that window.
- **What's sampled** (Linux: `/proc`; macOS: `ps`, with bigger gaps):
  - **harness:** the worker's Node RSS and its Chrome tree, kept separately and also summed per
    sample. Attribution is by worker descendants, Chrome's process group, and the render's `TMPDIR`
    in the command line. A process stays attributed once seen, so reparented Chrome is still
    counted. Unrelated Chrome is never added.
  - **service:** the live report-server (PM2's pid) and its descendants. This is context only and
    never part of the harness numbers.
  - **system:** `MemAvailable` and swap in use.
  - Also recorded: actual gaps, per-process peaks with pid and start time, duration, and leftovers.
    RSS sums are approximate, because shared pages count once per process.
- **Interference:** service job log lines, service-tree Chrome, other Chrome, or a missing service
  pid during a repetition flags it. `verify` marks that fixture/browser needs-review, so repeat it.
- Repetition 1's PDF is the run's normal render record: `verify` checks it like any other render
  (baselines, page counts, LLM review). Later repetitions' PDFs are uploaded as extra objects
  (`pdf/<browser>/<fixture>.r<n>.pdf`), hash-checked and cleaned up.
- Evidence: `measurements.json` (per-repetition summaries), `measurement-samples.jsonl.gz` (every
  raw sample, so thresholds can be re-derived), both uploaded with the PDFs and listed in the
  manifest with SHA-256s.

### `render --failure-scenarios`

Runs each scenario in `src/scenarios.ts` once per selected browser, in its own worker, using
`roster-quick`:

| Scenario | Injection (worker only) |
| --- | --- |
| `setcontent-rejects`, `pdf-stream-rejects` | the launched browser's page rejects `setContent` / `createPDFStream` |
| `upload-rejects`, `upload-returns-false` | the deployed `dist/s3Utils` `uploadFileToR2` export rejects / resolves `false` |
| `close-no-page` | `browser.newPage()` rejects, so `generatePDFAndUpload` closes a browser with no page |

Each one passes only if:
- the failing call settles within 30 s (`--failure-timeout-ms`). The bound covers the whole
  `generatePDFAndUpload` call, including Chrome's launch and, for the upload scenarios, the render
  before the upload. Module loading and HTML building before it are not counted;
- it reports the original error;
- no Chrome is still running once the failing call returns (`no-chrome-after-failure`). The worker
  waits while the harness checks. The check can't wait for the worker to exit, because Puppeteer
  kills an unclosed browser when its Node process exits, and the long-lived service never does;
- the same worker then renders the report again successfully;
- no Chrome is left over after the worker exits.

A scenario that runs out of time fails, even though the harness then kills the worker and Chrome.
That way the harness timeout can't hide a missing production close timeout. Results go to
`failure-scenarios.json`, which is uploaded like the measurements. No production job, credential
or code is touched.

**Expected before PR #148:** `close-no-page` fails with `shell`. chrome-headless-shell with
`--single-process` deadlocks in an unbounded `browser.close()` with no page open. That is the hang
#148's bounded close fixes. Full Chrome passes it. After #148 it should pass with both browsers in
about 10 s, #148's close timeout. Checked locally on macOS against main and the #148 branch.

### Thresholds

`approve --thresholds` records, per fixture, browser and **browser build ID**, the max sampled peak
across repetitions plus `--headroom-pct` (default 10). It does this for two metrics: `chromePeakKb`
(the Chrome tree) and `harnessPeakKb` (worker plus Chrome). It skips any fixture/browser pair that
verify would flag: fewer repetitions than planned (an interrupted run), a failed or interfered
repetition, or a sampling gap over 1 s. Thresholds are keyed by browser build, not deployed commit:
#148 changes which browser the service launches, not the builds Puppeteer pins. So thresholds
approved from a pre-#148 measured run still apply afterwards. The deployed commit, Puppeteer
version and instance are recorded with each threshold.

`verify` then:
- fails a peak over its threshold;
- marks needs-review for a missing threshold, missing measurement files, interference, or a
  sampling gap over 1 s;
- fails a repetition that failed, or missing repetitions.

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
`apps/report-server/.env`. Every run's keys are under `pdf-validation/<run-id>/`, and the service's
`.env` is never edited.

**Baselines are the one exception to the run prefix, by design.** `approve` copies approved PDFs to
`pdf-validation/baselines/<sha256>.pdf`: they must outlive the run's cleanup, and they're
content-addressed so `approvals.json` pins exact bytes. Nothing deletes them automatically. To
retire one, remove its entry from `approvals.json`, then delete the object by hand once no entry
references that hash. Preflight
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
   Commit `baselines/approvals.json`. To replace a browser-paginated count after an intentional
   layout change, run `approve --run-id <id> --reviewer "Your Name" --page-counts --browser chrome`
   again. Only that approved count mismatch can be replaced; fixed fixture counts and other
   content failures still block approval.
4. **Memory and failure cleanup, still before #148 (ticket 20).** On the box, at a quiet time:
   ```bash
   pnpm -s run pdf-validation render --mode full --browser both --measured --failure-scenarios
   ```
   This takes roughly 25–30 minutes: 9 fixtures × 2 browsers × 3 repetitions, each with a 10 s
   idle baseline (full Chrome took about 135 s of render time per pass on the box), then 10
   scenarios. `shell` is harness-installed. On the Mac, `verify` it and do the LLM
   pass as in step 2. The summary's **Memory** table compares full Chrome with headless-shell on
   the box.
   - This run is the go/no-go evidence for merging #148. The pre-#148 build launches the same
     browser builds with the same production args #148 ships; #148 only changes the `headless`
     value and bounds `browser.close()`.
   - Expect `close-no-page`/`shell` to fail, which confirms the hang #148 fixes. Every other
     scenario should pass.
   - If the numbers hold up, approve thresholds:
     ```bash
     pnpm -s run pdf-validation approve --run-id <measured-run-id> --reviewer "Your Name" --thresholds
     ```
     Commit `baselines/approvals.json`. Repeat interfered pairs first (`--fixtures a,b`).
   - Plain `render --browser shell` without `--measured` is diagnostic evidence only.

### After #148 is deployed

5. On the box, run `render --mode quick --browser both`, then `--mode full --browser both`.
   Then repeat the measured run (`--mode full --browser both --measured --failure-scenarios`).
   `close-no-page` should now pass with both browsers. This is the on-box check of #148's
   bounded close. Memory is judged against the thresholds approved in step 4. If the post-#148
   peaks differ materially from the pre-#148 headless-shell ones, look into it before re-approving
   thresholds from this run (`approve --thresholds` replaces entries with the same key).
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
   To accept an LLM `defect` or `question` as intended layout, name the finding.
   `--finding` must match exactly one finding on that page, and its full text is recorded, so a
   later finding on the same page stays open:
   ```bash
   pnpm -s run pdf-validation accept --run-id <id> --reviewer "Your Name" --kind layout-finding \
     --item changes-200.chrome --page 1 --finding "right 2.5in empty" --reason "portrait container; tracked separately"
   ```
   If evidence was contaminated or checks failed, render again.

## Statuses

Fail takes precedence over needs-review, which takes precedence over pass. `summary.md` and
`results.json` are generated from the same object.

- **Fail (1):** render failure, preflight or timeout; missing or unreadable PDF; SHA-256 mismatch
  with the manifest (including missing or corrupted render logs); wrong page count or size (0.5 pt tolerance); missing, duplicated or misordered
  rows; missing totals or required text; wrong outcome colour; text or page count that differs from
  an approved baseline; an LLM `defect` nobody accepted; cleanup failure.
- **Needs-review (2):** no approved baseline; no approved page count for a browser-paginated
  fixture; image differences; an LLM `question`; a missing LLM review or unreviewed pages;
  unavailable diagnostics (PM2, OOM log); service restarts or OOM lines during the run; a dirty or
  stale deployed build; for measured runs, a missing memory threshold or measurement file,
  production interference, or a sampling gap over 1 s.
- **Memory and failure scenarios fail (1)** on: a measured peak over its approved threshold, a
  failed or missing measured repetition, or a failure scenario that ran out of time, lost the
  original error, left Chrome running or blocked the next report.
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
| A whole `render` | 60 min; 180 min with `--measured` | `render --timeout-ms` |
| A failure scenario's failing call | 30 s | `render --failure-timeout-ms` |
| Measured idle baseline / sample interval | 10 s / 100 ms | `render --idle-ms` / `--sample-interval-ms` |

A timeout is a failed check, and the evidence is kept. The harness kills only processes it can
attribute to the render:
- the worker it started;
- the Chrome process group that worker launched (Puppeteer starts Chrome as a group leader);
- any process whose command line mentions the render's own `TMPDIR` (a fresh `/tmp/vft-pdf-<browser>-XXXXXX`,
  removed after the render). Puppeteer puts Chrome's profile there, so this catches a Chrome that
  started before the worker could report its pid. The service's Chrome never matches. It's kept short
  on purpose: Chrome exits at launch (code 133) when its socket path under `TMPDIR` passes ~108 bytes.

After each render it checks for leftovers the same way. Any leftover fails the render.
Every R2 request has the same per-case timeout. The end-of-run diagnostics and the evidence upload
get their own deadline after the invocation timer stops.

## Cleanup and interrupted runs

- `render` writes each R2 key to `runs/<run-id>/remote-keys.jsonl` and to the manifest's
  `attemptedKeys` before using it. This covers a PDF uploaded by a render that then timed out. Remote objects
  stay in R2 until `verify` has downloaded and hash-checked all of them. `verify` then deletes
  exactly the manifest-listed objects (`--keep-remote` keeps them).
- If a render has no verified local PDF (including an upload that succeeded before the box failed
  to download it), automatic cleanup keeps the run's remote evidence. Use explicit `cleanup` to
  discard that evidence. Failed cleanup attempts are retried by the next `verify`; only successful
  cleanup results are reused without contacting storage.
- SIGINT or SIGTERM during `render` kills the current worker and its Chrome group, marks the
  manifest `interrupted`, and still uploads the log and manifest when it can. A second signal exits
  immediately.
- After an uncatchable interruption (SIGKILL, a dropped box), clean up by run ID on the box, where
  the journal is:
  ```bash
  pnpm -s run pdf-validation cleanup --run-id <run-id>
  pgrep -af 'chrome|headless_shell'   # anything left from the harness? The service's own Chrome only runs during jobs.
  ```
  `cleanup` deletes only keys listed by that run's journal or manifests (`objects` and `attemptedKeys`), all inside
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
               measured: measurements.json, measurement-samples.jsonl.gz, pdf/<browser>/<fixture>.r<n>.pdf
               failure scenarios: failure-scenarios.json, failures/<browser>/<scenario>-next.pdf
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
