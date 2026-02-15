# Documentation-Code Alignment Audit

## Executive Summary

Analysis of gaps between existing documentation and the actual codebase. The project has documentation spread across `docs/`, root-level markdown files, `infrastructure/`, `scripts/README.md`, and `AI_PLAN_DOCS/` (gitignored). Overall, the documentation is focused on deployment and local dev setup, with significant gaps in architecture, API, and operational documentation.

Note: The four untracked SRS documents in `docs/SRS/` are WIP and excluded from this analysis.

**Update (Feb 2025):** Several findings were addressed: `README.md` expanded, `DEPLOYMENT_GUIDE.md` and `DEPLOYMENT_SETUP.md` updated with Terraform flow and placeholders, `SSL_OPTIONS.md` Freenom reference removed, `SHARED_PRISMA_ARCHITECTURE.md` moved to `docs/`, `QUICK_FIX_ON_SERVER.md` deleted.

---

## Documentation Inventory

| Document                        | Location        | Status                                                                          |
| ------------------------------- | --------------- | ------------------------------------------------------------------------------- |
| `README.md`                     | Root            | Current -- product description, tech stack, monorepo structure                  |
| `LOCAL_DEVELOPMENT.md`          | docs/           | Current, accurate                                                               |
| `DEPLOYMENT_GUIDE.md`           | Root            | Current -- primary path (Terraform) + manual deployment section                 |
| `SHARED_PRISMA_ARCHITECTURE.md` | docs/           | Current                                                                         |
| `USER_TESTING_FEEDBACK.md`      | Root            | Historical reference                                                            |
| `TODO.md`                       | Root            | Partially stale                                                                 |
| `ARCHITECTURE_DECISION.md`      | infrastructure/ | Current                                                                         |
| `DEPLOYMENT_SETUP.md`           | infrastructure/ | Current -- placeholders, certbot automation, WEBHOOK_SECRET, terraform:recreate |
| `SSL_OPTIONS.md`                | infrastructure/ | Current -- Freenom removed                                                      |
| `scripts/README.md`             | scripts/        | Current, thorough                                                               |
| `AI_PLAN_DOCS/AI_README.md`     | AI_PLAN_DOCS/   | Gitignored                                                                      |

---

## Findings

### P0 -- Critical Misalignment

#### 1. No API Documentation Exists

There is no documentation of the API routes, their expected inputs/outputs, authentication requirements, or error responses. The codebase has 20+ API routes, many with complex validation schemas. A new developer (or anyone debugging the report-server integration) would need to read every route handler to understand the API surface.

**What exists in code but is undocumented:**

- 20+ API routes with Zod schemas defining request/response shapes
- `withPrivilege` authorization system with 4 privilege levels
- Webhook callback protocol between frontend and report-server (HMAC signing, payload format)
- Presigned URL flow for R2 uploads (two-step: get URL, then PUT directly to R2)
- Report generation request/callback lifecycle
- Ably realtime channel naming convention (`report-status-{jobId}`)

**Recommendation:** Create `docs/API_REFERENCE.md` documenting all routes, methods, auth requirements, request/response schemas, and error codes.

#### 2. No Architecture Overview Document

There is no single document that describes:

- The overall system architecture (frontend + report-server + R2 + Ably + Postgres)
- How the services communicate (HTTP with HMAC-signed payloads, webhooks, Ably push)
- The data flow for key operations (report generation, voter import, committee management)
- The deployment topology (Vercel + Lightsail + Cloudflare R2 + Neon Postgres)
- The auth/privilege model and its implementation

`AI_PLAN_DOCS/` has some architecture analysis but it's gitignored and is AI-generated planning material, not authoritative documentation.

**Recommendation:** Create `docs/ARCHITECTURE.md` with system diagram, service descriptions, communication protocols, and deployment topology.

### P1 -- High Priority Misalignment

#### 3. `DEPLOYMENT_GUIDE.md` -- ~~Partially Outdated~~ Resolved

~~The root `DEPLOYMENT_GUIDE.md` documents the problem...~~ **Resolved.** Now has primary path (Terraform + `00-setup-all.sh`), correct build order, and manual deployment section. CI/CD section reframed as "Future consideration."

#### 4. `DEPLOYMENT_SETUP.md` -- ~~Gaps vs Reality~~ Resolved

~~`infrastructure/DEPLOYMENT_SETUP.md` has several misalignments...~~ **Resolved.** Updated with certbot automation, placeholders for domain/IP/email/user, WEBHOOK_SECRET requirement, and `terraform:recreate` script.

#### 5. `QUICK_FIX_ON_SERVER.md` -- ~~Hardcoded Values~~ Removed

File deleted. Manual fixes were redundant with automated scripts and had hardcoded values; removed from codebase.

#### 6. No Documentation of the Privilege/Role System

The application has a 4-level privilege system (`Developer > Admin > RequestAccess > ReadAccess`) with:

- `PrivilegedUser` table for out-of-band privilege grants
- Invite system for onboarding new users
- Automatic privilege sync on sign-in (upgrade from PrivilegedUser, downgrade if removed)
- Developer "act-as" mode for testing lower privilege levels
- Different UI visibility and data access per level
- Server-side PII gating (committees page query differs by privilege)

None of this is documented anywhere. A new developer or admin would need to read `auth.ts`, `withPrivilege.ts`, `GlobalContext.tsx`, and multiple page components to understand the system.

**Recommendation:** Document in `docs/ARCHITECTURE.md` or a dedicated `docs/AUTH_AND_PRIVILEGES.md`.

### P2 -- Medium Priority Misalignment

#### 7. `README.md` -- ~~Minimal~~ Resolved

~~The root README is 7 lines...~~ **Resolved.** Now includes product description, tech stack, monorepo structure, doc links, and contributing section.

#### 8. `SSL_OPTIONS.md` -- ~~Stale Reference~~ Resolved

~~References Freenom...~~ **Resolved.** Freenom removed from "Getting a Free Domain" list.

#### 9. `TODO.md` -- Staleness Unknown

Contains feature TODOs (petition tracking, walk lists, UI bugs). It's unclear which items have been completed, which are superseded by the SRS, and which are still relevant.

**Recommendation:** Review against current codebase and SRS. Archive completed items. Mark SRS-superseded items.

#### 10. No Documentation of Report Types

The system supports 5 report types (`ldCommittees`, `voterList`, `designatedPetition`, `absenteeReport`, `voterImport`), each with different input schemas, output formats (PDF/XLSX/TXT), and processing pipelines. None are documented.

**Recommendation:** Document report types, their inputs, outputs, and the generation lifecycle (request -> queue -> process -> upload -> callback -> download).

#### 11. No Documentation of Voter Import Pipeline

The voter import pipeline (BOE CSV -> R2 upload -> report-server -> stream parse -> batch upsert -> dropdown list update) is complex and undocumented. The pipeline has specific requirements:

- CSV format matching BOE voter file structure
- Year + recordEntryNumber semantics for versioning
- Record freshness comparison logic
- Dropdown list extraction and caching

**Recommendation:** Document the import pipeline, expected CSV format, and the record update logic.

#### 12. `next.config.js` Has Unresolved TODO

Line 14: `// :OHNO: look into this` regarding `output: "standalone"`. The frontend is deployed on Vercel where standalone mode is unnecessary and adds build overhead. This suggests uncertainty about the build configuration that should be resolved and documented.

### P3 -- Low Priority

#### 13. Root-Level Docs Are Scattered

Documentation lives in 4 locations: `docs/`, root, `infrastructure/`, `scripts/`. There's no clear organizational principle. Some docs are operational (deployment), some are architectural (shared-prisma), some are historical (user testing feedback).

**Recommendation:** Consolidate into `docs/` with subdirectories: `docs/deployment/`, `docs/architecture/`, `docs/development/`.

#### 14. `SHARED_PRISMA_ARCHITECTURE.md` -- ~~Accurate but Misplaced~~ Resolved

**Resolved.** Moved to `docs/SHARED_PRISMA_ARCHITECTURE.md`.

#### 15. No Changelog or Release Notes

No `CHANGELOG.md` or release tagging. For a SaaS product, tracking what changed between deployments is important for debugging and communicating changes to stakeholders.

#### 16. No Runbook for Common Operations

There's no documentation for:

- How to deploy a code change to production (end-to-end)
- How to rotate secrets (which services need which rotated values)
- How to add a new admin user (PrivilegedUser table or invite system)
- How to import a voter file (end-to-end user workflow)
- How to troubleshoot failed reports
- Database backup/restore procedures

**Recommendation:** Create an `OPERATIONS_RUNBOOK.md` for common admin and ops tasks.

---

## What's Well-Documented

| Area                    | Document                             | Quality                                                                |
| ----------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| Project entry point     | `README.md`                          | Good -- product description, tech stack, monorepo structure, doc links |
| Local development setup | `docs/LOCAL_DEVELOPMENT.md`          | Excellent -- step-by-step, covers DB + R2 + report-server + frontend   |
| Database setup scripts  | `scripts/README.md`                  | Excellent -- Docker setup, migrations, seeding, privilege system       |
| Shared Prisma pattern   | `docs/SHARED_PRISMA_ARCHITECTURE.md` | Good -- explains the re-export pattern and why                         |
| SSL options             | `infrastructure/SSL_OPTIONS.md`      | Good -- three modes clearly documented                                 |
| .env.example files      | Both apps                            | Good -- clear placeholder format with section comments                 |

## What's Missing Entirely

| Topic                      | Impact                                                 | Priority |
| -------------------------- | ------------------------------------------------------ | -------- |
| API reference              | New devs can't understand the API without reading code | P0       |
| Architecture overview      | No high-level understanding of system design           | P0       |
| Auth/privilege system      | No understanding of access control model               | P1       |
| Report types and lifecycle | No understanding of core product feature               | P2       |
| Voter import pipeline      | No understanding of data ingestion                     | P2       |
| Operations runbook         | No guidance for production operations                  | P2       |
| Contributing guide         | Friction for new developers                            | P3       |
| Changelog                  | No deployment history tracking                         | P3       |
