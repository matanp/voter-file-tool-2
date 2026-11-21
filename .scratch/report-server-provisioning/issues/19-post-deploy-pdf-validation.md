# 19 - Add post-deploy PDF validation (quick mode and baseline comparison)

Status: ready-for-human
Type: task

Must merge and deploy **before** PR [#148](https://github.com/matanp/voter-file-tool-2/pull/148), so the box can be checked before and after it. Follow-up: [20 - Memory measurement and failure scenarios](20-post-deploy-memory-and-failure-validation.md).

**Building vs. accepting:** an agent can build and locally test the whole harness (both stages, fixtures, comparison image, LLM review checklist, runbook) without the box. Acceptance needs operator runs on Lightsail before and after #148 plus human baseline approval; those are human steps, not blockers for the build.

## Why

PR #148 switches PDF rendering to chrome-headless-shell. Its browser benchmarks and PDF comparisons were run locally; repeatable validation on the actual 1 GB Lightsail instance is still needed. Provide an operator-invoked harness that renders every PDF report type on the box through the deployed code and uploads it to R2, then verifies the uploaded PDFs locally against human-approved baselines.

This ticket covers PDF correctness and comparison. Memory sampling, repeated measurements, and controlled failures are ticket 20, which extends this harness's render stage.

## Scope

- **Two stages, one run ID.**
  - **`render` (on the box):** render fixtures through the deployed rendering/upload code and upload each PDF to R2. Box-side checks are limited to what needs no extra tooling: render/upload completed within its timeout, output is nonempty, and starts with `%PDF-` and ends with `%%EOF`. Record each object's key, byte size and SHA-256 in a run manifest that is itself uploaded to R2. No Poppler, Docker, or other new system packages on the box.
  - **`verify` (on the operator's Mac):** download the run manifest and PDFs from R2, confirm the SHA-256s, run the deterministic checks in the pinned comparison image, then the LLM review pass, and write the final status. `verify` owns the 0/1/2 exit code for the run.
- **Quick mode:** a small synthetic fixture for every PDF job type. **Full mode:** quick coverage plus every boundary/stress fixture in the manifest, each rendered once. Run fixtures sequentially. Run `render` manually on the low-traffic server with the normal service left running; no pause/drain mechanism. Record observed overlapping production work.
- Compare page counts, dimensions, normalized extracted text, and rasterized page images against approved baselines. Save visual diffs for human review; do not require byte-identical PDFs or automatically approve new baselines. Pin comparison tooling and record browser/font versions.
- **Browser selection:** `render --browser chrome|shell|both`. `both` renders identical fixtures with identical code, CSS, and flags in each browser, alternating browser order, so full Chrome and headless-shell can be compared on the same instance.
- **Storage:** prefer a separate test R2 bucket; fall back to a dedicated test prefix in the production bucket only when no test bucket is configured. Either way every key is under `pdf-validation/<run-id>/`. Clean up only objects listed in that run's manifest.

## Implementation contract

### Durable harness and execution boundary

- Commit the harness, synthetic fixture manifests, comparison configuration, LLM review checklist, and operator runbook. Keep generated runs ignored. This explicitly authorizes promotion of useful local layout-verification helpers; the uncommitted-scripts constraint in the layout runbook ([`.scratch/report-layout-verification.md`](../../report-layout-verification.md)) does not apply here. Do not copy private reference PDFs or historical runs into version control.
- The box gets code only through `scripts/deploy-lightsail.sh` (`git pull origin main` into `/opt/voter-file-tool`), so `render` runs from the deployed checkout. It must work against both the pre-#148 build (`headless: true`, unbounded `browser.close()`) and the post-#148 build. Record the deployed commit and whether the working tree or `dist` differs from it. `verify` runs from any checkout on the Mac; record its revision too.
- Import the deployed compiled HTML generators, `generatePDFAndUpload`, and the pure helpers they need (`committeeMappingHelpers`, `committeeRosterConfig`, `signInSheetHelpers`) from `apps/report-server/dist` in an isolated worker process. Do not import the service entry point, enqueue production jobs, query real member records, or send report-completion callbacks. This validates rendering/storage, not the frontend/job/database pipeline.
- **Per-job-type call wiring is mirrored, not imported.** For each job type, `processJob` in `src/index.ts` picks the generator, its arguments, and `generatePDFAndUpload`'s `useLandscape`/`overrides`. The harness can't import that, so it keeps its own committed table of those call shapes (the paper column below). Note in the runbook and summary that the mirror is outside what is validated, and that it can drift from `index.ts`; any later change to those call sites should update the mirror.
- Serve the deployed built CSS from a harness-owned local endpoint and set the worker's `PORT` accordingly. Record CSS/source hashes and verify the stylesheet loaded. Do not rebuild or replace deployed assets during validation.
- **No production code changes.** `generatePDFAndUpload` hardcodes its launch options and calls `uploadFileToR2` directly, so the worker controls them in its own process before requiring `dist/utils`:
  - wrap `puppeteer.launch` (the same `puppeteer` default export `dist/utils` uses) to set `headless` and `executablePath` for the selected browser, keeping the production `args` untouched. Record the effective launch options per render. Ticket 20 adds failure injection through the same mechanism.
  - point uploads at the test bucket by setting `R2_BUCKET_NAME` (and the test bucket's `R2_*` credentials, if separate) in the worker's environment before requiring `dist/s3Utils`. `s3Utils` builds its client from `R2_*` at import and reads the bucket at call time; its `dotenv` `config()` does not override variables already set. Load these from a harness-owned env file, never by editing the service's `.env`.
  - Do not add parameters, env flags, or test hooks to `apps/report-server/src`.
- **Browsers:** before the pre-#148 build is replaced, the box has only full Chrome in `~/.cache/puppeteer`; after #148, full Chrome may remain only as a leftover. If a selected browser is missing, the harness installs it with `npx puppeteer browsers install <chrome|chrome-headless-shell>` into a harness-owned cache directory (`PUPPETEER_CACHE_DIR` for the worker only, under the run's parent directory, reused across runs), never into the service's cache. Record the browser build ID, path, and whether it was harness-installed. If installation fails, preflight fails naming the browser.
- A fixed render clock is scoped to the worker: freeze dates only while generating HTML; real browser/network/cleanup timers keep running.
- Record deployed and harness revisions and relevant dirty/artifact hashes.

### Fixture manifest v1

Seven render families currently cover eight PDF job types: `ldCommittees` and `committeeRoster` share a renderer but need distinct fixtures. Version and hash every fixture. Fix author, dates, timezone (`UTC`), locale, ordering, and stable synthetic row tokens. Assert required text/token occurrences and independently calculated totals, not just a nonzero file size.

| Family / job types | Paper width x height | Quick fixture | Full fixtures in addition to quick |
| --- | --- | --- | --- |
| Legacy committees (`ldCommittees`) and configurable roster (`committeeRoster`) | Letter landscape, 792 x 612 pt | One ED with 4 members for each mode; one page each | Roster 29-member boundary (1 page), 45-member split (29 + 16, 2 pages), minimum/default/all columns, missing contacts and long values; large 800 EDs x 4 members in one jurisdiction (134 pages under the specified 30-unit budget). Exercise legacy mode separately, including its large output. |
| Sign-in (`signInSheet`) | Legal landscape, 1008 x 612 pt | 7 members in one sheet; 1 page | 0, 8, 17 and 151 members: 1, 2, 3 and 19 pages; multi-jurisdiction resets, wrapping and missing-contact fixtures |
| Weight summary (`designationWeightSummary`) | Letter landscape, 792 x 612 pt | One jurisdiction with 4 rendered rows; 1 page | 20/21 rendered-row boundary (1/2 pages); 200 rendered rows in one group (10 pages); multiple groups and independently computed subtotals/grand totals |
| Vacancy (`vacancyReport`) | Letter landscape, 792 x 612 pt | 4 rows in one group | 200 rows across 4 groups, zero/partial/full vacancies, independently calculated totals, empty output |
| Changes (`changesReport`) | Letter landscape, 792 x 612 pt, matching current print call | 4 short rows with fixed dates | 200 rows across fixed dates, long details, all supported change variants, empty output |
| Petition outcomes (`petitionOutcomesReport`) | Letter landscape, 792 x 612 pt | 4 rows covering Won/Unopposed/Tie/Lost | 200 rows across committees, long names, empty output, verify outcome colors |
| Designating petition (`designatedPetition`) | Legal portrait, 612 x 1008 pt | 1 requested sheet with short candidate/appointment values | 10 requested sheets, long candidate/office/address values and vacancy appointments; verify sheet numbering and paragraph wrapping |

- Reuse synthetic fixture definitions from `apps/report-server/data/layout-verification/runner.ts` and `committee-roster-runner.ts` where available; promote them because ignored files will not be present in a fresh checkout. Their old results do not establish current acceptance.
- The listed counts are intended assertions, not measurements from a new render. Confirm them during harness implementation using independent fixture expectations and PDF inspection. Vacancy, changes and outcomes rely on browser pagination; establish their exact per-fixture counts from an inspected full-Chrome reference (the pre-#148 on-box run) and commit those expectations before approving the headless-shell candidate. Never derive expected counts from the candidate output. Missing expectations remain needs-review.
- Review changes-report geometry explicitly: its component uses a portrait-shaped container while the production print call is landscape. Preserve the current print contract for comparison and report clipping/overflow as defects; do not silently approve a baseline or change layout in this tooling ticket.
- Require all expected row tokens exactly once where appropriate, ordered page content, correct totals, and no missing/clipped content even when page counts match. Specify allowed roster truncation per fixture; it is not permission to ignore missing data generally.

### Comparison defaults (`verify`)

- Pin a reproducible Linux Poppler toolchain (`pdfinfo`, `pdftotext`, `pdftoppm`) and image-diff dependency in a pinned Docker image; record exact versions and font identities. Do not rely on Homebrew Poppler. Rasterize at 144 DPI. Process pages sequentially and release image buffers.
- Check every page's dimensions within 0.5 pt and its expected count. Normalize extracted text with Unicode NFC and whitespace collapsing within each page; retain page boundaries, token order, punctuation, numbers and case. Keep raw extracted text too. No broad stripping of dates or digits: use deterministic HTML inputs/clock.
- Missing/unreadable PDFs, SHA-256 mismatches against the run manifest, dimension/count/content mismatches, missing rows, cleanup failures, or unaccepted layout defects fail. Image differences produce needs-review with per-page images/diffs and changed-pixel metrics, not automatic approval based on an arbitrary tolerance. A reviewer may explicitly accept documented visual-only changes; missing/duplicated content cannot be waived as a visual difference. Missing baselines remain needs-review. Fail takes precedence over needs-review.
- PR #148 already reports ~1% glyph-advance differences and three designating-petition paragraphs wrapping one word differently; expect these as needs-review, not failures, as long as content checks pass.

### LLM review pass (`verify`)

- After the deterministic checks, an LLM reviews each rendered page image (and its diff, when a baseline exists) against a committed review checklist: clipped or overflowing content, text cut at page edges, overlapping elements, wrong orientation, unreadable text, broken table structure, the changes-report geometry above, and outcome colors.
- The intended runner is Claude Code in the operator's session over the run directory, following the checklist. No API key or LLM dependency in the harness itself. The LLM writes findings to a fixed-schema file in the run directory (`llm-review.json`: fixture, browser, page, finding, severity `defect|question|none`), and `verify` merges it into the summary. If the review file is missing, the run is needs-review.
- LLM findings can only add problems: a `defect` makes the item a layout defect (fail unless a human accepts it), and a `question` makes it needs-review. The LLM cannot pass a fixture, approve or create baselines, accept visual differences, or waive a deterministic failure. Approval stays with a human.

### Timeouts, exit codes, approval

- Default timeout: 180 seconds per render/upload case and per download case, 60 minutes for a full `render` invocation. All are explicit recorded overrides. Timeout is a failed check; kill only owned worker/browser processes and preserve evidence.
- `render` exit codes: 0 = all renders uploaded and box-side checks passed; 1 = failure (including preflight/timeout). A 0 here means "ready to verify", not validated.
- `verify` exit codes: 0 = all required checks passed with approved baselines and no open LLM findings; 1 = failure; 2 = needs-review with no failures. Ticket 20 adds memory-threshold checks to `verify` under the same codes; keep the result format open to extra check kinds. Baseline approval records reviewer, run ID, fixture/tool/browser/font versions, and accepted differences; keep machine-readable and Markdown status consistent.

### Operator sequence

**Before #148 (this ticket merged and deployed, #148 not yet merged):**

1. Preflight on the box: verify deployment, browser availability, CSS, the test bucket's put/get/list/delete permissions (including `DeleteObject`, which nothing in `s3Utils` exercises), and record PM2/process/OOM diagnostic state. Create a unique run ID.
2. On the box, `render` quick, then full, with `--browser chrome`. On the Mac, `verify` each run, inspect, and approve the full-Chrome reference baselines and the browser-paginated page-count expectations. Commit the expectations.
3. Optionally `render --browser shell` (harness-installed) as diagnostic evidence only.

**After #148 is deployed:**

4. On the box, `render` quick, then full, with `--browser both` (full Chrome harness-installed if no longer present). On the Mac, `verify` headless-shell against the approved full-Chrome baselines.
5. Review visual differences and LLM findings, explicitly accept or reject them, and rerun affected renders if evidence was contaminated or checks failed. Approve headless-shell baselines for future runs.

**Every run:** `render` cleans up owned processes and keeps its local logs/manifest on the box. Remote objects stay in R2 until `verify` has downloaded and hash-checked them. `verify` then deletes only that run's manifest-listed objects, unless `--keep-remote` is set. A separate `cleanup --run-id <id>` deletes a run's listed objects for interrupted or abandoned runs. Handle SIGINT/SIGTERM in both stages and document recovery by run ID after an uncatchable interruption. Verify the existing service remains healthy after `render`.

## Suggested build order

Two slices, either one PR or two:

1. Both stages end to end with quick fixtures only: worker patching, test-bucket upload, run manifest, download/hash check, pinned comparison image, LLM review checklist and merge, exit codes, cleanup, runbook.
2. Full fixtures and the page-count expectations, plus the baseline approval records.

## Output and acceptance

- Documented `render`, `verify`, and `cleanup` commands sharing a run ID. `render` supports quick/full modes and `--browser chrome|shell|both`. `verify` writes a concise Markdown summary plus machine-readable results, logs, PDFs, visual diffs, and the LLM review under a unique local run directory.
- Record deployed commit, Node/Puppeteer/browser versions and build IDs, instance resources, fixture identifiers, bucket/prefix, comparison image digest, and baseline version so results can be reproduced.
- Distinguish pass, fail, and needs-review. Missing baselines and missing LLM reviews must be explicit; they cannot silently count as validated.
- Demonstrate a pre-#148 run (quick + full, full Chrome) and a post-#148 run (quick + full, both browsers) on Lightsail, verified locally, attach the evidence, and have a human approve the baselines. Record new OOM events and unexpected service restarts during the runs; report unavailable diagnostics explicitly.
- Document safe invocation, test-bucket setup, browser installation, timeouts, and cleanup, including interrupted runs. Leave the normal service running. Keep execution manual; automatic deploy gating and rollback are follow-ups.

Related: [12 - Headless shell](12-chrome-headless-shell.md), [20 - Memory and failures](20-post-deploy-memory-and-failure-validation.md).

## Comments

### 2026-11-19: harness built and merged (PR #155, 2026-11-17)

`render` / `verify` / `cleanup` / `approve` / `accept` are on main; runbook `apps/report-server/pdf-validation/README.md`.
Tested locally against the dev R2 bucket with synthetic data (217 tests; quick run both browsers passed; full run 68
renders). Local run evidence is in the main checkout's ignored `apps/report-server/pdf-validation/runs/`.

Remaining, all human on the box:
1. Pre-#148 quick and full runs with `--browser chrome`, verify on the Mac. No deploy needed: checked 2026-11-19,
   the box is at `45c450dc` (#166, the last report-server change) with `dist/index.js` built after it. Redeploy first
   only if report-server code merges before the run.
2. Approve the full-Chrome baselines and page counts; commit `approvals.json`.
3. After #148 is deployed, quick and full runs with `--browser both`.

The full run's report defects are filed as `.scratch/reports-polish/issues/02`–`05`.

### 2026-11-20: ticket 20 adds a pre-#148 measured run

Ticket 20's `render --mode full --browser both --measured --failure-scenarios` now runs before #148 merges (README step 4). Its repetition-1 PDFs go through the same `verify` checks. A plain `--browser shell` run is still diagnostic only. Box runs so far: full Chrome at `1a5d1b62` (#170). Full-Chrome baselines (34), page counts (9) and one acceptance come from run `20261121T005219Z` (`b7466865`).
