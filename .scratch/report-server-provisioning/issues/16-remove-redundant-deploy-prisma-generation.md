# 16 - Remove redundant Prisma generation from deployment and verify a successful redeploy

Status: ready-for-human
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
