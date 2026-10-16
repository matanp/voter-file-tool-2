# 03 - Provisioning installs whatever pnpm is latest, not the repo's pinned 8.15.7

Status: ready-for-agent
Type: task

## What happened (2026-10-16)

The repo pins `"packageManager": "pnpm@8.15.7"` (root and `apps/report-server/package.json`), and the
lockfile is pnpm 8 format. `01-install-dependencies.sh` runs `npm install -g pnpm` with no version.

On the recreated instance, the PM2 error came out in a newer pnpm's error format
(`× resolve package manager dependencies` / `ERR_PNPM_LOCKFILE_READ_FILE`). Newer pnpm versions also try to
switch to the `packageManager` version on every command, which adds a resolution step (and a
network fetch) to every `pnpm start`. Today the permission error (ticket 01) hid this. Once ownership is fixed,
a major-version mismatch can still rewrite or reject the lockfile, or behave differently from local/CI.

The previous instance ran 8.15.7 ("Update available! 8.15.7 → 12.11.2"), so the two instances already differ.

## Fix

- Install the pinned version: read it from `package.json`
  (`node -p "require('/opt/voter-file-tool/package.json').packageManager.split('@')[1]"`) and
  `npm install -g pnpm@<that>`, or use `corepack enable && corepack prepare --activate`.
  The `npm install -g` in `00-setup-all.sh` (the "Ensure pnpm is available" block) needs the same change.
- Use `--frozen-lockfile` for installs in `03-build-packages.sh` and `scripts/deploy-lightsail.sh`, so a
  mismatched pnpm fails loudly instead of quietly changing the lockfile.
- Optional: `apps/report-server/start.sh` runs `exec pnpm start`, which goes through pnpm on every
  PM2 restart. Consider having PM2 run node directly so pnpm isn't involved in startup at all.

## Related

- `start.sh` and `01-install-dependencies.sh` pin Node 22 via nvm. The frontend moved to Node 24 (commit `ad1b725`).
  The report server's `engines` is `>=22`, so that's fine for now. Decide whether the server should move to 24 too.

## Acceptance

- After a fresh recreate, `pnpm --version` on the box (as the SSH user) prints the version from `packageManager`.

## Comments

### 2026-10-16: this is what breaks startup

After `sudo chown -R bitnami:bitnami /opt/voter-file-tool`, `report-server` still crash-looped with the same
`× resolve package manager dependencies ╰─▶ Failed to read lockfile content: Permission denied`.
That step belongs to the newer pnpm's handling of `packageManager`: it resolves its own copy of pnpm 8.15.7. The lockfile
it can't read is in pnpm's own data dir, probably under `$HOME`, not the repo's `pnpm-lock.yaml`.
Pinning pnpm to 8.15.7 on the box removes that step entirely.
Confirmed 2026-10-16 04:36: after `npm install -g pnpm@8.15.7`, `pm2 restart report-server` came up cleanly
("Server is running on http://0.0.0.0:8080").

### 2026-10-15: implemented, waiting on a fresh recreate to verify

- `00-setup-all.sh` reads the version from root `package.json` `packageManager` with `sed`, because Node isn't
  installed yet at that point. It exports the value as `PNPM_VERSION` and fails if it can't read it. Its
  "Ensure pnpm is available" block now also reinstalls when the installed version doesn't match, not only when pnpm is missing.
- `01-install-dependencies.sh` installs `pnpm@$PNPM_VERSION` as the SSH user, then runs `pnpm --version` as that user
  and exits if the result doesn't match. That covers the acceptance check during provisioning.
- `--frozen-lockfile` was added to the installs in `03-build-packages.sh` and `scripts/deploy-lightsail.sh`.
  It passes locally with pnpm 8.15.7.
- Not done: the optional change to stop `start.sh` running `pnpm start`, and the Node 24 question.
  `pnpm start` also runs `build:css`, so running node directly would need that step moved to build time.
  That's a separate ticket.
