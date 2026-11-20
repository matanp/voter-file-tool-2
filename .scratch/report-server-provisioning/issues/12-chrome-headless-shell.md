# 12 - Try Puppeteer's lighter chrome-headless-shell

Status: ready-for-agent
Type: task

## Why

`generatePDFAndUpload` (`apps/report-server/src/utils.ts`) launches the full Chrome in new headless mode
(`headless: true`). Puppeteer 23 (`apps/report-server/package.json`: `^23.4.0`) can also run `chrome-headless-shell`,
the old headless build without the browser UI, which is usually lighter. Chrome is probably the biggest memory user
during a report.

## Fix

- Launch with `headless: 'shell'`.
- In `infrastructure/scripts/03-build-packages.sh`, install that browser: `npx puppeteer browsers install chrome-headless-shell`.
  Drop the full `chrome` install if nothing else needs it.
- Try these extra flags one at a time and keep only the ones that measurably help: `--disable-extensions`,
  `--disable-background-networking`, `--disable-default-apps`, `--no-first-run`, `--mute-audio`.
  `--single-process` is already set.
- Check that PDF output doesn't change: fonts, page size, backgrounds, and the layout checks in
  `.scratch/report-layout-verification.md`. This matters most for the Committee Roster PDF.

## Acceptance

- Ticket 08's single-report measurement, repeated, shows lower Chrome peak RSS than full Chrome. Record both numbers.
- The report PDFs look the same as before (the layout verification still passes).

## Comments

### 2026-11-10: implemented on branch `report-server-headless-shell`

Launch uses `headless: 'shell'`. Provisioning (`03-build-packages.sh`) installs `chrome-headless-shell` in place of `chrome`.
`deploy-lightsail.sh` also installs it, before the build replaces the old one, because existing boxes only have full
Chrome (provisioning ran `pnpm install --ignore-scripts`, so Puppeteer's postinstall never ran). It's a 0.7 s no-op when
the browser is already installed.

**Extra flags:** none added. All five (`--disable-extensions`, `--disable-background-networking`,
`--disable-default-apps`, `--no-first-run`, `--mute-audio`) are already in Puppeteer 23's `defaultArgs()`.

**Memory: local Linux measurement, not the box.** Debian bookworm amd64 in Docker (emulated on Apple Silicon), with
provisioning's Chrome packages and production launch args. Synthetic data, fresh browser per report, peak RSS of the
Chrome process tree sampled every 25 ms, median of 3:

| report | full Chrome | headless shell | headless shell without `--single-process` |
|---|---|---|---|
| Committee Roster, 45 members | 555 MiB | 346 MiB | 629 MiB |
| Committee Roster, 800 EDs × 4 (134 pages) | 1307 MiB | 1035 MiB | 1280 MiB |
| Sign-in sheet | 527 MiB | 322 MiB | 600 MiB |
| Weight summary / vacancy / changes / petition outcomes / designating petition | 532–549 MiB | 324–340 MiB | not run |

Emulation inflates absolute numbers. The about 205 MiB (about 38%) gap is the result. Acceptance still needs ticket
08's measurement on the box, after deploy.

**Output:** page counts, page sizes and embedded fonts (Liberation Sans) are identical for every PDF report. Vertical
positions are identical. Glyph advances differ by about 1%, so in the designating petition three paragraphs wrap one
word differently (same line count, same page). The other reports have identical text, apart from whitespace in
pdftotext output. On Linux, the layout runners passed in both modes: sign-in 117/117 and Committee Roster 246/246,
mutation controls included.

**Hang found and fixed:** chrome-headless-shell with `--single-process` deadlocks in `browser.close()` when no page
was opened (10/10 on Linux; full Chrome 0/10; headless shell without the flag 0/10). Puppeteer's `close()` has no
timeout, so a report whose `newPage()` failed would never finish. `generatePDFAndUpload` now gives `close()` 10 s,
then SIGKILLs the browser. The children exit with it. `--single-process` stays, since dropping it costs more memory
than full Chrome. Local layout runners that launch, call `version()` and close without a page hit this hang too.

**macOS dev note:** the same deadlock showed up on macOS (main thread in `pthread_join` under AppKit).

### 2026-11-19: PR #148 rebased onto main

Rebased cleanly onto main (after #155) and force-pushed. Report-server tests pass (269). Still open and not deployed.
Order: deploy main, run ticket 19's pre-#148 box runs with `--browser chrome`, approve baselines, then merge and deploy
#148, then 19's post-#148 runs with `--browser both` and ticket 20.
