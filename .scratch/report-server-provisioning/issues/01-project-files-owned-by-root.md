# 01 - Provisioning runs installs and builds as root and leaves root-owned files in the project

Status: ready-for-human
Type: task

## What happened (2026-10-16)

After `pnpm run terraform:recreate`, `report-server` crash-looped under PM2 with
`ERR_PNPM_LOCKFILE_READ_FILE ... Permission denied`. Running `sudo chown -R bitnami:bitnami /opt/voter-file-tool`
**did not** fix it. What fixed it was pinning pnpm (ticket 03), so the root-owned project tree was **not** the cause of
that crash. Which file pnpm couldn't read was never identified. It was likely something root created while running
the newer pnpm during setup.

This ticket is still worth doing because the code below definitely runs the install and build as root and leaves root-owned
files behind. The expected symptoms are `git pull`/`pnpm install` failing for the SSH user during
`scripts/deploy-lightsail.sh`, and `public/tailwind.css` not being writable. `start.sh` already has a workaround for that
one, which suggests it has happened before. **Verify this on the next recreate before fixing:**
`sudo find /opt/voter-file-tool /home/bitnami -user root | head`.

## Root cause

`user_data` (in `main.tf`) runs `00-setup-all.sh` as **root**. PM2 runs the app as the SSH user (`bitnami`).

- `02-setup-project.sh` gets ownership right: `ACTUAL_USER="${SSH_USER:-$(whoami)}"`.
- `03-build-packages.sh` then undoes it: `ACTUAL_USER=$(whoami)` (= root) and `chown -R root:root "$PROJECT_DIR"`.
  It then runs `pnpm install`, `prisma generate` and the package builds as root, so every file they create is root-owned too.
- `06-setup-pm2.sh` only fixes ownership of `apps/report-server/logs`.
- `01-install-dependencies.sh` does `export HOME="$USER_HOME"` (bitnami's home) while running as root, and every step is
  `source`d, so root's pnpm in `03` writes its data into **bitnami's home**: `~/.local/share/pnpm` (store, global dir)
  and `~/.cache/pnpm`, all owned by root. bitnami's pnpm then can't use that store and falls back to a different one,
  which is what triggered the full reinstall and out-of-memory crash in ticket 04.

## Fix

- In `03-build-packages.sh`, use `ACTUAL_USER="${SSH_USER:-$(whoami)}"`, as `02` does.
- Better: run the install/generate/build commands *as* `$SSH_USER` when the script runs as root
  (same `sudo -u "$SSH_USER" bash -c '... nvm ...'` pattern already used in `01` and `06`), so the
  pnpm store and `node_modules` belong to the user who runs the app.
- As a backstop, put a final `chown -R "$SSH_USER:$SSH_USER" "$PROJECT_DIR" "$USER_HOME/.local/share/pnpm" "$USER_HOME/.cache/pnpm"`
  at the end of `00-setup-all.sh`, before `07-start-services.sh` starts PM2. Without the two pnpm dirs, the store mismatch
  from ticket 04 comes back.
- Audit every other `$(whoami)` used for ownership in `infrastructure/scripts/` and in `main.tf`'s `user_data`
  (the clone step does `chown -R $ACTUAL_USER` with `ACTUAL_USER=$(whoami)`, which is root there too).

## Acceptance

- After a fresh `terraform:recreate`, `stat -c %U /opt/voter-file-tool/pnpm-lock.yaml` returns the SSH user, and
  `find /opt/voter-file-tool -user root | head` is empty.
- `sudo find ~bitnami/.local/share/pnpm ~bitnami/.cache/pnpm ! -user bitnami | head` is empty, and as bitnami,
  `cd /opt/voter-file-tool && pnpm store path` matches `storeDir` in `node_modules/.modules.yaml`.
- `scripts/deploy-lightsail.sh` runs as the SSH user without permission errors.
- Verifying this needs a human to run `terraform:recreate`.

## Comments

### 2026-10-15: confirmed on the recreated box, moved to ready-for-agent

Everything under `/home/bitnami/.local/share/pnpm` and `/home/bitnami/.cache/pnpm` was not owned by bitnami
(see ticket 04's comment for the output). That's the result of the `export HOME` plus root-run install described above.
The project tree itself couldn't be checked cleanly, because it had already been chowned by hand. Fixed on this box by
`sudo chown -R bitnami:bitnami ~/.local/share/pnpm ~/.cache/pnpm`. Ticket 03's pnpm pin (commit `0760df5`) doesn't stop
this: the pinned pnpm still runs as root in `03-build-packages.sh`.

### 2026-10-15: fix implemented, needs a recreate to verify

- `03-build-packages.sh`: when it is sourced as root, it chowns the project to `$SSH_USER` and re-runs itself as that user
  (`sudo -u` + nvm, the same pattern as `01`/`06`). Install, prisma generate, the builds and the Puppeteer Chrome download
  (`~/.cache/puppeteer`) now all run as the SSH user, so the pnpm store and cache are the user's own.
- `00-setup-all.sh`: a backstop `chown -R "$SSH_USER:$SSH_USER" "$PROJECT_DIR" "$SSH_USER_HOME"` after step 6, before
  `07` starts PM2. It covers the whole home rather than only the two pnpm dirs, because other root steps also write there
  through the exported `HOME` (for example, `02`'s `git config --global` creates a root-owned `~/.gitconfig`).
- `main.tf` `user_data`: removed the `ACTUAL_USER=$(whoami)` chowns. That code runs as root, so they did nothing.
  Changing `user_data` replaces the instance on the next apply.
- Audit: `02`, `06` and `07` already use `${SSH_USER:-$(whoami)}`. Nothing else in `infrastructure/scripts/` chowns to `whoami`.

Next: a human runs `terraform:recreate` and checks the Acceptance list above.
