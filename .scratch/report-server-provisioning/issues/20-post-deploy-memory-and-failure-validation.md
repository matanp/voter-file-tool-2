# 20 - Add post-deploy memory measurement and failure scenarios

Status: ready-for-human
Type: task
Blocked by: 19 (harness merged in #155)

Extends the harness from [19 - Post-deploy PDF validation](19-post-deploy-pdf-validation.md). The memory comparison runs **before** PR [#148](https://github.com/matanp/voter-file-tool-2/pull/148) (ticket 12: shell selection and bounded browser close) merges, and decides whether it should. Only the on-box check of #148's bounded close needs #148 deployed.

## Why

PR #148's memory numbers come from emulated Docker, and its bounded-close fix was verified locally. Measure Chrome and report-server memory on the actual 1 GB Lightsail instance, set future thresholds from those measurements, and verify failure cleanup with the real browser on the box.

The harness can render with headless-shell on the pre-#148 build. It installs the browser into its own cache and patches the launch in its worker, so the service is untouched. For memory, #148 changes only the `headless` value and adds the close timeout. The launch args, page setup and Puppeteer's pinned browser builds stay the same (Puppeteer 23.11.1, both builds 131.0.6778.204). So a pre-#148 `--measured --browser both` run measures what #148 would ship, and it is the go/no-go evidence for merging #148.

## Scope

- Add a measured mode to 19's `render` stage (`render --full --measured`): large fixtures repeated, with RSS sampling. Same fixtures, browser selection, run ID, storage bucket/prefix, and cleanup as 19.
- **Measuring happens on the box; judging happens in `verify`.** `render` records raw measurements and failure-scenario results and uploads them with the PDFs. 19's `verify` stage compares the measurements against approved memory thresholds on the operator's Mac and sets the 0/1/2 exit code, as it does for baselines.
- Sample the harness Node RSS and its owned Chrome process tree separately and together. Independently record the live report-server Node/process-tree RSS, available system memory, and swap. Never label harness measurements as live-service measurements or add unrelated Chrome processes to the harness total. Record idle baseline, sampled peaks, duration, sample interval, and leftover processes. RSS sums are approximate because shared pages may be counted more than once.
- Run with the normal service left running. Record overlapping production work; flag affected memory comparisons for review and repeat those samples if necessary.
- Exercise post-launch render failure, upload failure, and the no-page close-hang scenario in the isolated worker using the deployed code and real browser. Verify bounded completion, observable original failure, no additional Chrome processes, and a successful subsequent report. Kill only processes created by the harness. Never inject failures into normal production jobs or alter production credentials.
- For the initial #148 validation, compare full Chrome and headless-shell with identical fixtures, flags, and repeated runs. Establish future memory thresholds from these on-box measurements, not emulated Docker results.

## Implementation contract

- **Failure injection uses 19's worker patching; no production code changes.** In the worker only:
  - post-launch render failure: patch the launched browser's page so `setContent` or `createPDFStream` rejects;
  - upload failure: replace the `uploadFileToR2` export of `dist/s3Utils` (both a rejection and a `false` result);
  - no-page close hang: make `browser.newPage()` reject, so `generatePDFAndUpload` closes a browser with no page open. With headless-shell and `--single-process` this deadlocks `browser.close()` unless the deployed build bounds it.
- Default timeout for failure-cleanup cases: 30 seconds (recorded override allowed). The harness timeout must not conceal a missing production close timeout: on a pre-#148 build the close-hang case must fail with `shell`, not pass after the harness kills Chrome. Full Chrome doesn't deadlock there and should pass on either build. A pre-#148 run therefore confirms the hang; only a post-#148 run can show the bounded close.
- Default RSS interval: 100 ms; idle baseline: 10 seconds before each measured render. Record actual sampling gaps, process IDs/start times, per-process and combined peaks, duration, swap, and available memory. Track descendants so reparented leftover Chrome processes remain attributable. Record service activity/restarts and interference; system totals are context, not causal attribution to the harness.
- Three measured repetitions of each large fixture per selected browser, alternating browser order between repetitions. Record each result and median/max sampled peaks; do not silently discard failures.
- Rasterization/comparison already happens off the box in `verify`. Keep any other harness work (uploading evidence, hashing, writing the manifest) outside render-memory measurement windows.
- **Hand-off to `verify`:** `render` writes measurements (`measurements.json`: per-repetition samples summary, per-process and combined peaks, idle baselines, gaps, interference flags) and failure-scenario results (`failure-scenarios.json`) into the run, lists both in the run manifest with SHA-256s, and uploads them to the run's R2 prefix. Keep the raw sample series too, compressed, so thresholds can be re-derived later. `verify` downloads and hash-checks them like the PDFs, and `cleanup` removes them with the run's other objects.
- **`render` exit codes stay 0/1.** A failure scenario that doesn't complete within its bound, loses the original error, leaves extra Chrome processes, or blocks the next report is a `render` failure (exit 1), reported again by `verify`. `render` never judges memory against thresholds.
- **Thresholds are checked in `verify`.** Committed, approved thresholds live alongside 19's baselines, keyed by browser and **browser build ID** (not deployed commit), so thresholds approved pre-#148 still apply after it. The deployed commit is recorded for provenance. A measured peak over its threshold fails. Missing thresholds, missing measurement files for a `--measured` run, or samples flagged for production interference are needs-review (exit 2). Threshold approval records reviewer, run ID, browser/build versions, and values, alongside 19's baseline approvals.

## Output and acceptance

- Measured mode and failure scenarios are invoked through 19's `render` command, judged by 19's `verify` command, and documented in 19's runbook, writing measurements alongside 19's evidence.
- **Before #148 merges:** demonstrate a measured full run with both browsers and the failure scenarios on Lightsail. Attach the evidence, decide on #148 from the Chrome vs headless-shell numbers, and have a human approve initial memory thresholds. Record new OOM events and unexpected service restarts, and report unavailable diagnostics explicitly. Expected: `close-no-page`/`shell` fails, and every other scenario passes.
- **After #148 is deployed:** repeat the measured run. `close-no-page` passes with both browsers (bounded close on the box), and memory stays within the approved thresholds.
- Use the results to close ticket 08's single-report Chrome measurement and ticket 12/18 acceptance, or record what remains.

Related: [08 - Memory measurements](08-measure-report-server-memory.md), [12 - Headless shell](12-chrome-headless-shell.md), [18 - Failure cleanup](18-verify-chrome-cleanup-after-render-failure.md). This ticket covers PDF rendering memory and cleanup, not ticket 08's XLSX/import/restart matrix.

## Comments

### 2026-11-20: built on branch `report-server-measured-validation`

Built off main `9727373a` and verified before building. The pre-#148 measurement argument held. Two refinements are folded in above: the close-hang expectation is keyed by browser, and thresholds are keyed by browser build. Ordering changed so the memory comparison happens before #148 merges.

What's in the branch (runbook: `apps/report-server/pdf-validation/README.md`, "Memory measurement and failure scenarios"):
- **Measured mode:**
  - `render --mode full --measured [--repetitions 3 --sample-interval-ms 100 --idle-ms 10000]` covers 9 fixtures (each family's large one, plus `roster-ed45-split`) across every job type.
  - Repetition 1's PDF is the normal render record. Later repetitions are extra hash-checked objects.
  - Sampling reads `/proc` every 100 ms. Harness worker, harness Chrome tree, service tree and system memory are kept separate.
- **Failure scenarios:** `render --failure-scenarios [--failure-timeout-ms 30000]` runs 5 scenarios per browser:
  - setContent rejects;
  - createPDFStream rejects;
  - upload rejects;
  - upload resolves false;
  - newPage rejects, so close is called with no page.

  Each scenario is followed by a render in the same worker, which must succeed.
- **Verify, approve and the manifest:**
  - `verify` judges memory against `approvals.thresholds` and turns scenario results into checks.
  - `approve --thresholds [--headroom-pct 10]` records max peak plus headroom per fixture, browser and build, for the `chromePeakKb` and `harnessPeakKb` metrics.
  - Manifest v2. `verify` still reads v1 runs.
- **Chrome detection:** now matches the executable, not the arguments. Every box run so far had flagged "other Chrome" on every render, because the harness's own `pnpm … --browser chrome` wrapper matched.

Local check on macOS against the dev test bucket (not the box; numbers are not on-box numbers):
- **Main (pre-#148):** `close-no-page`/`shell` failed at the 30 s bound (the deadlock reproduces) and the other 9 scenarios passed. The Chrome tree peaked at about 360–400 MiB with full Chrome and 170–206 MiB with headless-shell, for `roster-ed45-split` and `signin-151`.
- **#148 branch** (via `--deployed-dist`): all 10 scenarios passed. `close-no-page`/`shell` settled in about 10 s through the bounded close.
- **Thresholds:** `approve --thresholds` followed by `verify` passed the approved pairs. Remote cleanup deleted every object.

Remaining, all on the box:
1. Before #148: the measured run (README step 4). Verify and do the LLM pass, decide on #148, approve thresholds, and commit `approvals.json`.
2. After #148 is deployed: repeat it, check `close-no-page` passes with both browsers, and check memory against the thresholds.
3. Use the numbers to close ticket 08's single-report Chrome measurement and the box-acceptance parts of tickets 12 and 18.

