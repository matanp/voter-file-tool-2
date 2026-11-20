# 17 - Verify swap and report-server survive a reboot

Status: ready-for-human
Type: task

## Evidence (2026-11-08)

The recreated instance has `/swapfile-voter-file-tool` (2 GB) and `/mnt/.bitnami.swap` (650 MB).
`/etc/fstab` contains one `/swapfile-voter-file-tool none swap sw 0 0` entry. Total swap is
2698 MB. HTTPS works following manual certbot recovery, and PDFs work. Reboot persistence has
not yet been tested. This is separate from destroying/recreating the instance.

## Work

Arrange a brief maintenance window with no reports in progress. Before reboot, record:

```bash
sudo swapon --show
free -m
pm2 status report-server
systemctl status pm2-bitnami --no-pager
```

Reboot with `sudo reboot`, reconnect after boot, and run:

```bash
uptime -s
sudo swapon --show
free -m
pm2 status report-server
pm2 logs report-server --lines 30 --nostream
sudo systemctl status nginx --no-pager
```

From outside the instance, check HTTPS without disabling certificate verification. A 404 at `/`
is expected; then generate and download a PDF through the frontend. If startup fails, capture
systemd/PM2 logs before manually restarting anything, then restore service.

## Acceptance

- Dedicated swap activates automatically and total swap remains at least 2048 MB.
- nginx and report-server start without manual intervention; PM2 does not crash-loop.
- HTTPS certificate verification and a real PDF download pass after reboot.
- Record boot time, command output, and any recovery needed. Investigate missing PM2 startup
  registration if discovered; do not treat a saved process list alone as proof of auto-start.

Related: [04](04-install-runs-out-of-memory.md), [recreate checklist](../recreate-checklist.md).

## Comments

### 2026-11-08: also check the compiled entry point (ticket 10)

Production now runs `dist/index.js` under plain node (PR #144); the dump was saved by `deploy-lightsail.sh`. Before the
reboot, run `grep '"pm_exec_path"' ~/.pm2/dump.pm2`. After it, run `pm2 describe report-server | grep -E 'script path|interpreter'`.
Both should show `/opt/voter-file-tool/apps/report-server/dist/index.js`, and the interpreter should be
`/home/bitnami/.nvm/versions/node/v22.23.4/bin/node`, not bash or `start.sh`.
