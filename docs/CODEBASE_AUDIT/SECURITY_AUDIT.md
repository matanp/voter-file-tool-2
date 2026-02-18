# Security Audit

## Executive Summary

This is a SaaS voter file management tool for the Monroe County Democratic Committee. The frontend (Next.js 15) is deployed on Vercel, the report-server (Express + Puppeteer) on AWS Lightsail, with Cloudflare R2 for storage and Ably for realtime updates. The application handles voter PII (names, addresses, DOB, phone, email, party affiliation, voting history). Several critical security issues were found, primarily around unauthenticated API routes and missing defense-in-depth.

---

## P0 -- Critical (Fix Immediately)

### 1. Multiple Admin API Routes Have No Authentication — **RESOLVED**

**Status:** All listed routes are now wrapped with `withPrivilege(PrivilegeLevel.Admin)` or `withPrivilege(PrivilegeLevel.Developer)` (for `loadAdmin` only). Unauthenticated callers receive 401.

| Route                                   | Method   | Status                     |
| --------------------------------------- | -------- | -------------------------- |
| `/api/admin/bulkLoadData`               | POST     | `withPrivilege(Admin)`     |
| `/api/admin/bulkLoadCommittees`         | POST     | `withPrivilege(Admin)`     |
| `/api/admin/handleCommitteeDiscrepancy` | POST     | `withPrivilege(Admin)`     |
| `/api/admin/loadAdmin`                  | POST     | `withPrivilege(Developer)` |
| `/api/admin/electionDates`              | GET/POST | `withPrivilege(Admin)`     |
| `/api/admin/electionDates/[id]`         | DELETE   | `withPrivilege(Admin)`     |
| `/api/admin/officeNames/[id]`           | DELETE   | `withPrivilege(Admin)`     |
| `/api/committee/fetchLoaded`            | POST     | `withPrivilege(Admin)`     |
| `/api/admin/scripts/specialVoterFile`   | POST     | `withPrivilege(Admin)`     |

**Remaining recommendation:** Add Next.js middleware as defense-in-depth (see #2).

### 2. No Next.js Middleware for Route Protection

There is no `src/middleware.ts` file. All API routes are now wrapped by `withPrivilege`, `withBackendCheck`, or `withPublic`, but there is no defense-in-depth: a single unwrapped route in the future would be unprotected. Admin UI pages (`/admin/dashboard`, `/admin/data`) have no server-side auth gate at the page level -- they rely solely on client-side `<AuthCheck>` components, which can be bypassed.

**Recommendation:** Add a `middleware.ts` that:

- Requires authentication for all `/api/` routes (except `/api/auth/`)
- Requires authentication for all page routes (except `/`, `/auth/`, `/error`)
- Optionally enforces privilege levels for `/api/admin/` routes

### 3. Report-Server `/start-job` Endpoint Has No Authentication

The Express server's only route (`POST /start-job`) has zero authentication. No API key, no JWT, no IP allowlist, no shared secret verification. The nginx configs proxy all traffic without auth headers. Combined with the Lightsail firewall having port 8080 open publicly (see finding #4), the report-server is directly accessible to anyone on the internet.

**Recommendation:** Add shared-secret authentication. The simplest approach: verify the `x-webhook-signature` header on incoming requests using the same `WEBHOOK_SECRET` that already exists in both environments. The frontend already signs its outgoing requests this way.

### 4. Port 8080 Publicly Open on Lightsail

The `aws_lightsail_instance_public_ports` Terraform resource opens port 8080 to the world. This means the Node.js Express server is directly accessible, bypassing nginx entirely (no SSL, no rate limiting, no security headers).

**Recommendation:** Remove port 8080 from the public ports resource. Only ports 22, 80, and 443 should be open. The Express app should only be accessible via nginx on localhost.

---

## P1 -- High

### 5. Secrets in Infrastructure and Environment Files

- `infrastructure/terraform.tfvars` contains live GitHub PAT, Neon DB credentials, R2 credentials, webhook secret. While `.gitignore` excludes `*.tfvars`, any accidental `git add -f` would expose all production secrets.
- `apps/frontend/.env` contains commented-out production Neon DB credentials (lines 20-31), an SSH passphrase in a comment (line 31), and commented-out production R2 credentials.
- GitHub token appears in plaintext in `/var/log/user-data.log` on the Lightsail server (Terraform `user_data` logs all output including the `git clone` URL with embedded token).

**Recommendation:** Rotate ALL credentials that have appeared in any file. Remove commented-out production credentials from `.env` files. Create `terraform.tfvars.example` with placeholders. Mask the GitHub token in `user_data` by cloning via SSH key or using a separate script that doesn't log.

### 6. `GET /api/reports` Leaks All Reports to Any Authenticated User

With `type=all` (or any unrecognized value), the where clause resolves to `{ deleted: false }` -- any authenticated user (including `ReadAccess`) can retrieve ALL non-deleted reports from ALL users, including metadata and presigned download URLs for every report file.

**Recommendation:** Restrict `type=all` to Admin+ users. Default to `my-reports` for non-admin users.

### 7. No Terraform Remote State Backend

`main.tf` has no `terraform { backend {} }` block. State is stored locally. If the local state file is lost, the infrastructure is orphaned -- Terraform cannot manage existing resources. The static IP has `prevent_destroy = true` which won't help without state.

**Recommendation:** Configure an S3 or Terraform Cloud backend for state storage.

### 8. WEBHOOK_SECRET Not Required at Startup (Report-Server)

If `WEBHOOK_SECRET` is missing from the report-server environment, callbacks are sent unsigned. The frontend would either accept unsigned callbacks (if also misconfigured) or reject them (causing all jobs to silently fail). There is no startup assertion.

**Recommendation:** Add a startup check that exits with an error if `WEBHOOK_SECRET` is not set, similar to how `CALLBACK_URL` is already validated at startup.

### 9. `handleCommitteeDiscrepancy` -- No Input Validation

This route uses `(await req.json()) as HandleDiscrepancyRequest` -- a raw TypeScript cast with no Zod validation. The `takeAddress` field is written directly to `voterRecord.addressForCommittee` with no length or format validation. An attacker could store arbitrary strings (including very long ones) in the database.

**Recommendation:** Add Zod schema validation. Validate `takeAddress` length and format.

---

## P2 -- Medium

### 10. TOCTOU Race Condition in Invite Flow

The `signIn` callback checks invite validity, but the invite is only marked as used in the `createUser` event. Rapid concurrent sign-in attempts with the same token could result in the invite being used more than once.

**Recommendation:** Mark the invite as used atomically in the `signIn` callback using a database transaction, or add a unique constraint on invite usage.

### 11. `generateReport` Error Response Leaks Internal Details

The error response includes `message: error` which passes the raw JavaScript Error object. This could expose stack traces or internal implementation details to the client.

**Recommendation:** Return a generic error message. Log the full error server-side only.

### 12. Missing HSTS Header in Nginx

No `Strict-Transport-Security` header is configured in any nginx config. For a production app handling voter PII over HTTPS, HSTS should be enabled.

**Recommendation:** Add `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;` to the SSL nginx config.

### 13. Missing Content-Security-Policy Header

No CSP header in any nginx config. This leaves the application vulnerable to XSS if any injection point exists.

**Recommendation:** Add a restrictive CSP header.

### 14. Gzip Bomb Risk on Report-Server

The `/start-job` endpoint uses `gunzipSync` on the raw request body. The `limit: '2mb'` refers to compressed size. A malicious payload could decompress to much more than 2MB, consuming server memory.

**Recommendation:** Add a decompressed size check or use streaming decompression with a size limit.

### 15. `$executeRawUnsafe` in Voter Import

`batchUpdateVoterRecords` in the voter-import-processor uses `prisma.$executeRawUnsafe` with string interpolation. While `formatSqlValue` escapes single quotes, the approach bypasses Prisma's query builder entirely. If `formatSqlValue` has a bug, SQL injection is possible.

**Recommendation:** Consider using Prisma's `$executeRaw` with tagged template literals for parameterized queries, or at minimum add comprehensive test coverage for `formatSqlValue`.

### 16. Sentry Test Endpoint Publicly Accessible — **RESOLVED**

`GET /api/sentry-example-api` is now gated: when `NODE_ENV === 'production'` the route returns 404. The endpoint remains available in development for Sentry verification.

### 17. Missing Nginx Rate Limiting

No `limit_req_zone` or `limit_req` directives in any nginx config. Report generation is expensive (Puppeteer launches Chrome). An attacker could trigger many concurrent report jobs.

**Recommendation:** Add rate limiting on the nginx proxy, especially for `/start-job`.

---

## P3 -- Low

### 18. R2 Credentials Not Validated at Startup (Report-Server)

`s3Utils.ts` loads R2 credentials with `!` (non-null assertion). Missing credentials create a client with `undefined` values that fails at request time, not at startup.

**Recommendation:** Validate R2 credentials at server startup and fail fast.

### 19. Admin Invites GET Returns Raw Tokens

`GET /api/admin/invites` returns the raw invite `token` field to any Admin user. This is likely intentional (admins need to share invite links) but should be documented as a design decision.

### 20. `env.js` Missing Validation for Runtime Secrets

`@t3-oss/env-nextjs` only validates `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`. Critical runtime variables (`WEBHOOK_SECRET`, `ABLY_API_KEY`, `PDF_SERVER_URL`, all `R2_*` variables) are accessed via `process.env` directly without build-time validation.

**Recommendation:** Add all critical env vars to the `env.js` server schema.

### 21. Puppeteer `--no-sandbox` Flag

The report-server launches Puppeteer with `--no-sandbox` and `--disable-setuid-sandbox`. This is standard for VM/container environments but reduces process isolation. Acceptable given the controlled server environment, but should be documented.

### 22. Self-Signed Certificate Expires in 1 Year

`generate-self-signed-cert.sh` creates a cert valid for 365 days with no auto-renewal mechanism. If using self-signed mode, HTTPS will silently break after one year.

---

## Summary

| Priority | Count | Key Theme                                                       |
| -------- | ----- | --------------------------------------------------------------- |
| P0       | 4     | Unauthenticated admin routes, no middleware, report-server open |
| P1       | 5     | Secrets management, data leaks, missing validation              |
| P2       | 8     | Race conditions, missing security headers, injection risks      |
| P3       | 5     | Startup validation, documentation, minor hardening              |

The previously unprotected admin API routes now use `withPrivilege`. The next priority is implementing Next.js middleware for defense-in-depth.
