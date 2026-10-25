# 03 - `pnpm dev --port` doesn't override AUTH_URL

Status: needs-triage
Type: task

## Why

`scripts/dev.sh` points the frontend at its own port by setting `NEXTAUTH_URL=http://localhost:$WEB_PORT`. The
frontend uses next-auth `5.0.0-beta.29` (`apps/frontend/package.json`), which reads `AUTH_URL` ahead of
`NEXTAUTH_URL`. If a developer's `apps/frontend/.env` sets `AUTH_URL`, then `pnpm dev --port 3100` leaves next-auth
on the `.env` value: sign-in redirects go to the wrong port.

It works today because `.env.example` documents only `NEXTAUTH_URL`. The app's own code also reads only
`NEXTAUTH_URL` (`apps/frontend/src/app/api/admin/invites/route.ts`, for invite links).

## To do

- Confirm in next-auth 5.0.0-beta.29's source which variable wins when both are set.
- If `AUTH_URL` wins, set both `AUTH_URL` and `NEXTAUTH_URL` in `scripts/dev.sh` (line with `PDF_SERVER_URL=`),
  and mention both in `docs/LOCAL_DEVELOPMENT.md` under "One command: `pnpm dev`".
- Check by putting `AUTH_URL=http://localhost:3000` in `.env`, running `pnpm dev --port 3100`, and signing in.
