# 04 - Script for the Postgres integration tests (`test:pg`)

Status: needs-triage
Type: task
Source: transcript analysis, 2026-11-20 (see ../README.md)
Blocked by: 03

## Problem

The throwaway-database procedure for `test:pg` was worked out again in several sessions. `voter_file_test` was
sometimes migrations behind. `/code-review` skipped `test:pg` entirely.

## Procedure that worked

1. Read credentials with `docker exec frontend-postgres-1 printenv`.
2. `CREATE DATABASE <tmp>`.
3. `POSTGRES_PRISMA_URL=<tmp url> npx prisma migrate deploy`.
4. `SKIP_ENV_VALIDATION=1 POSTGRES_PRISMA_URL_TEST=<tmp url> pnpm --filter voter-file-tool test:pg` (or
   `npx jest --config jest.pg.config.cjs --runInBand`).
5. Drop the database.

Never print the credentials.

## Proposal

`scripts/test-pg.sh`, wired into 01's pre-checks and merge-readiness checks when SQL or Prisma
files changed.
