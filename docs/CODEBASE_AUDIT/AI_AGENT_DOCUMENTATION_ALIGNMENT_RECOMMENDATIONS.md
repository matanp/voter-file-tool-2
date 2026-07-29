# AI-Agent Documentation Alignment Recommendations

**Date:** 2026-02-19  
**Scope:** Documentation review excluding `docs/SRS/`  
**Goal:** Align docs with current code reality and reduce ambiguity for AI agents making code changes.

## Executive Summary

The repo has strong depth of documentation, but it is not optimized for AI-agent execution. The biggest issue is not missing volume, it is mixed authority: current runbooks, historical audits, forward-looking plans, and branch-specific notes are interleaved without clear status. This increases the risk of agents following stale guidance.

The highest-value change is to introduce a small authoritative documentation spine for agents, then explicitly mark everything else as either historical, planned, or branch-specific.

## Current Reality Snapshot (Code)

- Monorepo with 2 apps and 4 packages (`apps/*`, `packages/*`)
- Frontend API surface: 28 route handlers under `apps/frontend/src/app/api/**/route.ts`
- Frontend tests: 19 API route test files under `apps/frontend/src/__tests__/api`
- Report-server tests: 1 test file (`apps/report-server/src/__tests__/webhookUtils.test.ts`)
- Prisma migrations present: 47 migration SQL files under `apps/frontend/prisma/migrations/*/migration.sql`

## Confirmed Documentation Drift

### P0 - High-Risk Drift for Agents

1. `scripts/README.md` documents paths/commands that do not currently exist.
   - References `apps/frontend/scripts/` and `seedLtedCrosswalk.ts` (`scripts/README.md:12`), but that directory/file is absent.
   - Documents `pnpm db:seed-lted-crosswalk` (`scripts/README.md:21`, `scripts/README.md:31`), but `apps/frontend/package.json` has no `db:seed-lted-crosswalk` script.

2. `apps/frontend/README.md` is not a frontend readme; it is an old checklist (`apps/frontend/README.md:1-10`).
   - This is likely to mislead agents scanning package-level docs first.

3. AI-targeted readmes are stale and partially incorrect.
   - `apps/frontend/AI_README.md` includes a broken shadcn URL (`apps/frontend/AI_README.md:14`) and outdated feature framing.
   - `apps/report-server/AI_README.md` describes report-server as mostly petition/PDF-only (`apps/report-server/AI_README.md:7-27`), while code handles committee/voter list XLSX, absentee processing, and voter import jobs.

### P1 - Ambiguity from Branch-Specific or Historical Docs

4. Audit/remediation docs reference files that are not in the current tree.
   - Example references in `docs/CODEBASE_AUDIT/FINDINGS_REMEDIATION_LOG.md` include missing paths like:
     - `apps/frontend/scripts/seedLtedCrosswalk.ts` (`:63`)
     - `apps/frontend/src/app/admin/data/AbsenteeReport.tsx` (`:93`)
     - `apps/frontend/src/app/admin/data/WeightedTableImport.tsx` (`:113`)
     - `apps/frontend/src/app/admin/terms/TermsManagement.tsx` (`:123`)
   - `docs/SRS/FINDINGS_AND_RESOLUTION_REGISTER.md` has the same pattern (many "if this exists in your branch" notes).
   - These docs are valuable, but need clear "branch/historical" labeling to prevent misuse.

5. Some docs reference outdated filenames.
   - `next.config.js` is cited in multiple audit docs (for example `docs/CODEBASE_AUDIT/DOCUMENTATION_CODE_ALIGNMENT.md:126`, `docs/CODEBASE_AUDIT/ESLINT_BUILD_ERRORS.md:17`), but the file is now `apps/frontend/next.config.ts`.

### P2 - Structural Gaps for Agent Workflows

6. No single authoritative "start here for agents" document.
7. No generated API/auth matrix from code, so route/auth understanding requires manual source traversal.
8. No explicit "doc status taxonomy" (authoritative vs planned vs historical vs branch-specific).

## Recommendations

### 1) Create an Authoritative Agent Doc Spine (P0)

Add these docs and treat them as source-of-truth:

- `AGENTS.md` (repo root): concise execution rules for AI/code agents
- `docs/AGENT_START_HERE.md`: architecture map + fastest safe workflow
- `docs/reference/API_ROUTE_INDEX.md`: generated route/method/auth wrapper map
- `docs/reference/COMMAND_REFERENCE.md`: runnable commands validated against package scripts
- `docs/reference/DATA_MODEL_INVARIANTS.md`: known constraints and gotchas (Prisma + domain rules)

### 2) Add Doc Status Metadata + Registry (P0)

Add frontmatter to non-trivial docs:

- `doc_status`: `authoritative | generated | planned | historical | branch-specific`
- `last_verified`: date
- `verified_against`: commit SHA
- `owner`: team/person

Add `docs/DOCS_INDEX.md` with:

- canonical reading order for agents
- which docs are safe to act on directly
- which docs are context-only

### 3) Normalize or Archive Stale Agent-Facing Docs (P0)

- Replace content of `apps/frontend/README.md` with an accurate package readme.
- Either rewrite or archive:
  - `apps/frontend/AI_README.md`
  - `apps/report-server/AI_README.md`
- Move branch-dependent audit logs to `docs/archive/` or mark them `doc_status: branch-specific` at top.

### 4) Make API/Auth Documentation Generated (P1)

Create a small script (for example `scripts/generate-api-docs.mjs`) that scans `apps/frontend/src/app/api/**/route.ts` and emits:

- route path
- HTTP methods
- auth wrapper used (`withPrivilege`, `withBackendCheck`, `withPublic`)
- required privilege (if applicable)
- test file coverage link (if present)

This prevents drift in exactly the area agents modify most.

### 5) Add Documentation CI Checks (P1)

Add non-blocking then blocking checks:

- broken markdown links
- referenced local paths that do not exist (for doc paths only)
- documented `pnpm` commands that do not resolve to scripts
- required frontmatter fields for docs under `docs/reference/` and `docs/runbooks/`

### 6) Keep CODEBASE_AUDIT Useful but Explicitly Time-Bound (P2)

Do not remove audit docs; instead:

- prepend "snapshot date + validity statement"
- link to current canonical docs
- move resolved one-off findings to archive or a short changelog section

## Proposed Rollout

1. **Phase 1 (immediate):** Add doc taxonomy, `DOCS_INDEX`, and replace stale package/AI readmes.
2. **Phase 2:** Add generated API route index and command reference.
3. **Phase 3:** Add doc CI checks and archive/label branch-specific historical docs.

## Definition of Done

- Agents can answer "how do I run X safely?" from one canonical doc path.
- Agents can identify API auth requirements without manual route-by-route inspection.
- No P0 stale docs remain in package-level entrypoints.
- Every major doc is status-labeled with verification metadata.
