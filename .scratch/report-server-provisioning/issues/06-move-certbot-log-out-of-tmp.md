# 06 - Move the certbot log out of /tmp

Status: resolved
Type: task

## Why

`infrastructure/scripts/07-start-services.sh` writes certbot output to the fixed path `/tmp/certbot.log`
(truncated with `: >`, then appended to with `tee -a` across the three retry attempts). A fixed name in
world-writable `/tmp` is a known anti-pattern: a local user could create the file or a symlink there first and
have provisioning write into it. The log is also world-readable and includes the certbot email and domain.

The practical risk is low. The script runs once, on a fresh single-tenant VM, and Ubuntu's
`fs.protected_symlinks=1` already blocks the symlink attack. The path also predates the certbot retry change
(`main` already tees to it). A PR review raised this and it was deferred as a non-blocker.

A `mktemp` path, as the review suggested, is the wrong fix. The log exists so someone who SSHes in later can find
it, and a random `/tmp/tmp.XXXX` name is hard to find and is wiped on reboot. Keep the path fixed and findable,
but put it in a directory only root can write to.

## To do

- Create a root-owned log directory, e.g. `sudo install -d -m 750 /var/log/voter-file-tool`.
- Put the path in a variable (e.g. `CERTBOT_LOG=/var/log/voter-file-tool/certbot.log`), and use it for the
  truncate, the `tee -a` (which becomes `sudo tee -a`, since the directory is root-owned), the "Full output:" line
  and the `SETUP_WARNINGS` entry.
- Also mention `/var/log/letsencrypt/letsencrypt.log` in the failure output, since certbot keeps its own fuller log
  there.
- Update any docs that point at `/tmp/certbot.log` (`grep -rn certbot.log infrastructure`).

## Acceptance

- Nothing in `infrastructure/` references `/tmp/certbot.log`.
- After a provisioning run with a certbot failure, the log is at the new path, owned by root, not world-readable,
  and it holds the output of all attempts.
- The failure message and setup summary both print the new path.

## Comments

### 2026-11-07: implemented on branch `report-server-hardening` (commit `db20d568`), needs a recreate to verify

`07-start-services.sh` writes to `/var/log/voter-file-tool/certbot.log` (directory root:root 750, file 640) through `sudo tee -a`, and points at `/var/log/letsencrypt/letsencrypt.log` in the failure output. `DEPLOYMENT_SETUP.md` is updated, and nothing in `infrastructure/` references `/tmp/certbot.log`. Checking the failure path needs a recreate where certbot fails.

### 2026-11-08: verification update

Verified the real certbot failure path after PR #141: directory root:root 750, file root:root 640, and three `Requesting a certificate` entries retained. Failure output and final summary named the protected path. Repository search found no `/tmp/certbot.log` references under infrastructure. Automatic HTTPS failure remains tracked in ticket 02.
