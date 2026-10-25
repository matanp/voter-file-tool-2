# Local Development

Single reference for starting the voter-file-tool locally: database, R2, report-server, and frontend.

## Prerequisites

- **Node.js 22 or later** (nvm recommended; the report-server requires 22+, and Vercel builds the frontend on 24.x)
- **pnpm**
- **Docker Desktop** (optional; only if using local database. `pnpm dev` starts it on macOS)

## Database

Choose one:

### Option A – Local Docker

- Follow [scripts/README.md](../scripts/README.md): run `./scripts/setup-dev-db.sh` from the repo root.
- Ensure `apps/frontend/.env` has `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, and `POSTGRES_PRISMA_URL` (see [apps/frontend/.env.example](../apps/frontend/.env.example)).
- If the database already exists: `cd apps/frontend && docker compose up -d`, then `pnpm db_migrate` after pulling new migrations.

### Option B – Connect to production (or remote) database

- Set `POSTGRES_PRISMA_URL` in both `apps/frontend/.env` and `apps/report-server/.env` to your prod or remote DB connection string.
- No Docker required. Prefer a read-only or dev copy of the DB when possible; avoid writing to production from local.

## R2 (object storage)

Use a **separate dev R2 instance** in the cloud (different bucket/credentials from production).

- Set the same R2 variables in **both** apps:
  - `apps/frontend/.env`
  - `apps/report-server/.env`
- Variables: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.

## Report-server

- **Location:** `apps/report-server`
- **Env:** Copy `apps/report-server/.env.example` to `.env` and fill in values. For local dev, `CALLBACK_URL` should point at your frontend (e.g. `http://localhost:3000/api/reportComplete`).
- **Scheduler:** BOE re-scan runs on a recurring schedule by default (`BOE_FLAGGING_RESCAN_INTERVAL_HOURS=24`). Set `BOE_FLAGGING_RESCAN_ENABLED=false` in local `.env` if you want manual-only runs.
- **Run:** `pnpm dev` (listens on port 8080 by default). CSS is built automatically; if needed, run `pnpm build:css` once.

## Frontend

- **Location:** `apps/frontend`
- **Env:** Copy `apps/frontend/.env.example` to `.env` and fill in all required values. For local report-server, set `PDF_SERVER_URL=http://localhost:8080`.
- **Run:** `pnpm dev` (Next.js, usually port 3000).

## Quick start checklist

1. **Database:** Either run `./scripts/setup-dev-db.sh` (Docker) or set `POSTGRES_PRISMA_URL` in both app `.env` files to a remote DB.
2. **R2:** Set R2 env vars in both `apps/frontend/.env` and `apps/report-server/.env` (dev bucket).
3. **Run everything:** `pnpm dev` from the repo root.

## One command: `pnpm dev`

`pnpm dev [--port N] [--no-db]` from the repo root ([scripts/dev.sh](../scripts/dev.sh)):

- Starts Docker Desktop if it isn't running, then `docker compose up -d` on `apps/frontend/docker-compose.yml` (the same container `setup-dev-db.sh` created). `--no-db` skips this when using a remote database.
- Starts the frontend on port N (default 3000) and the report-server on N+1, and links them by setting `PDF_SERVER_URL`, `NEXTAUTH_URL`, `PORT` and `CALLBACK_URL`. These override the values in the `.env` files.
- Builds the workspace packages (`pnpm run build:packages`) if any haven't been built yet.
- Exits with an error if either port is already taken.
- Prefixes output with `[web]` / `[report]`. Ctrl-C stops both servers; Postgres keeps running.

On a port other than 3000, Google sign-in needs `http://localhost:N/api/auth/callback/google` listed as an authorized redirect URI on the OAuth client.

Running each app on its own (above) still works.

## Troubleshooting

- **Database:** See [scripts/README.md](../scripts/README.md) for Docker issues, migrations, and seeding.
- **Report-server “declaration file” / module not found:** Build workspace packages first: from repo root run `pnpm run build:packages`, or from `apps/report-server` run `pnpm run prestart` (or `pnpm start` once, which runs prestart).
