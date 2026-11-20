# 08 - Measure the report server's memory, process by process

Status: ready-for-human
Type: task

## Why

The only measurements so far (ticket 04, 2026-10-15) are totals from `free -h`, and the "idle" figure was inflated by
first-boot `unattended-upgrade`. Tickets 09–15 each claim a saving. Without a per-process baseline we can't tell which
ones matter or whether they worked.

## To do

On a box that has settled (no apt processes running), as `bitnami`. Do this after the recreate in `../recreate-checklist.md`:

1. **Idle:** `free -m` and `ps -eo pid,rss,args --sort=-rss | head -12`.
2. **One PDF report:** in a second session, run `watch -n 1 'free -m; ps -eo rss,comm --sort=-rss | head -8'` while a
   report renders from the frontend. Note the peak RSS for node and for Chrome (all `chrome` processes together), and
   the peak swap.
3. **Two PDF reports back to back** (request the second while the first is rendering). Note whether two copies of
   Chrome show up at once (ticket 09).
4. **The largest xlsx export** you expect in practice. `xlsx` (SheetJS) builds the whole workbook in memory
   (`apps/report-server/src/utils/xlsxUtils.ts`, `generateXLSXBuffer`), so a big export could be a peak of its own.
5. **A voter import,** if one can be run safely. The CSV parse streams (`packages/voter-import-processor/src/parseVoterFile.ts`),
   but the rest of the import path hasn't been checked.
6. **A PM2 restart:** `pm2 restart report-server` with the watch running. Note the peak during startup (ticket 10).
7. `sudo dmesg -T | grep -i -E "oom|killed process"`.

Record the numbers in the Comments below, in a table that later tickets can compare against.

## Acceptance

- A table of idle, single-report, double-report, xlsx and restart peaks for node, Chrome, total RAM and swap.

## Comments

### 2026-11-08: verification update

Partial measurements from five-second deploy samples: install/build reached 671 MB RAM used with 273 MB available; startup/recovery reached 756 MB used with 188 MB available. Swap during the active install/build samples was 26–46 MB and after restart reached 47 MB; pre-deploy swap was 286 MB. These are sampled observations, not guaranteed peaks. No OOM matches were printed. After successful PDFs and 13 hours uptime, memory was 587 MB used / 357 MB available, swap 216/2698 MB, and no Chrome processes remained. PM2 showed zero restarts. PDF-time Chrome/Node peaks, concurrent reports, XLSX and import measurements remain outstanding; the full acceptance matrix is not complete.

### 2026-11-08: ticket 10 deployed; measure against it

Production runs compiled `dist/index.js` under plain node since PR #144, so the measurements here are after ticket 10.
Two checks moved here from ticket 10:
- Idle RSS of the node process (step 1). Target from ticket 10: under 120Mi, against the ~195Mi ts-node baseline.
  PM2 showed 64.2mb right after launch, which isn't an idle figure.
- During `pm2 restart report-server` (step 6), `ps` should show no `pnpm`, `tsc`, `tailwindcss` or `ts-node`.
