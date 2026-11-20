# 04 - pnpm install runs the 1 GB Lightsail instance out of memory

Status: resolved
Type: task

## What happened (2026-10-15)

Running `scripts/deploy-lightsail.sh` on the `micro_3_0` instance (1 GB RAM): `pnpm install` chose to
remove and reinstall all modules ("The modules directories will be removed and reinstalled from scratch",
"reused 0"), started downloading all 1,212 packages for all 7 workspace projects, and stalled at
`downloaded 462, added 450`. The box then stopped responding, including to SSH, and was rebuilt with `terraform:recreate`.

The recreated instance shows `945Mi` RAM and a `649Mi` swap from the Bitnami image, with 33G of disk free and 2 CPUs.

## Root cause of the full reinstall (found 2026-10-15)

pnpm wiped `node_modules` because the store it resolved didn't match the store recorded in
`node_modules/.modules.yaml`. It reused nothing because the store it switched to was empty.

- Provisioning runs as root with `HOME` set to bitnami's home (`01-install-dependencies.sh` does `export HOME="$USER_HOME"`,
  and `00-setup-all.sh` sources every step, so `03-build-packages.sh` inherits it). Root's `pnpm install` therefore creates
  `~bitnami/.local/share/pnpm` and `~bitnami/.cache/pnpm` **owned by root**, and records
  `storeDir: /home/bitnami/.local/share/pnpm/store/v3`.
- When bitnami runs pnpm later, it can't write to that store, so pnpm falls back to `<topmost writable dir>/.pnpm-store`
  (`/opt/voter-file-tool/.pnpm-store/v3` when run from the project). That doesn't match `.modules.yaml`, so pnpm asks
  "The modules directories will be removed and reinstalled from scratch. Proceed?", the deploy says yes, and a cold
  install of the whole workspace starts while Chrome is running.

The real fix is ticket 01 (run provisioning's pnpm commands as `$SSH_USER`). The items below are still worth doing,
but now as protection in case a cold install happens anyway.

## Contributing causes

- **The install covers the whole workspace.** It includes the Next.js frontend (two ~47 MB SWC binaries, sharp, the Sentry CLI and so on),
  which the report server never uses.
- **High default parallelism.** pnpm defaults to `network-concurrency=16`.
- **`deploy-lightsail.sh` installs while the server is running.** The report server (with Puppeteer/Chrome)
  keeps running during the install, so they compete for memory.
- **Not much swap** for a cold install alongside a running server, and no setup step that adds more.
- **The prompt is unattended.** "Proceed? (Y/n)" appears because the script isn't run with `CI=true`. Today it gets answered, but it can block.
  It also means a store mismatch silently becomes a full reinstall. With `CI=true`, pnpm 8 should abort instead
  (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`); not yet tested on 8.15.7.

## Fix

0. Fix ticket 01 first: that removes the store mismatch that triggered the reinstall.
1. Add a swap step to provisioning (new step in `00-setup-all.sh` or `01-install-dependencies.sh`).
   Make sure total swap is at least 2 GB, skip it if already present, and persist it in `/etc/fstab`.
2. Run installs with `CI=true pnpm install --frozen-lockfile --network-concurrency=4 --child-concurrency=1`
   in both `03-build-packages.sh` and `scripts/deploy-lightsail.sh`.
   `--frozen-lockfile` is already in both (commit `0760df5`, ticket 03); what's left is `CI=true` and the concurrency flags.
3. In `deploy-lightsail.sh`, run `pm2 stop report-server` before the install and `pm2 restart report-server` after it
   (the script currently only prints a reminder to restart).
4. **Filter the install to the report server** (`--filter node-pdf-generation...`). This is **blocked**:
   `03-build-packages.sh` runs `prisma generate` from `apps/frontend`, so it needs the frontend's dependencies.
   Either move schema generation to `packages/shared-prisma`, or install the frontend's Prisma deps
   explicitly. Do this after 1–3, as its own change if it gets large.
5. Add a "server hung / out of memory" section to `infrastructure/DEPLOYMENT_SETUP.md`:
   `aws lightsail reboot-instance --instance-name nodejs-report-server --region us-west-2`, plus the
   `free -h` / `sudo swapon --show` / `dmesg` checks. Note that `terraform:recreate` destroys the disk and
   runs a full install again. Include the store check from the comment below: `pnpm store path` (run from the project)
   must match `storeDir` in `node_modules/.modules.yaml`, or the next install will be a full reinstall.

## Open question (human)

- Is `small_3_0` (2 GB) worth the cost, instead of or as well as swap? Report generation with Puppeteer
  is also memory-hungry, and `ecosystem.config.js` sets `max_memory_restart: '1G'`, which is about
  all of the RAM on this bundle.

## Acceptance

- `scripts/deploy-lightsail.sh` completes on a `micro_3_0` instance, with the server running beforehand, without
  the box becoming unresponsive.
- A fresh `terraform:recreate` completes, and `sudo swapon --show` reports at least 2 GB of swap.

## Comments

### 2026-10-15: why pnpm wiped and reinstalled, checked on the recreated box

As bitnami on the recreated instance (pnpm 8.15.7):

- `node_modules/.modules.yaml`: `storeDir: /home/bitnami/.local/share/pnpm/store/v3`, `packageManager: pnpm@8.15.7`,
  `layoutVersion: 5`. That store holds 991M.
- `pnpm store path` gave `/home/bitnami/.pnpm-store/v3` from `~`, and `/opt/voter-file-tool/.pnpm-store/v3` from the project.
- `pnpm config get store-dir` is `undefined`, there's no `~/.npmrc`, and no pnpm/XDG/npm_config env vars. So no config is involved.
- `sudo find ~/.local/share/pnpm ~/.cache/pnpm -maxdepth 3 ! -user bitnami` listed everything, from `~/.local/share/pnpm`
  down. It also showed `global/v11/pnpm-lock.yaml` and `package-manager-store/v11` left by the earlier unpinned pnpm.
  That root-owned lockfile under `$HOME` is most likely the "lockfile it can't read" from ticket 03's crash loop.

So the new box would have done the same full reinstall on its first deploy.

Fixed by hand on this box: `sudo chown -R bitnami:bitnami ~/.local/share/pnpm ~/.cache/pnpm`. After that,
`pnpm store path` from the project prints `/home/bitnami/.local/share/pnpm/store/v3`, which matches `.modules.yaml`,
and no stray `.pnpm-store` was created in the project. The next `terraform:recreate` will bring the problem back
until ticket 01 is done.

### 2026-10-15: memory measured on the recreated box after the ticket 01 fix (PR #122)

The box was recreated with `terraform:apply` with the ticket 01 fix. The full provisioning ran, the server came up cleanly
(`Server is running on http://0.0.0.0:8080`), and reports generate from the frontend. Swap is still the Bitnami default of 649Mi,
because step 1 here hasn't been done.

`scripts/deploy-lightsail.sh` hasn't been run on this box yet. That's the redeploy that hit the store mismatch and the full
reinstall. With provisioning now installing as the SSH user it should reuse the store, but that hasn't been confirmed. Before it
runs, or to confirm without running it, check that `pnpm store path` (from the project) matches `storeDir` in
`node_modules/.modules.yaml`, and that `sudo find ~/.local/share/pnpm ~/.cache/pnpm -maxdepth 3 ! -user bitnami` prints nothing.

`free -h`, idle and then while generating one report:

| | RAM used | RAM available | Swap used |
|---|---|---|---|
| Idle | 599Mi | 345Mi | 278Mi / 649Mi |
| One report generating | 869Mi | 75Mi | 620Mi / 649Mi |

So a single report nearly runs the box out of memory even with no install running. Report generation is a memory problem
in its own right, not just the deploy-time install.

Idle `ps -eo pid,rss,args --sort=-rss` (RSS in KB):

- `node -r ts-node/register src/index.ts`: ~195Mi. ts-node keeps the TypeScript compiler in memory at runtime.
- Two `unattended-upgrade` processes plus `apt-listchanges`: ~230Mi together. These are temporary, from the fresh box's first
  apt run, and they inflated the "idle" baseline above. Re-measure once they finish.
- PM2 daemon: ~23Mi. No pnpm wrapper process appeared in the top 12.

The per-process breakdown during a report (Chrome vs node) hasn't been captured yet:
`watch -n 2 'ps -eo rss,comm --sort=-rss | head -8'`. `dmesg` hasn't been checked for OOM kills yet either.

Problems found in the code while looking at this. Not fixed yet, and each could be its own ticket:

- `apps/report-server/src/utils.ts` (`generatePDFAndUpload`) launches a fresh Chrome per report, and `browser.close()` is not
  in a `finally`. A report that fails during `setContent`, PDF creation or upload leaves Chrome running.
- `apps/report-server/package.json` `start` runs ts-node in production. Compiling with `tsc` and running `node dist/index.js`
  should cut idle memory a lot.
- `ecosystem.config.js` has `max_memory_restart: '1G'`, which is more than the box's total RAM, and PM2 watches `start.sh`
  rather than node or Chrome. So it probably never fires. Revisit after the change above (~600M).
- Check whether reports can run at the same time. Two copies of Chrome won't fit in 1 GB, so they may need to run one at a time.

Next steps, in order: swap (step 1), the Chrome `finally`, drop ts-node, then decide on `small_3_0`. That decision is the open
question above, and these numbers suggest 1 GB is marginal for Puppeteer even after the fixes.

### 2026-11-07: steps 1, 2, 3 and 5 implemented on branch `report-server-hardening` (commit `db20d568`), needs a recreate to verify

- Step 1: `01-install-dependencies.sh` adds a `/swapfile` so total swap is at least 2 GB, persisted in `/etc/fstab`. It skips this if swap is already enough or the file is already active.
- Step 2: `CI=true ... --network-concurrency=4 --child-concurrency=1` added to the installs in `03-build-packages.sh` and `scripts/deploy-lightsail.sh`.
- Step 3: `deploy-lightsail.sh` runs `pm2 stop report-server` before the install and `pm2 restart report-server` at the end. If a step fails, it prints how to restart.
- Step 5: "Server hung / out of memory?" section added to `infrastructure/DEPLOYMENT_SETUP.md`.
- Also done: `generatePDFAndUpload` closes Chrome in a `finally`.
- Not done: step 4 (filtered install, still blocked on Prisma generation), dropping ts-node, `max_memory_restart`, running reports one at a time, and the `small_3_0` decision.
- Not tested on a real box: the swap step (needs Linux `free`/`swapon`) and whether pnpm 8.15.7 aborts under `CI=true` on a store mismatch.

### 2026-11-07: open question answered: staying on `micro_3_0`

Decided to stay on 1 GB and make the server lighter instead. Ideas and measurements are in ticket 07.

### 2026-11-07: answered: `CI=true` does not make pnpm 8.15.7 abort on a store mismatch

Checked locally on pnpm 8.15.7: with `CI=true`, a store mismatch silently deletes `node_modules` and reinstalls (exit 0). So
`CI=true` only stops the prompt from blocking. The real guard is `scripts/check-pnpm-store.sh`, which runs before the install in
`03-build-packages.sh` and `deploy-lightsail.sh` and aborts on a mismatch (PR #141). The swap step was also simplified to an inline
`/swapfile` block in `01-install-dependencies.sh`.

### 2026-11-08: verification update

PR #141 is merged and the instance was recreated. Dedicated swap is 2 GB plus 650 MB Bitnami swap (2698 MB total); one dedicated fstab entry exists. Ownership/store checks passed. Deployment reused dependencies, stopped the service before installation, and completed builds without OOM matches, but exited 1 at the redundant Prisma command (ticket 16). Abort recovery restarted the server successfully. Real PDFs subsequently completed. Keep this ticket open until the corrected deploy exits 0. Reboot persistence is ticket 17; failure-path Chrome cleanup is ticket 18.

### 2026-11-08: resolved, corrected deploy exits 0

With ticket 16's fix (PR #143), `scripts/deploy-lightsail.sh` ran on the `micro_3_0` instance with report-server
online beforehand. It exited 0 and restarted the server; a PDF then worked. SSH stayed responsive. The lowest sampled
available memory was 201 MB (743 MB used), and dmesg showed no OOM kills. Details are in ticket 16. Combined with
the recreate verified above (2698 MB swap), both acceptance items are met. Reboot persistence (17) and failure-path
Chrome cleanup (18) remain separate tickets.
