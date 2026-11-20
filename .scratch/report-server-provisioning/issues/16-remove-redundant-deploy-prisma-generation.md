# 16 - Remove redundant Prisma generation from deployment and verify a successful redeploy

Status: resolved
Type: task

## Evidence (2026-11-08)

After PR #141 merged, deployment on the recreated 1 GB instance successfully stopped the server,
reused dependencies, and built shared packages. It then failed in `apps/report-server`:

```text
Generating Prisma client...
ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "prisma" not found
Deploy aborted. report-server was restarted
Deploy exit code: 1
```

`apps/report-server` does not declare the Prisma CLI. The preceding shared-prisma build already
ran `prisma generate --schema=../../apps/frontend/prisma/schema.prisma` successfully. The redundant
command predates PR #141. Locally it can find a CLI but warns that no schema exists in the default
locations, so a developer machine can mask the production failure.

The abort handler worked: startup completed at 06:27:21 UTC, PDFs subsequently worked, and PM2
later showed 13 hours online with zero restarts. The kernel OOM check printed no matches.
During install/build, the highest five-second sample was 671 MB used / 273 MB available;
after restart, 756 MB used / 188 MB available. These are sampled values, not guaranteed peaks.

## Work

- Remove the redundant final Prisma generation and unnecessary directory change from
  `scripts/deploy-lightsail.sh`; retain generation in the shared-prisma build.
- Preserve stop-before-install and restart-on-error behavior.
- Open a PR with the production failure evidence and validation results.
- After merge, pull main before invoking the updated deployment script on the instance.
- Run the deployment with memory logging, starting with report-server online, then generate a PDF.

## Acceptance

- Script syntax passes; a clean install/build provides the generated Prisma client without relying
  on a CLI or schema in `apps/report-server`.
- Updated deployment exits 0, restarts the server, and leaves it serving requests.
- SSH stays responsive, no new OOM kills occur, and a PDF downloads and opens correctly.
- Attach deployment output and memory measurements. Until then ticket 04's redeploy acceptance remains open.

Related: [04](04-install-runs-out-of-memory.md).

## Progress (2026-11-08)

Done on branch `deploy-drop-redundant-prisma-generate`:

- Removed the `cd apps/report-server` and `pnpm exec prisma generate` steps from
  `scripts/deploy-lightsail.sh`. The stop-before-install step, the `restart_after_abort` trap, and
  the trap reset before the final restart are unchanged.
- `bash -n scripts/deploy-lightsail.sh` passes.
- Clean-checkout check in a fresh worktree: `pnpm install --frozen-lockfile` and
  `pnpm run build:packages` both exit 0. The shared-prisma build printed
  `Generated Prisma Client (v5.15.0) to ./../../node_modules/.pnpm/@prisma+client@5.15.0_prisma@5.15.0/...`.
  `apps/report-server/node_modules/.bin` has no `prisma` binary. From `apps/report-server`, `require('@prisma/client')`
  resolves to that same generated package and `new PrismaClient()` loads, with 27 models.

Still open (human): open the PR, merge it, pull main on the instance, run the deploy with memory
logging while report-server is online, generate a PDF, and attach the output. Ticket 04's
redeploy acceptance depends on this.

## Verification (2026-11-08, after PR #143 merged)

On the `micro_3_0` instance (`bitnami@54.70.186.10`, `/opt/voter-file-tool`):

- `git pull origin main` fast-forwarded `c50dbd3..5efb2e6` before the script was invoked, so the updated
  script ran. (`grep -c "prisma generate"` prints 1 because the new comment mentions it; the command is gone.)
- report-server was online before the deploy (14h uptime, 0 restarts).
- `bash scripts/deploy-lightsail.sh` built all workspace packages, restarted report-server, and printed
  `✅ Deployment complete!` with `Deploy exit code: 0`. PM2 then showed report-server `online`, new PID 47754,
  0 restarts, 59s uptime at 91.1 MB.
- Memory, sampled every 5s with `free -m` during the deploy. The three lowest-available samples:

  ```text
  20:36:08 used=743 avail=201
  20:36:03 used=741 avail=203
  20:36:13 used=741 avail=203
  ```

  These are samples, not guaranteed peaks. They are in line with the previous run's 188 MB available after restart.
- `sudo dmesg -T | grep -i -E "out of memory|oom-kill"` printed nothing.
- SSH stayed responsive throughout. A PDF generated afterwards downloaded and opened correctly.

All acceptance criteria are met. This also closes ticket 04's redeploy acceptance.
