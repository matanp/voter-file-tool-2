# Report server recreate checklist

This checks tickets 01, 02, 03, 04 and 06 on a fresh instance. Ticket 05 (the `admin@` mailbox) doesn't need a recreate.

## Latest run: 2026-11-08

- PR #141 merged and fresh provisioning completed with HTTPS warnings.
- Tickets 01, 03 and 06 are resolved: ownership/store, pinned pnpm, and protected failure logging passed.
- Ticket 02 remains open: all automatic ACME attempts timed out; manual certbot later succeeded and external TLS verification passed.
- Ticket 04 remains open: swap and install/build memory checks passed, but deployment exited 1 at the redundant Prisma step (ticket 16). Recovery restarted the service.
- Real sign-in sheet and committee PDFs downloaded successfully; no Chrome processes remained afterward. PM2 later showed 13 hours online and zero restarts.
- Reboot verification is ticket 17; failed-render cleanup is ticket 18. Full workload memory measurements remain in ticket 08.
- Current certbot email is `admin@opensourcepolitics.com`; monitored delivery remains unverified (ticket 05).

The unchecked list below is a reusable procedure, not a record of the latest run. Use the results above and dated ticket comments for current status.

## Before you recreate

- [ ] **PR #141 (`report-server-hardening`) is merged to `main`.** `user_data` in `main.tf` clones the default
      branch from GitHub, so a recreate before the merge provisions without the swap, install-flag and certbot-log fixes.
      Tickets 01–03 are on `main` already.
- [ ] `infrastructure/terraform.tfvars` has `certbot_email` set. If it's empty, `terraform plan` fails.
- [ ] Ticket 05: verify that the configured `certbot_email` reaches a monitored mailbox. The 2026-11-08 run used `admin@opensourcepolitics.com`; earlier notes referred to `.online`.

## Recreate

From the repo root:

```bash
pnpm run terraform:recreate
```

- [ ] Note the time the apply finishes: ______. Ticket 02 asks you to compare it with the certbot
      timestamps in the user-data log, to confirm the static-IP race.

Provisioning keeps running on the box after Terraform returns. Give it 10–20 minutes, then SSH in as `bitnami`.

## On the box

### Setup log

```bash
sudo tail -60 /var/log/user-data.log
```

- [ ] It ends with `✅ Complete setup finished successfully!`, not `⚠️ Setup finished with warnings`. (02)
- [ ] The log shows `resolves to <ip> (this instance) after Ns`. Note N: ______. (02, the race)
- [ ] The log shows `💾 Swap: <at least 2048> MB`. (04)

### HTTPS (02, 06)

```bash
curl -sI https://reports.opensourcepolitics.online | head -1
sudo ls -l /var/log/voter-file-tool/
```

- [ ] HTTPS answers, and you didn't have to run certbot by hand.
- [ ] `certbot.log` exists, owned by root, mode `-rw-r-----`. The directory is `drwxr-x---`. `/tmp/certbot.log` does not exist.
- [ ] If certbot failed, the failure message and the setup summary both name `/var/log/voter-file-tool/certbot.log`.

### pnpm and ownership (01, 03)

```bash
pnpm --version
stat -c %U /opt/voter-file-tool/pnpm-lock.yaml
sudo find /opt/voter-file-tool ~/.local/share/pnpm ~/.cache/pnpm ! -user bitnami | head
cd /opt/voter-file-tool && pnpm store path && grep storeDir node_modules/.modules.yaml
```

- [ ] `pnpm --version` prints `8.15.7`. (03)
- [ ] `pnpm-lock.yaml` is owned by `bitnami`. (01)
- [ ] The `find` prints nothing. (01)
- [ ] `pnpm store path` matches `storeDir`. If they differ, the next deploy turns into a full cold install. (01, 04)

### Memory (04)

```bash
sudo swapon --show
free -h
pm2 status
```

- [ ] Total swap is at least 2 GB.
- [ ] `report-server` is `online`, and `pm2 logs report-server --lines 20` shows `Server is running on http://0.0.0.0:8080`.

### Compiled server (10)

```bash
ls /opt/voter-file-tool/apps/report-server/dist/index.js /opt/voter-file-tool/apps/report-server/public/tailwind.css
pm2 describe report-server | grep -E 'script path|interpreter'
```

- [ ] Both files exist (built by `03-build-packages.sh`).
- [ ] Script path is `.../apps/report-server/dist/index.js` and the interpreter is an nvm node path, not bash.
- [ ] The startup logs show no `pnpm start`, Tailwind or ts-node output.

## First deploy (04)

This is the step that froze the old box. Run it with the server up:

```bash
cd /opt/voter-file-tool && bash scripts/deploy-lightsail.sh
```

In a second SSH session, watch memory while it runs:

```bash
watch -n 2 'free -m; ps -eo rss,comm --sort=-rss | head -6'
```

- [ ] The deploy prints `Stopping report-server`, installs without "modules directories will be removed", and ends with
      `report-server` restarted and `online`.
- [ ] The box stays responsive throughout. Peak memory used: ______ RAM / ______ swap.
- [ ] `sudo dmesg -T | grep -i -E "oom|killed process"` prints nothing.

## A report

- [ ] Generate a PDF report from the frontend. It completes and downloads.
- [ ] While it renders, note peak memory: ______ RAM / ______ swap. (Ticket 08 has the fuller per-process measurement.) For comparison, the 2026-10-15 baseline was 869Mi RAM
      used, 75Mi available, 620Mi/649Mi swap.

## Afterwards

- Everything passes: close tickets 01, 02, 03 and 06. Close ticket 04 once its acceptance items pass. The remaining memory work
  is in tickets 07–15.
- Something failed: add the output as a comment on the matching ticket.
- If the box hangs, see "Server hung / out of memory?" in `infrastructure/DEPLOYMENT_SETUP.md`.
