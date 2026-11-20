# 09 - Avoid two copies of Chrome without giving up concurrency

Status: needs-triage
Type: task
Blocked by: 10, 11, 12 (re-evaluate with their measurements)

## Why

`apps/report-server/src/index.ts` has `const QUEUE_CONCURRENCY = 2`, and `generatePDFAndUpload`
(`apps/report-server/src/utils.ts`) launches a new Chrome for each job. Two PDF jobs together means two copies of Chrome
on a 1 GB box, which is the worst case for memory. One copy already took the box down to 75Mi available (ticket 04).

Running several jobs at once is worth keeping (decided 2026-11-08), so dropping to `QUEUE_CONCURRENCY = 1` is ruled out.
Tickets 10–12 come first; decide between the options below once their measurements (ticket 08 method) are in.

## Options

1. **One shared browser, one page per job (recommended).** Launch Chrome once and keep it running. Each PDF job opens
   its own page with `browser.newPage()` and closes only that page when done.
   - Pros: concurrent PDFs share one browser process instead of two full launches. Each render also skips Chrome's
     startup, so jobs are faster.
   - Cons: `--single-process` (set today) is unstable with several pages, so it probably has to go, which raises the
     baseline. Check this against ticket 08's numbers. Also needed: relaunch on `disconnected`/crash, close the browser
     after an idle timeout so it doesn't sit in memory, and cap how many pages can be open at once (2–3) so a burst of
     requests can't pile up pages.
2. **Serialize only the Chrome section.** Keep `QUEUE_CONCURRENCY = 2`, but guard the Chrome section of
   `generatePDFAndUpload` with a lock that lets one render through at a time (a small promise-chain mutex, or
   `async.queue(..., 1)` just for renders).
   - Pros: the smallest change. An xlsx export or voter import still runs while a PDF renders.
   - Cons: two PDFs requested together wait in line.
3. **Do nothing here,** and rely on 10–12 freeing enough memory.
   - Pros: no work.
   - Cons: risky. One Chrome already left 75Mi available, and ticket 11's PM2 limit doesn't count Chrome's memory, so a
     burst of PDF requests could still take the box down. Only acceptable if ticket 08 step 3 (two reports back to back)
     stays out of deep swap after 10–12.

Whichever option is picked, check whether anything relies on job timing (timeouts or webhook expectations on the
frontend side).

## Acceptance

- Option 1: a unit test shows two PDF jobs enqueued together trigger at most one `puppeteer.launch`, each job's page is
  closed (on failure too), and a disconnected browser is relaunched for the next job. On the box (ticket 08, step 3), two
  back-to-back reports show one browser, and peak memory is recorded.
- Option 2: a unit test (mocking `puppeteer.launch`) shows at most one launch in flight when two PDF jobs are enqueued
  together. On the box, two back-to-back reports show one copy of Chrome at a time.
- Option 3: ticket 08 step 3, repeated after 10–12, is recorded here with the reasoning for doing nothing.

## Comments
