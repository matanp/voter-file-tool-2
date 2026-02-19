# Code Style & Architecture Patterns

## Executive Summary

This document captures the observed code style conventions and architecture patterns in the codebase. It includes a draft `CLAUDE.md` file content that codifies these patterns for AI-assisted development. The patterns are derived from both the existing `.cursorrules` file and observed practices in the code.

## Observed Conventions

### Naming

| Element                   | Convention                      | Examples                                           |
| ------------------------- | ------------------------------- | -------------------------------------------------- |
| Files -- pages            | `page.tsx` (Next.js convention) | `app/recordsearch/page.tsx`                        |
| Files -- components       | PascalCase                      | `CommitteeSelector.tsx`, `VoterRecordSearch.tsx`   |
| Files -- hooks            | camelCase with `use` prefix     | `useApiMutation.ts`, `useSearchState.ts`           |
| Files -- utilities        | camelCase                       | `searchFieldProcessor.ts`, `compoundFieldUtils.ts` |
| Files -- config/constants | camelCase                       | `fieldsConfig.tsx`, `searchConfiguration.ts`       |
| Files -- docs             | UPPER_SNAKE_CASE.md             | `LOCAL_DEVELOPMENT.md`, `DEPLOYMENT_GUIDE.md`      |
| Variables                 | camelCase                       | `selectedCity`, `legDistrict`                      |
| Constants                 | UPPER_SNAKE_CASE                | `MAX_RECORDS_FOR_EXPORT`, `BUFFER_SIZE`            |
| Types/Interfaces          | PascalCase                      | `VoterRecordAPI`, `SearchQueryField`               |
| Enums (Prisma)            | PascalCase                      | `PrivilegeLevel`, `ReportType`, `JobStatus`        |
| Enum values (Prisma)      | PascalCase                      | `ReadAccess`, `CommitteeReport`                    |
| Event handlers            | `handle` prefix                 | `handleSubmit`, `handleFieldChange`                |
| Boolean state             | `is`/`has`/`show` prefix        | `isLoading`, `hasSearched`, `showAddForm`          |
| React refs                | `Ref` suffix                    | `mutateRef`, `toastRef`, `onChangeRef`             |
| Zod schemas               | `camelCase` + `Schema` suffix   | `voterRecordSchema`, `generateReportSchema`        |
| Inferred Zod types        | PascalCase (no suffix)          | `VoterRecordSchema` -> alias `VoterRecordAPI`      |
| API route files           | `route.ts` (Next.js convention) | `app/api/committee/add/route.ts`                   |
| Test files                | `ComponentName.test.tsx`        | `VoterRecordSearch.test.tsx`                       |
| Package names             | `@voter-file-tool/kebab-case`   | `@voter-file-tool/shared-validators`               |

### Code Style

| Rule                                           | Status              | Notes                                                            |
| ---------------------------------------------- | ------------------- | ---------------------------------------------------------------- | --------------- | ------ | --- | --------------- |
| Strict TypeScript (`strict: true`)             | Enforced            | All packages and apps                                            |
| No `any` types                                 | Enforced (recently) | Report-server had a cleanup pass; a few `as unknown as T` remain |
| Early returns                                  | Followed            | Auth checks, validation, error handling                          |
| Nullish coalescing (`??`) over `               |                     | `                                                                | Mostly followed | Some ` |     | ` usage remains |
| Descriptive variable names                     | Followed            | No single-letter variables outside loops                         |
| `pnpm` only (never npm/yarn)                   | Enforced            | `packageManager` pinned in package.json                          |
| Brief comment at function start                | Partially followed  | Present in shared packages; inconsistent in frontend components  |
| JSDoc only in JS; TypeScript types otherwise   | Followed            | No JSDoc in .ts/.tsx files                                       |
| `TODO:` comments for known issues              | Followed            | Several TODO comments in place                                   |
| Constants over functions when no recomputation | Followed            | `SEARCH_FIELDS`, `DEFAULT_COLUMN_ORDER`, etc.                    |

### Architecture Patterns

#### Server/Client Component Split

```
page.tsx (Server Component)
  -> Fetches data from Prisma
  -> Passes data as props
  -> Applies server-side privilege gating

InteractiveComponent.tsx (Client Component -- "use client")
  -> Receives server data as props
  -> Manages local state
  -> Calls API routes for mutations
```

#### API Route Pattern (Preferred -- `withPrivilege`)

```typescript
import { withPrivilege } from '~/app/api/lib/withPrivilege';
import { validateRequest } from '~/app/api/lib/validateRequest';

export const POST = withPrivilege(
  PrivilegeLevel.Admin,
  async (req, session) => {
    const validation = await validateRequest(req, someZodSchema);
    if (!validation.success) return validation.response;

    // Business logic with validation.data
    return NextResponse.json({ success: true });
  },
);
```

#### Data Fetching Patterns (Preferred Hooks)

Use `useApiQuery` for read-only `GET` requests with loading/error/retry:

```typescript
const { data, loading, error, refetch } = useApiQuery<ResponseType>(
  "/api/admin/terms",
);
```

Use `useApiMutation` for write operations (`POST`/`PUT`/`PATCH`/`DELETE`):

```typescript
const { mutate, loading, error } = useApiMutation<ResponseType, PayloadType>(
  '/api/endpoint',
  'POST',
  { onSuccess: (data) => { ... } }
);
```

`useApiMutation` accepts both JSON payloads and multipart `FormData`.
- JSON payloads: hook sets `Content-Type: application/json`.
- `FormData` payloads: hook intentionally omits `Content-Type` so the browser sets multipart boundaries.

#### Search Field System

Uses discriminated unions with compound field support:

```typescript
type SearchField = BaseSearchField | CompoundSearchField;
// BaseSearchField.type: 'String' | 'Number' | 'Boolean' | 'DateTime' | ...
// CompoundSearchField.type: 'Compound', subFields: BaseSearchField[]
```

#### Report Generation Lifecycle

```
Frontend                    Report-Server                R2
  |                              |                       |
  |-- POST /api/generateReport ->|                       |
  |  (creates Report record,     |                       |
  |   signs & sends to           |                       |
  |   report-server)             |                       |
  |                              |-- Process job          |
  |                              |   (Puppeteer/XLSX)     |
  |                              |-- Upload result ------>|
  |                              |                        |
  |<-- POST /api/reportComplete -|                        |
  |  (HMAC-signed webhook)       |                        |
  |                              |                        |
  |-- Ably push to client        |                        |
  |-- Generate presigned URL ----|----------------------->|
```

#### Privilege Level Hierarchy

```
Developer (0) > Admin (1) > RequestAccess (2) > ReadAccess (3)
hasPermissionFor(userLevel, requiredLevel) -> userIndex <= requiredIndex
```

#### Stale Closure Prevention

`useApiMutation.mutate` has stable identity; it can be used directly in `useEffect` deps. For other unstable callbacks (e.g. `toast` from `useToast`, callbacks from context), use the ref pattern:

```typescript
const toastRef = useRef(toast);
toastRef.current = toast;
// Use toastRef.current inside effects that omit toast from deps
```

### Anti-Patterns Found (Avoid)

1. **Raw `fetch` in components** -- Use `useApiQuery` for `GET` and `useApiMutation` for writes
2. **`as` type casts for request bodies** -- Use Zod validation via `validateRequest`
3. **Manual `auth()` calls in routes** -- Use `withPrivilege` wrapper
4. **Module-level mutable state** -- Pass state as parameters or use class instances
5. **Commented-out code blocks** -- Delete; use git history for recovery
6. **Inline Zod schemas in API routes** -- Define in `shared-validators` for reuse
7. **String literals for enum values** -- Use Prisma enum imports: `PrivilegeLevel.Admin` not `"Admin"`

---

## Draft CLAUDE.md

The following is a draft `CLAUDE.md` to be placed at the repository root. It merges content from `.cursorrules` with observed codebase patterns.

```markdown
# CLAUDE.md

## Project Overview

Voter file management SaaS tool for local government (Monroe County Democratic Committee).
Frontend (Next.js 15) on Vercel, report-server (Express + Puppeteer) on AWS Lightsail,
Cloudflare R2 for file storage, Ably for realtime, PostgreSQL via Prisma.

## Monorepo Structure

- `apps/frontend` -- Next.js 15 App Router, React 19, Tailwind + shadcn/ui
- `apps/report-server` -- Express server for PDF/XLSX report generation
- `packages/shared-prisma` -- Re-exports Prisma types from single schema source
- `packages/shared-validators` -- Zod schemas shared between frontend and report-server
- `packages/voter-import-processor` -- BOE voter file CSV import pipeline
- `packages/xlsx-tester` -- Dev utility for XLSX inspection

## Commands

- `pnpm install` -- Install all workspace dependencies
- `pnpm run build:packages` -- Build all shared packages (required before first run)
- `pnpm --filter voter-file-tool dev` -- Run frontend dev server
- `pnpm --filter node-pdf-generation dev` -- Run report-server dev server
- `pnpm --filter voter-file-tool test` -- Run frontend tests
- `pnpm --filter voter-file-tool db_migrate` -- Run Prisma migrations
- `pnpm --filter voter-file-tool db_push` -- Push schema changes (dev only)

## Code Style

### Mindset

- Prefer simplicity and readability. Maintainability > cleverness.
- Prefer minimal, targeted changes. Don't refactor unrelated code.
- Strict type safety: never use `any`. Use `unknown` + type guards if needed.
- Reuse existing helpers, utilities, and types before creating new ones.

### TypeScript

- Early returns over deep nesting
- Nullish coalescing (`??`) over `||` for default values
- Descriptive names. Prefix event handlers with `handle*`.
- Constants (`UPPER_SNAKE_CASE`) instead of functions when no recomputation needed
- No JSDoc in TypeScript files -- rely on type annotations
- Use Prisma enum imports (`PrivilegeLevel.Admin`) not string literals (`"Admin"`)

### React

- Server Components for data fetching; Client Components for interaction
- `useApiMutation` hook for all client-side API calls (not raw `fetch`)
- `useRef` pattern for stale closure prevention in callbacks
- `startTransition(() => router.refresh())` after mutations to revalidate server data
- shadcn/ui primitives for all UI components

### API Routes

- Always use `withPrivilege(level, handler)` for auth (never raw `auth()` calls)
- Always use `validateRequest(req, zodSchema)` for input validation
- Define Zod schemas in `packages/shared-validators`, not inline in routes
- Return appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 422, 500)

### Testing

- Jest + React Testing Library + @testing-library/user-event
- Test files: `__tests__/` directory mirroring `src/` structure
- Use `renderWithVoterSearchProvider` for components needing search context
- Mock Prisma: `jest.mock('~/lib/prisma')`
- Test auth enforcement: verify 401/403 for unauthenticated/unauthorized requests

### Packages

- Always use `pnpm`, never `npm` or `yarn`
- Build shared packages before running apps: `pnpm run build:packages`
- New validators go in `packages/shared-validators/src/schemas/`
- New shared types go through the Prisma schema (single source of truth)

## Architecture Decisions

### Auth Pattern

4 privilege levels: Developer > Admin > RequestAccess > ReadAccess.
`withPrivilege` HOC checks session + privilege level. `hasPermissionFor` uses
ordered array index comparison. PrivilegedUser table handles out-of-band grants.
Invite system for new user onboarding.

### Report Generation

Async queue: Frontend POSTs to report-server, gets immediate acknowledgment.
Report-server processes job (Puppeteer for PDF, xlsx for XLSX), uploads to R2,
calls back frontend via HMAC-signed webhook. Frontend publishes to Ably for
realtime UI updates.

### Voter Import

BOE CSV -> R2 upload -> report-server streams from R2 -> batch parse (5000 rows)
-> upsert to VoterRecord + VoterRecordArchive -> update DropdownLists.
Record freshness determined by year + entryNumber comparison.

### Data Model

Single Prisma schema at `apps/frontend/prisma/schema.prisma`.
Types re-exported via `packages/shared-prisma`.
API serialization: Prisma DateTime -> ISO string via `convertPrismaVoterRecordToAPI()`.

## Key Files

- `apps/frontend/src/auth.ts` -- NextAuth config, privilege sync
- `apps/frontend/src/app/api/lib/withPrivilege.ts` -- Auth HOC for API routes
- `apps/frontend/src/app/api/lib/validateRequest.ts` -- Zod validation helper
- `apps/frontend/src/hooks/useApiMutation.ts` -- Client-side data fetching hook
- `apps/frontend/src/lib/searchConfiguration.ts` -- Search system config
- `apps/frontend/prisma/schema.prisma` -- Database schema (source of truth)
- `packages/shared-validators/src/schemas/report.ts` -- Report type schemas
- `apps/report-server/src/index.ts` -- Report server entry point + job queue

## Gotchas

- `CommitteeRequest.committeList` is a typo (missing 't') baked into the DB schema
- `DropdownLists.electionDistrict` is `String[]` but `VoterRecord.electionDistrict` is `Int?`
- Report-server React version (18) differs from frontend (19) -- render differences possible
- `prestart` rebuilds all packages on every PM2 restart -- slows crash recovery
- The frontend package name in package.json is `voter-file-tool`, report-server is `node-pdf-generation`

## Documentation

- `docs/LOCAL_DEVELOPMENT.md` -- Local dev setup
- `docs/CODEBASE_AUDIT/` -- Comprehensive codebase audit (this analysis)
- `infrastructure/DEPLOYMENT_SETUP.md` -- Production deployment
- `scripts/README.md` -- Database setup scripts
```

---

## Recommendations for .cursorrules

The existing `.cursorrules` file is a good starting point but is generic. If continuing to use Cursor alongside Claude Code, the `.cursorrules` should be updated to match the `CLAUDE.md` content above, specifically adding:

1. **Project-specific commands** (pnpm filters, test commands)
2. **Architecture patterns** (withPrivilege, useApiMutation, Server/Client split)
3. **File location conventions** (where to put new schemas, components, etc.)
4. **Known gotchas** (typos, type mismatches)
5. **Remove the "Plan Documents in AI_PLAN_DOCS/" rule** -- audit documents now go in `docs/`

The `.cursorrules` "Persona" section ("Senior full-stack 10x developer") is fine to keep for Cursor. `CLAUDE.md` does not need a persona.

## Recommended Skills (Claude Code)

Based on the codebase patterns, these custom skills would be useful:

### `/add-api-route`

Scaffold a new API route with `withPrivilege`, `validateRequest`, proper error handling, and a corresponding Zod schema in shared-validators. Prompts for: route path, HTTP method, privilege level, request schema fields.

### `/add-report-type`

Scaffold a new report type: Zod schema variant in shared-validators, processor in report-server, form component in frontend. Follows the existing discriminated union pattern.

### `/add-search-field`

Add a new searchable field: update `SEARCH_FIELDS`, `FIELD_CONFIG`, `searchableFieldEnum`, `fieldsConfig.tsx`, and create appropriate UI component.

### `/check-auth`

Audit all API routes for missing authentication. Grep for route exports without `withPrivilege` wrapper.
