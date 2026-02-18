# Environment & Configuration Hygiene

## Executive Summary

Analysis of environment variable management, secrets handling, configuration consistency, and `.env` file hygiene across the monorepo. The project has two apps (frontend on Vercel, report-server on Lightsail) that share several env vars (R2 credentials, webhook secret, Postgres URL). The `.env.example` files are well-structured but several gaps exist between examples and actual usage.

---

## .env File Inventory

| File | Tracked in Git | Purpose |
|---|---|---|
| `apps/frontend/.env` | No (`**/.env`) | Local frontend development secrets |
| `apps/report-server/.env` | No (`**/.env`) | Local report-server secrets |
| `apps/frontend/.env.example` | Yes | Template for frontend .env |
| `apps/report-server/.env.example` | Yes | Template for report-server .env |
| `apps/frontend/.env.sentry-build-plugin` | No (frontend `.gitignore`) | Sentry auth token |
| `.vercel/.env.preview.local` | No (`.vercel`) | Vercel CLI preview env |
| `.vercel/.env.development.local` | No (`.vercel`) | Vercel CLI dev env |
| `.env_n8n` | No (`.env_n8n`) | N8N credentials (orphaned) |
| `infrastructure/terraform.tfvars` | No (`*.tfvars`) | Terraform variables with secrets |

---

## .env.example vs Actual .env Analysis

### Frontend `.env.example` vs `.env`

| Variable | In .env.example | In .env | Status |
|---|---|---|---|
| `POSTGRES_USER` | Yes | Yes | Match |
| `POSTGRES_PASSWORD` | Yes | Yes | Match |
| `POSTGRES_DB` | Yes | Yes | Match |
| `POSTGRES_PORT` | Yes | Yes | Match |
| `POSTGRES_PRISMA_URL` | Yes | Yes | Match |
| `AUTH_SECRET` | Yes | Yes | Match |
| `AUTH_GOOGLE_ID` | Yes | Yes | Match |
| `AUTH_GOOGLE_SECRET` | Yes | Yes | Match |
| `NEXTAUTH_URL` | Yes (optional note) | Yes | Match |
| `PDF_SERVER_URL` | Yes | **Commented out** | Gap -- needed for report generation |
| `WEBHOOK_SECRET` | Yes | Yes | Match |
| `R2_ACCOUNT_ID` | Yes | Yes | Match |
| `R2_ACCESS_KEY_ID` | Yes | Yes | Match |
| `R2_SECRET_ACCESS_KEY` | Yes | Yes | Match |
| `R2_BUCKET_NAME` | Yes | Yes | Match |
| `ABLY_API_KEY` | Yes | Yes | Match |
| `R2_TOKEN` | **No** | Yes | Missing from example |
| `NEXT_PUBLIC_POSTHOG_KEY` | **No** | Yes | Missing from example |
| `NEXT_PUBLIC_POSTHOG_HOST` | **No** | Yes | Missing from example |
| `NEXT_PUBLIC_POSTHOG_ASSETS_HOST` | **No** | Yes | Missing from example |
| `SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING` | **No** | Yes | Missing from example |
| `POSTGRES_HOST` | **No** (only as part of URL) | Yes (separate var) | Structure mismatch |

### Report-Server `.env.example` vs `.env`

| Variable | In .env.example | In .env | Status |
|---|---|---|---|
| `PORT` | Yes | Yes | Match |
| `CALLBACK_URL` | Yes | **Missing** | Gap -- required for webhook callbacks |
| `WEBHOOK_SECRET` | Yes | Yes | Match |
| `R2_ACCOUNT_ID` | Yes | Yes | Match |
| `R2_ACCESS_KEY_ID` | Yes | Yes | Match |
| `R2_SECRET_ACCESS_KEY` | Yes | Yes | Match |
| `R2_BUCKET_NAME` | Yes | Yes | Match |
| `POSTGRES_PRISMA_URL` | Yes | Yes | Match |
| `NODE_ENV` | Yes | **Missing** | PM2 sets it via ecosystem.config.js |
| `R2_ENDPOINT` | **No** | Yes | Missing from example |
| `R2_TOKEN` | **No** | Yes | Missing from example |
| `POSTGRES_USER/PASSWORD/DB/PORT/HOST` | **No** | Yes (separate vars) | Example uses flat URL; .env uses interpolation |

---

## Findings

### P0 -- Critical

#### 1. Commented-Out Production Credentials in .env Files

The frontend `.env` contains commented-out blocks with real production database credentials:
- Lines 20-23: Neon production DB URL with password
- Line 29: Another Neon DB connection string with password
- Line 31: SSH passphrase in a comment
- Lines 48-56: A shell command block that would write production secrets to `.env`

The report-server `.env` has similar commented-out production credentials (lines 22-36).

**Risk:** While these files are gitignored, they exist on disk. Any tool that reads `.env` files (IDE plugins, backup scripts, error reporters) could inadvertently capture production secrets.

**Recommendation:** Remove ALL commented-out production credentials from `.env` files. Store production values only in Vercel dashboard / Terraform tfvars / a secrets manager.

### P1 -- High

#### 2. `CALLBACK_URL` Missing from Report-Server .env

The report-server `.env.example` includes `CALLBACK_URL=http://localhost:3000/api/reportComplete`, but the actual `.env` does not set it. The report-server validates `CALLBACK_URL` at startup via `callbackUrlSchema.safeParse()` and will exit with code 1 if invalid. This means the local dev report-server either cannot start, or there is a fallback that masks the issue.

**Recommendation:** Add `CALLBACK_URL=http://localhost:3000/api/reportComplete` to the report-server `.env`.

#### 3. `PDF_SERVER_URL` Missing from Frontend .env

The frontend `.env.example` lists `PDF_SERVER_URL` as the report-server URL, but it's commented out in the actual `.env`. Without this, the frontend cannot send report generation requests to the report-server.

**Recommendation:** Add `PDF_SERVER_URL=http://localhost:8080` to the frontend `.env`.

#### 4. PostHog Variables Not in .env.example

`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_ASSETS_HOST` are in the actual `.env` but not in `.env.example`. These are `NEXT_PUBLIC_` prefixed (exposed to the browser) and used in `next.config.js` for rewrite rules. If unset, the PostHog rewrites use `undefined` as the destination URL, which will cause runtime errors.

**Recommendation:** Add PostHog variables to `.env.example` with a comment noting they are optional (analytics).

#### 5. `R2_ENDPOINT` Not in .env.example

The report-server `.env` sets `R2_ENDPOINT` but it's not in `.env.example`. The `s3Utils.ts` reads `R2_ENDPOINT` via `process.env.R2_ENDPOINT!`. If unset, the S3 client gets `undefined` as the endpoint.

**Recommendation:** Add `R2_ENDPOINT` to both `.env.example` files.

#### 6. `R2_TOKEN` Not Documented

Both `.env` files contain `R2_TOKEN` but neither `.env.example` includes it. It's unclear where this token is used -- the S3 client in `s3Utils.ts` uses `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`, not `R2_TOKEN`.

**Recommendation:** Determine if `R2_TOKEN` is actually used in code. If not, remove it from `.env` files. If yes, document its purpose and add to `.env.example`.

### P2 -- Medium

#### 7. `env.js` Only Validates 3 Server Variables

`src/env.js` uses `@t3-oss/env-nextjs` to validate env vars at build time, but only validates:
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

Missing from validation: `WEBHOOK_SECRET`, `ABLY_API_KEY`, `PDF_SERVER_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `POSTGRES_PRISMA_URL`.

These are accessed via `process.env` directly at runtime. A missing variable causes a runtime error in production rather than a build-time error.

**Recommendation:** Add all required server env vars to `env.js`. Make optional vars (PostHog, Sentry) explicitly optional with `z.string().optional()`.

#### 8. Inconsistent Postgres URL Construction

Frontend `.env` constructs `POSTGRES_PRISMA_URL` via interpolation:
```
POSTGRES_PRISMA_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}
```
This requires `dotenv-expand` or shell-level expansion.

Report-server `.env` does the same. But `.env.example` for the report-server shows a flat URL:
```
POSTGRES_PRISMA_URL=postgresql://user:password@localhost:5432/your_database
```

Frontend `.env.example` shows both patterns: separate vars AND a flat URL alternative.

**Recommendation:** Pick one pattern and use it consistently. The interpolation pattern is more maintainable but requires `dotenv-expand` (which the report-server does use). Document which approach is supported.

#### 9. `NODE_ENV` Set in Multiple Places

For the report-server:
- `.env.example` sets `NODE_ENV=development`
- `ecosystem.config.js` sets `NODE_ENV: 'production'` in PM2 env
- The actual `.env` does not set `NODE_ENV`

PM2's `env` setting takes precedence over dotenv in production. The precedence order is not documented.

**Recommendation:** Document the `NODE_ENV` resolution order. Remove `NODE_ENV` from `.env.example` if PM2 is the canonical source in production.

#### 10. Sentry Auth Token Split Across Files

The Sentry auth token appears in:
- `apps/frontend/.env.sentry-build-plugin` (standalone file, gitignored)
- `.vercel/.env.preview.local` (as `SENTRY_AUTH_TOKEN`)
- `.vercel/.env.development.local` (as `SENTRY_AUTH_TOKEN`)

Not in `apps/frontend/.env` or `.env.example`.

**Recommendation:** Add `SENTRY_AUTH_TOKEN` to `.env.example` as optional, with a comment referencing `.env.sentry-build-plugin`.

### P3 -- Low

#### 11. `.env_n8n` -- Orphaned Config

`.env_n8n` at the repo root contains N8N email and password. No N8N configuration exists elsewhere in the repo. This appears to be a leftover from an experiment.

**Recommendation:** If N8N is no longer used, delete `.env_n8n` and remove it from `.gitignore`.

#### 12. Vercel CLI `.env` Files Contain Full Production Secrets

`.vercel/.env.preview.local` and `.vercel/.env.development.local` contain all production secrets (DB credentials, R2 keys, Sentry tokens, Ably keys, OIDC tokens). These are auto-generated by `vercel env pull` and gitignored, but they persist on disk indefinitely.

**Recommendation:** Be aware these files exist. Consider running `vercel env pull` only when needed and removing the files afterward.

#### 13. `POSTGRES_HOST` / `POSTGRES_PORT` Individual Variables

The frontend `.env` sets `POSTGRES_HOST=localhost` and `POSTGRES_PORT=5432` as separate vars, then composes them into `POSTGRES_PRISMA_URL`. These individual vars are also used by `docker-compose.yml`. Changing the DB port requires updating both `POSTGRES_PORT` and confirming `docker-compose.yml` reads it correctly.

**Recommendation:** Document the relationship between individual Postgres vars, docker-compose, and the composed URL.

#### 14. `NX_DAEMON` and `TURBO_*` Variables in Vercel Files

The Vercel env files contain Turborepo-specific variables (`TURBO_CACHE`, `TURBO_REMOTE_ONLY`, etc.) and `NX_DAEMON`. The project uses pnpm workspaces, not Nx or Turbo. These appear to be Vercel platform defaults.

**Recommendation:** No action needed -- these are Vercel-injected and harmless.

---

## Cross-App Environment Consistency

### Shared Variables (Must Match Between Apps)

| Variable | Frontend | Report-Server | Notes |
|---|---|---|---|
| `WEBHOOK_SECRET` | Yes | Yes | Must be identical for signed webhook verification |
| `R2_ACCOUNT_ID` | Yes | Yes | Must match |
| `R2_ACCESS_KEY_ID` | Yes | Yes | Must match |
| `R2_SECRET_ACCESS_KEY` | Yes | Yes | Must match |
| `R2_BUCKET_NAME` | Yes (opensourcepolitics-dev) | Yes (opensourcepolitics-dev) | Must match. Note: prod uses `opensourcepolitics` (no `-dev`) |
| `POSTGRES_PRISMA_URL` | Yes | Yes | Same database |

### Variables That Reference Each Other

| Frontend Variable | Report-Server Variable | Relationship |
|---|---|---|
| `PDF_SERVER_URL` | `PORT` | Frontend's `PDF_SERVER_URL` must point to report-server's host:PORT |
| -- | `CALLBACK_URL` | Must point to frontend's `/api/reportComplete` URL |

**Recommendation:** Document these cross-references explicitly in both `.env.example` files with comments like:
```
# Must match WEBHOOK_SECRET in report-server/.env
WEBHOOK_SECRET=

# Must point to report-server (default: http://localhost:8080)
PDF_SERVER_URL=http://localhost:8080
```

---

## Recommendations Summary

### Immediate
1. Remove all commented-out production credentials from `.env` files
2. Add missing variables to `.env.example` files (PostHog, R2_ENDPOINT, SENTRY_AUTH_TOKEN)
3. Add `CALLBACK_URL` and `PDF_SERVER_URL` to their respective active `.env` files
4. Expand `env.js` to validate all critical server env vars

### Near-Term
5. Document cross-app variable relationships in `.env.example` comments
6. Decide on a single Postgres URL pattern (interpolation vs flat) and use consistently
7. Document `NODE_ENV` resolution order (dotenv vs PM2 vs Vercel)
8. Delete `.env_n8n` if N8N is no longer used
9. Determine if `R2_TOKEN` is used; remove or document

### Strategic
10. Consider a shared `.env.shared.example` for variables common to both apps
11. Add startup validation in both apps that checks for all required env vars (fail fast)
