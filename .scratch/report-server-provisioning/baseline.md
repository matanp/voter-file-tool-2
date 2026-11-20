# Report server baseline: before and after the provisioning project

Written 2026-11-08. This records what the report server was like **before** this project, so the later
results have something to compare against. The "now" columns are a snapshot as of 2026-11-08. Update them as
tickets close; don't change the "before" columns.

## What "before" means

- **Code:** commit `56472b71` (2026-10-09), the last report-server/infra commit before this project's first fix
  (`0760df59`, 2026-10-15, ticket 03).
- **Box:** Lightsail `micro_3_0` with the `nodejs` (Bitnami) blueprint. 2 vCPU, 945 MiB usable RAM, 649 MiB Bitnami swap,
  33 GB disk free. This hasn't changed: we decided on 2026-11-07 to stay on 1 GB (ticket 04).
- **Runtime:** PM2 → `start.sh` → `pnpm start` → three `tsc` builds + Tailwind → `node -r ts-node/register src/index.ts`.
  An in-memory `async.queue` with `QUEUE_CONCURRENCY = 2`. Each PDF job launches its own Chrome (Puppeteer 23, full
  headless, `--single-process`).

**Measurement caveat:** nobody measured anything before the project started. The earliest numbers are from
2026-10-15, on a box rebuilt after the first fixes (01, 03) but with the same runtime, memory settings and report code.
They are the best stand-in for the original server. Anything in this doc not backed by a number says so.

## 1. Failure tolerance

| Scenario | Before (`56472b71`) | Now (2026-11-08) | Ticket |
|---|---|---|---|
| **Fresh provisioning** (`terraform:recreate`) | Failed. Installed whatever pnpm was latest, so the server crash-looped under PM2 (`ERR_PNPM_LOCKFILE_READ_FILE`). Had to be fixed by hand over SSH. | Server comes up by itself. Pinned pnpm 8.15.7 is checked during setup. | 03 ✅ |
| **File ownership after provisioning** | Installs and builds ran as root, leaving root-owned files in the project and the pnpm store. | No root-owned files in the project or store (checked on a fresh box). | 01 ✅ |
| **Routine deploy** (`deploy-lightsail.sh`) | **Took the box down.** A store mismatch made pnpm wipe `node_modules` and cold-install all 1,212 packages while the server and Chrome were running. The box stopped answering SSH and had to be destroyed and rebuilt. | Store is reused; a mismatch now aborts the deploy instead of reinstalling (`check-pnpm-store.sh`). Server stopped before install. Gentler install (`--network-concurrency=4 --child-concurrency=1`). Peak sampled 671 MB used / 273 MB available, no OOM kills. Last deploy still **exited 1** on the redundant Prisma step. Fix on branch, not yet run on the box. | 04, 16 |
| **Deploy fails partway** | `set -e` exits and leaves the server however it was. The script only printed a reminder to restart. | A trap restarts `report-server` on abort. Verified on 2026-11-08: the server came back and PDFs worked. | 04 ✅ (this part) |
| **One PDF report on an otherwise idle box** | Took the box to **75 MiB available, 620 / 649 MiB swap** (97% of swap). One more process would have hit the OOM killer. | Swap is now 2,698 MB total. Per-report peak not re-measured yet. | 04, 08 |
| **Two PDF reports at once** | Concurrency 2 means two separate Chrome launches. Never measured; on the single-report numbers it would not fit in RAM + swap. | Unchanged. Concurrency kept at 2 on purpose (decided 2026-11-08). Not measured yet. | 08, 09 |
| **PDF fails during render or upload** | `browser.close()` not in `finally`: **every failed PDF left a Chrome process running**, permanently holding memory until restart. | Closed in `finally`. Success path verified (no stray Chrome after real reports). Failure path untested. | 18 |
| **Node grows without limit** | `max_memory_restart: '1G'`, the whole box, measured on the `start.sh` wrapper rather than node. Effectively no limit; the kernel decides what dies (possibly sshd). | Unchanged. | 11 |
| **Server restarts (crash, deploy, PM2)** | Restart runs pnpm, three `tsc` builds and Tailwind before the server is up: a memory spike exactly when the box is already struggling. | Unchanged. Restart sampled at 756 MB used / 188 MB available. | 10 |
| **Jobs in flight when the server restarts** | The queue is in memory. Queued and running jobs are lost silently. The frontend leaves those reports in `PROCESSING` forever; nothing sweeps stale jobs. The user just never gets their report. | Unchanged. Not in any ticket yet. | — |
| **Callback to the frontend fails** | One `fetch`, no retry. If it fails, the report is uploaded to R2 but the frontend never learns about it (stuck in `PROCESSING`). | Unchanged. Not in any ticket yet. | — |
| **HTTPS on provisioning** | Certbot failures were logged as **"✅ SSL certificate obtained successfully"** (exit code swallowed by `tee`). HTTPS was silently missing. | Failure is reported honestly (`HTTPS NOT CONFIGURED`, setup ends "with warnings"), with 3 retries. Automatic HTTPS **still fails**: all ACME attempts timed out. Needed a manual certbot run. | 02 (open), 06 ✅ |
| **Certbot log** | World-readable `/tmp/certbot.log`, gone after reboot. | `/var/log/voter-file-tool/certbot.log`, root-only, keeps all attempts. | 06 ✅ |
| **Reboot** | Not tested. | Not tested yet. | 17 |
| **Recovery when the box hangs** | No runbook. The only known fix was `terraform:recreate`, which destroys the disk. | "Server hung / out of memory?" section in `infrastructure/DEPLOYMENT_SETUP.md` (reboot first, then checks). | 04 ✅ (this part) |

### Incident record before and during the project

- **2026-10-15:** a routine deploy froze the box (cold install out of memory). Rebuilt with `terraform:recreate`.
- **2026-10-16:** the rebuilt box crash-looped at startup (unpinned pnpm). Fixed by hand at 04:36.
- **2026-10-16:** HTTPS silently not configured on the rebuilt box. Manual certbot about 1h45m later.
- **2026-11-08:** deploy exited 1 (redundant Prisma step), but the trap restarted the server. No outage. HTTPS again
  needed a manual certbot run after recreate.
- Since 2026-11-08 06:27 UTC: 13 hours online, 0 PM2 restarts, no OOM kills in `dmesg`.

## 2. Memory

All from `free -h` / `ps` on the 1 GB box. "Sampled" = 5-second samples, so real peaks may be higher.

| State | RAM used | RAM available | Swap used | Swap total | When |
|---|---|---|---|---|---|
| Idle (fresh box, apt still running) | 599 MiB | 345 MiB | 278 MiB | 649 MiB | 2026-10-15, **baseline** |
| One PDF report generating | 869 MiB | **75 MiB** | 620 MiB | 649 MiB | 2026-10-15, **baseline** |
| Cold install during deploy | box hung, no numbers | — | — | 649 MiB | 2026-10-15, **baseline** |
| Install/build during deploy (sampled) | 671 MB | 273 MB | 26–46 MB | 2,698 MB | 2026-11-08 |
| Startup after deploy (sampled) | 756 MB | 188 MB | 47 MB | 2,698 MB | 2026-11-08 |
| Settled, after real PDFs, 13 h uptime | 587 MB | 357 MB | 216 MB | 2,698 MB | 2026-11-08 |

Per process, idle, baseline (2026-10-15):

| Process | RSS |
|---|---|
| `node -r ts-node/register src/index.ts` (the server) | ~195 MiB (ts-node keeps the TypeScript compiler loaded) |
| `unattended-upgrade` ×2 + `apt-listchanges` (first boot only) | ~230 MiB together |
| PM2 daemon | ~23 MiB |
| Chrome, during a report | **never measured** |

Configured limits at baseline: PM2 `max_memory_restart: '1G'` (= all RAM, on the wrapper), no `--max-old-space-size`,
649 MiB swap.

**Headroom summary:** at baseline, one report left 8% of RAM and 3% of swap free. On 2026-11-08 the deploy and startup
peaks leave 20–30% of RAM free and almost all of the larger swap. The report peak, which was the real danger, hasn't been
measured again.

## 3. Throughput and latency

**None of this has been measured, before or now.** What the code fixes is:

- **Concurrency:** 2 jobs at a time (`QUEUE_CONCURRENCY = 2`), for every job type: PDFs, xlsx, voter imports,
  BOE flagging. Any extra jobs wait in the in-memory queue. The frontend shows "jobs ahead" from `q.length()`.
- **Per-PDF fixed cost:** a full Chrome launch and shutdown for every PDF. No browser reuse.
- **Timeout:** 120 s per page operation (`page.setDefaultTimeout`). No overall job timeout. A stuck job holds one of
  the two slots until restart.
- **Practical ceiling:** memory, not CPU. On the baseline numbers the box could not safely run two PDFs at once, so the
  real PDF throughput was one at a time, with a risk of falling over on the second.
- **Startup time** (PM2 restart → `Server is running`): includes three `tsc` builds and Tailwind. Never timed.

## 4. Other measures worth keeping

| Measure | Before | Now | Why it matters |
|---|---|---|---|
| Manual SSH steps needed after `terraform:recreate` | 2–3 (fix pnpm, fix ownership, run certbot) | 1 (certbot) | How close the box is to rebuildable without hands-on work |
| Deploy success rate | Last known deploy destroyed the box | 1 of 1 since PR #141 kept the server up, but exited 1 | Can a non-expert deploy safely? |
| Recovery from a bad deploy | Rebuild the instance (destroys the disk; full reinstall) | Automatic restart via trap | Time to recovery |
| Silent failures (says ✅ but isn't) | Certbot success message; lost jobs; Chrome leaks | Certbot fixed; lost jobs and callbacks unchanged | Problems we can't see are the worst kind |
| Install footprint on the box | Whole workspace (7 projects, 1,212 packages, incl. Next.js) | Same | Size of each deploy and cold-install risk (tickets 04 step 4, 14) |
| Things running at runtime that aren't needed | pnpm, `tsc`, Tailwind, ts-node | Same | Restart cost and idle memory (ticket 10) |

## Gaps: measure these to finish the "after" story

Ticket 08's method covers most of these. Add the timing items when you do it.

1. **PDF peak memory**, node and all Chrome processes separately, plus peak swap. The key before/after number. Baseline
   comparison: 75 MiB available, 620 MiB swap.
2. **Two PDFs at once:** does the box stay responsive, and how deep into swap?
3. **Largest xlsx export** and **a voter import**, peak memory.
4. **PDF latency:** wall time from `received request` to `done` in the PM2 log, for the Committee Roster and sign-in
   sheet. The log lines already exist (`pm2 logs` with `time: true`), so this can be read from existing logs without
   new code. Also the share of that time spent launching Chrome.
5. **Restart time:** PM2 restart to `Server is running`. Should drop sharply after ticket 10.
6. **Deploy duration and peak memory**, end to end, once ticket 16's fix is on the box.
7. **Reboot survival** (ticket 17) and **failed-render cleanup** (ticket 18).

Two failure modes have no ticket yet: **jobs lost on restart** (stuck in `PROCESSING` with no sweeper) and **no
callback retry**. Both are about not losing reports rather than about memory, so they may belong in a separate ticket.
