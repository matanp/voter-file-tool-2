# 14 - Build the report server elsewhere and copy it to the box

Status: needs-triage
Type: task

## Why

Every deploy runs `pnpm install` for the whole workspace (including the Next.js frontend), `prisma generate` and
`tsc` on the 1 GB box. That's what froze the box in ticket 04. PR #141 makes it gentler but doesn't remove it. If the
box never installs or builds, that whole class of out-of-memory problems goes away, and ticket 04 step 4 (the filtered
install, blocked on Prisma) doesn't matter any more.

## Approach

- Build somewhere with memory to spare: a GitHub Actions job on `ubuntu-latest`, or locally on linux-x64 (for example
  in Docker). Run the workspace builds, `prisma generate`, the report-server `build` (ticket 10), then
  `pnpm deploy --filter node-pdf-generation --prod <out>`, which gives one folder with only production dependencies.
- The Prisma engine has to match the box (Ubuntu, OpenSSL version). Build on a matching image, or set `binaryTargets`
  in the schema.
- The Puppeteer browser download (`~/.cache/puppeteer`) stays on the box, installed once at provisioning time.
- Ship it: upload a tarball (to a GitHub release or R2), then `deploy-lightsail.sh` downloads it, unpacks it to
  `releases/<sha>`, flips a `current` symlink and runs `pm2 restart`. Keep the previous release for rollback.
- Provisioning (`03-build-packages.sh`) would download the same artifact instead of building.

## Questions for a human

- Should GitHub Actions build on every merge to `main`, or is a manual `pnpm run build:report-bundle` from the laptop enough?
- Where should artifacts live: GitHub releases (private repo), or R2 (already used for reports)?
- Is this worth it after tickets 09–12? If deploys stop freezing once PR #141 lands, it can wait.

## Acceptance

- `deploy-lightsail.sh` runs no `pnpm install`, `tsc` or `prisma generate` on the box.
- A deploy's peak memory (ticket 08 method) is roughly the same as a PM2 restart.
- Rolling back to the previous release is one command.

## Comments
