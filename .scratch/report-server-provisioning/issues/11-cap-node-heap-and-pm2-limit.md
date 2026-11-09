# 11 - Cap node's heap and give PM2 a memory limit that can actually fire

Status: ready-for-agent
Type: task
Blocked by: 10

## Why

`apps/report-server/ecosystem.config.js` sets `max_memory_restart: '1G'`. That's all of the box's RAM, and PM2 watches
the `start.sh` wrapper, not node, so it can't fire usefully. Nothing stops node itself from growing until the kernel
starts swapping hard or the OOM killer picks something, possibly sshd.

## Fix

Once ticket 10 has PM2 running node directly:

- Start node with `--max-old-space-size=256` (via `node_args` in `ecosystem.config.js`, or in the wrapper). Tune it
  from ticket 08's numbers. It must sit comfortably above the real peak heap for the largest xlsx export, or those
  exports will crash.
- Set `max_memory_restart` to about `350M`, or whatever ticket 08 suggests. Note that it only covers the node process:
  Chrome children aren't counted, which is why ticket 09 matters.
- Optionally, protect SSH: set `OOMScoreAdjust=-500` for `ssh.service` through a systemd drop-in in provisioning, so
  the OOM killer picks the report server, not your way in.

## Acceptance

- `pm2 describe report-server` shows the node args and the new limit.
- Forcing memory growth (for example, a test endpoint or a very large export on a scratch box) makes PM2 restart the
  server instead of the box becoming unresponsive.
- The largest real export still succeeds.

## Comments

### 2026-11-08: ticket 10 resolved, so this is unblocked

PM2 now runs `dist/index.js` directly with the nvm node binary as the interpreter (`ecosystem.config.js`, PR #144).
`max_memory_restart` now measures node itself, and `node_args` in `ecosystem.config.js` is where
`--max-old-space-size` goes; there's no wrapper. `deploy-lightsail.sh` re-registers the process from the config on each
deploy (`pm2 delete` + `pm2 start` + `pm2 save`), so config changes take effect on the next deploy without extra steps.

### 2026-11-08: implemented on branch `report-server-heap-cap`

`apps/report-server/ecosystem.config.js`: `node_args: ['--max-old-space-size=384']` and `max_memory_restart: '600M'`
(was `1G`). The 256 / 350M in **Fix** were too low for the largest export. Ticket 08 has no xlsx numbers yet, so I
measured synthetic workloads under node 22.23.4 on Linux (`node:22-slim` in Docker) with the real `xlsx` 0.18.5 and
`csv-parse`:

| Workload | Smallest heap cap that succeeds | Peak RSS (VmHWM) |
| --- | --- | --- |
| Voter list, 20,000 rows (`MAX_RECORDS_FOR_EXPORT`), all ~48 fields filled, 41 MB xlsx | ~275 MB (256 aborts, 320 passes) | 534 MiB |
| Voter list, 20,000 rows, mailing/apt/email/phone fields null, 25 MB xlsx | ~185 MB | 388 MiB |
| Absentee CSV load, 50,000 rows × 66 columns, 52 MB CSV (`csv-parse/sync` on the whole file) | ~320 MB | 535 MiB |

These numbers don't include the server's own baseline: tens of MB of heap, and PM2 showed 64 MB RSS at launch.

- **Heap 384:** about 100 MB above the worst-case voter list. A 256 cap aborts that export.
- **Limit 600M:** above the ~535 MiB legitimate peak. PM2 samples RSS every 30 s, so a limit below a real export's
  peak would restart the server partway through some of those exports, at random. With 350M, the server could also be
  restarted while idle if RSS stays high after an export. In practice the heap cap is what stops runaway growth. This
  limit is the backstop for memory outside the JS heap.

Checked with PM2 7.1.2 in a `node:22-slim` container, using this exact config and a stub `dist/index.js`:
- `pm2 describe report-server` shows `interpreter args │ --max-old-space-size=384` and `max memory restart │ 629145600`.
  The process's `execArgv` is `["--max-old-space-size=384"]`, so `node_args` reaches node even with the absolute
  `interpreter` path from ticket 10.
- A JS heap leak hits `FATAL ERROR: Reached heap limit`, aborts, and `autorestart` brings it back (`online`, restart
  count rising).
- A Buffer leak, which the heap cap can't see, triggers `[PM2][WORKER] Process 0 restarted because it exceeds
  --max-memory-restart value (current_memory=812707840 max_memory_limit=629145600)`.

**SSH `OOMScoreAdjust` not added, on purpose.** Debian 12's OpenSSH (9.2p1-2+deb12u10, tested in a `debian:12`
container with `CAP_SYS_RESOURCE`) already sets the listening sshd to `oom_score_adj -1000`, so the OOM killer can't
pick it. Each forked session gets back the score sshd was started with. With `OOMScoreAdjust=-500` in a systemd
drop-in, every SSH session would inherit -500, along with everything started from it. That can include a PM2 daemon
first started over SSH, which would protect the report server instead of sshd. To confirm on the box:
`cat /proc/$(pgrep -o sshd)/oom_score_adj` should print `-1000`.

Known gaps:
- When node aborts at the cap, every job in flight is lost (`QUEUE_CONCURRENCY = 2`), and no completion callback is
  sent for them. Two worst-case exports at once (~550 MB of heap) would hit the cap. That's the intended trade: one
  restarted server instead of an unresponsive box.
- The absentee report loads the whole CSV into memory, needing about 6× the file's size in heap. A real absentee file
  much bigger than ~55 MB will hit the cap. Real file sizes are unknown; streaming the parse would fix it if they're
  that large.

Still needs the real box:
- After deploy: `pm2 describe report-server` shows the interpreter args and the 600M limit.
- The largest real voter-list export (all fields, 20k rows) and a real absentee report still succeed. Note the peak
  node RSS for ticket 08 step 4.
- Optional, on a scratch box: forced growth restarts the server and the box stays responsive.
