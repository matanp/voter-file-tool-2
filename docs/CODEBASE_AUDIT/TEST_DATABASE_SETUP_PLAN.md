# Test Database Setup Plan

**Purpose:** Enable voter-import-processor integration tests for `bulkSaveVoterRecords`, `batchUpdateVoterRecords`, and `bulkSaveDropdownLists`.

**Date:** February 2025  
**Status:** Draft — not yet implemented

---

## Executive Summary

The voter-import-processor package has unit tests for pure functions (`transformVoterRecord`, `convertStringToDateTime`, `isRecordNewer`) but cannot test DB-dependent code without a real database. This plan establishes a test database using a **separate database name** (`voter_file_test`) within the existing Postgres instance — simpler than a separate container and matches common practice.

---

## Design Decisions (Confirmed)

| Decision               | Choice                                           | Rationale                                                     |
| ---------------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| **DB isolation**       | Separate database name in same Postgres instance | Simpler setup, no extra container, dev and test coexist       |
| **Schema application** | `prisma db push`                                 | Faster than migrations; adequate for tests                    |
| **DB creation**        | Script creates `voter_file_test` if not exists   | One-time/semi-automatic, scriptable                           |
| **Per-test cleanup**   | `beforeEach` truncate                            | Full isolation, avoid cross-test contamination                |
| **Missing env var**    | Skip integration tests                           | `pnpm test` works without DB (e.g. CI without services)       |
| **Env documentation**  | Add to `apps/frontend/.env.example`              | Consistent with ENVIRONMENT_CONFIG_HYGIENE                    |
| **Jest config**        | Separate `jest.integration.config.cjs`           | Clear separation; `--runInBand` to avoid connection conflicts |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Docker Postgres (existing: frontend-postgres-1)                  │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │ voter_file_dev       │  │ voter_file_test      │  ← new DB    │
│  │ (POSTGRES_DB)        │  │ (voter_file_test)    │              │
│  └─────────────────────┘  └─────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ POSTGRES_PRISMA_URL_TEST
┌─────────────────────────────┴──────────────────────────────────┐
│  voter-import-processor integration tests (*.integration.test.ts)│
│  createTestPrismaClient() → beforeEach truncate → run tests       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

- Docker Postgres running (`pnpm db:setup` or `docker compose up -d` from `apps/frontend`)
- Prisma schema in `apps/frontend/prisma/schema.prisma` (single source of truth)
- voter-import-processor uses `@prisma/client` from workspace (PrismaClient passed as argument)

---

## Implementation Tasks

### 1. Environment Variable

**File:** `apps/frontend/.env.example`

Add:

```
# Test database for voter-import-processor integration tests (optional)
# POSTGRES_PRISMA_URL_TEST=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/voter_file_test
```

**File:** `apps/frontend/.env` (local only, gitignored)

Uncomment and ensure the URL points at `voter_file_test`. Can derive from existing `POSTGRES_*` vars.

---

### 2. Setup Script

**File:** `scripts/setup-test-db.sh`

Responsibilities:

1. Source `apps/frontend/.env`
2. Validate `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`
3. Ensure Postgres container `frontend-postgres-1` is running (fail with clear message if not)
4. Create database `voter_file_test` if it does not exist (via `docker exec` — no local psql required):
   ```bash
   docker exec frontend-postgres-1 psql -U $POSTGRES_USER -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='voter_file_test'" | grep -q 1 || \
   docker exec frontend-postgres-1 psql -U $POSTGRES_USER -d postgres -c "CREATE DATABASE voter_file_test"
   ```
5. Run `prisma db push` against the test URL from `apps/frontend`:
   ```bash
   cd apps/frontend && POSTGRES_PRISMA_URL="$TEST_URL" pnpm exec prisma db push --accept-data-loss
   ```

Make executable: `chmod +x scripts/setup-test-db.sh`

---

### 3. Jest Integration Config

**File:** `packages/voter-import-processor/jest.integration.config.cjs`

```javascript
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.integration.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  maxWorkers: 1, // --runInBand equivalent
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  roots: ['<rootDir>/src'],
};
```

---

### 4. Test DB Client Factory

**File:** `packages/voter-import-processor/src/__tests__/db/testDbClient.ts`

```typescript
import { PrismaClient } from '@prisma/client';

/**
 * Creates a PrismaClient configured for the test database.
 * Throws if POSTGRES_PRISMA_URL_TEST is not set.
 */
export function createTestPrismaClient(): PrismaClient {
  const url = process.env.POSTGRES_PRISMA_URL_TEST;
  if (!url) {
    throw new Error(
      'POSTGRES_PRISMA_URL_TEST is required for integration tests. ' +
        'Add to .env and run scripts/setup-test-db.sh first.',
    );
  }
  return new PrismaClient({ datasourceUrl: url });
}
```

---

### 5. Integration Test Wrapper (Skip When Env Missing)

**File:** `packages/voter-import-processor/src/__tests__/db/describeIntegration.ts`

```typescript
/**
 * describe wrapper that skips the entire block when POSTGRES_PRISMA_URL_TEST is unset.
 * Use for integration tests to keep pnpm test working in environments without a DB.
 */
export const describeIntegration = process.env.POSTGRES_PRISMA_URL_TEST
  ? describe
  : describe.skip;
```

Usage in integration tests:

```typescript
import { describeIntegration } from './db/describeIntegration';
// ...
describeIntegration('bulkSaveVoterRecords', () => { ... });
```

---

### 6. Sample Integration Test

**File:** `packages/voter-import-processor/src/__tests__/bulkSaveVoterRecords.integration.test.ts`

Structure:

- `describeIntegration('bulkSaveVoterRecords', ...)`
- `beforeAll`: create client, `$connect()`
- `beforeEach`: `deleteMany` on `VoterRecordArchive`, `VoterRecord` (in that order if needed for FKs)
- `afterAll`: `$disconnect()`
- Test cases:
  - Empty array → `{ created: 0, updated: 0 }`
  - New records only → correct `created` count, records in DB
  - Existing + newer record → `updated` count, `isRecordNewer` path
  - Existing + older record → no update, create skipped

Use minimal `Prisma.VoterRecordArchiveCreateManyInput` fixtures (VRCNUM, recordEntryYear, recordEntryNumber required).

---

### 7. Package Scripts

**File:** `packages/voter-import-processor/package.json`

Add/update:

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathIgnorePatterns=integration",
    "test:integration": "jest --config jest.integration.config.cjs --runInBand",
    "test:integration:db": "../../scripts/setup-test-db.sh && pnpm test:integration"
  }
}
```

- `test`: runs unit tests only (default)
- `test:unit`: explicit unit-only run
- `test:integration`: runs integration tests (requires `POSTGRES_PRISMA_URL_TEST` and Postgres up; skips gracefully if env missing)
- `test:integration:db`: runs setup script then integration tests

---

### 8. Documentation

**File:** `docs/CODEBASE_AUDIT/TEST_COVERAGE_ANALYSIS.md`

Update the "Recommendations" section to reference this plan and mark item 17 as "planned" with a link to this document.

---

## Execution Order

| Step | Task                                                  | Depends On    |
| ---- | ----------------------------------------------------- | ------------- |
| 1    | Add `POSTGRES_PRISMA_URL_TEST` to `.env.example`      | —             |
| 2    | Create `scripts/setup-test-db.sh`                     | —             |
| 3    | Create `testDbClient.ts` and `describeIntegration.ts` | —             |
| 4    | Create `jest.integration.config.cjs`                  | —             |
| 5    | Add `package.json` scripts                            | 2             |
| 6    | Create `bulkSaveVoterRecords.integration.test.ts`     | 1, 3, 4       |
| 7    | Run `scripts/setup-test-db.sh` once (manual)          | Docker + .env |
| 8    | Run `pnpm test:integration` to verify                 | 6, 7          |

---

## CI Considerations

When CI is added:

- Start Postgres as a service (e.g. `postgres` in GitHub Actions)
- Set `POSTGRES_PRISMA_URL_TEST` to the CI Postgres instance
- Run setup script (or equivalent) before integration tests
- Consider a separate job/matrix entry for integration tests

---

## Estimated Effort

| Task                                             | Effort       |
| ------------------------------------------------ | ------------ |
| Env + setup script                               | 30 min       |
| Jest config + test client + describeIntegration  | 30 min       |
| bulkSaveVoterRecords integration tests           | 2–3 hrs      |
| bulkSaveDropdownLists integration tests (future) | 1–2 hrs      |
| parseVoterFile E2E (future)                      | 2–3 hrs      |
| **Total (minimum viable)**                       | **~3–4 hrs** |

---

## Out of Scope (This Plan)

- Testcontainers or separate Postgres container
- `prisma migrate deploy` (using `db push` for simplicity)
- E2E tests for full `parseVoterFile` pipeline (future phase)

---

## Review Comments (February 2025)

### Gaps to Address

**1. Env loading for integration tests**

`POSTGRES_PRISMA_URL_TEST` lives in `apps/frontend/.env`, but Jest runs from `voter-import-processor` without loading that file. Add either:

- A Jest `setupFilesAfterEnv` that loads `../../apps/frontend/.env` via dotenv, or
- `test:integration:db` should source `.env` before running tests, e.g. `(source ../../apps/frontend/.env && pnpm test:integration)`

**2. test:integration:db env passing**

The script `../../scripts/setup-test-db.sh && pnpm test:integration` runs setup and tests as separate commands; env vars set in the setup script do not persist to the next command. The script should either source `.env` in the same shell before invoking `pnpm test:integration`, or document that users must run from a shell that has already sourced it.

**3. Truncation order**

`VoterRecord` is referenced by `VotingHistoryRecord` and `CommitteeRequest`. Deleting only `VoterRecordArchive` and `VoterRecord` may hit FK constraints. Either use raw SQL `TRUNCATE ... CASCADE`, or delete in dependency order: `VotingHistoryRecord` → `CommitteeRequest` → `VoterRecord` → `VoterRecordArchive`.

**4. Jest config**

`maxWorkers: 1` in the integration config already serializes tests, so `--runInBand` in the npm script is redundant (harmless).

**5. test:unit pattern**

The default config matches `**/__tests__/**/*.test.ts`. For `test:unit`, use `--testPathIgnorePatterns=integration.test` (or `**/*.integration.test.ts`) so `*.integration.test.ts` files are excluded.

### Minor suggestions

- Document in `.env.example` that running `scripts/setup-test-db.sh` once is required.
- Add `pg_isready` check before creating DB (like `setup-dev-db.sh`).
- Clarify that `test:integration:db` is run from `packages/voter-import-processor`, so the path to the setup script is `../../scripts/setup-test-db.sh`.
