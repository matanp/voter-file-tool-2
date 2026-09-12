# Whole-App Architecture & Maintainability Review

## Basis
- **Branch:** `feat/srs-implementation` · **Commit:** `8af14b4` · **Date:** 2026-07-07 · **Model:** `gpt-5-codex`
- **Deliverable:** `docs/WHOLE_APP_ARCHITECTURE_REVIEW_gpt-5-codex_2026-07-07.md`
- **Product files:** 352 · **checksum:** `25968f518b91be47d9f8fc3e2fc57735aa79bf4783b31339866bdd20f27610e2` · **algorithm:** sha256
- **Inventory:** Appendix A product-code manifest command from `docs/review/WHOLE_APP_ARCHITECTURE_REVIEW_METHODOLOGY.md`, run from repo root.
- **Axis:** DRY / consistency / maintainability / extensibility

## At a glance
| # | Finding | Severity | Blast | Opportunity |
|---|---------|----------|-------|-------------|
| 1 | Scoped report types still require parallel edits | High | large | Register more behavior per report |
| 2 | Membership lifecycle rules have multiple owners | High | large | Centralize lifecycle transitions |
| 3 | Route validation and response contracts drift | Medium | large | Standardize route contracts |
| 4 | Report list/status read models are split | Medium | medium | Share report status/read contracts |
| 5 | Admin CRUD resource patterns repeat locally | Medium | medium | Extract reference-data resource shape |
| 6 | Upload policy has two reusable UIs but duplicated server policy | Medium | medium | Centralize upload policy metadata |
| 7 | Search field metadata is split across frontend and shared validators | Medium | medium | Share field descriptors |
| 8 | Discrepancy field ownership is split between API and UI | Low | small | Move field metadata together |
| 9 | Package ownership around Prisma remains uneven | Low | medium | Clarify package import boundary |
| B1 | Migration-only partial indexes | Backlog | medium | Revisit with Prisma support |
| B2 | Legacy committee membership model overlap | Backlog | medium | Finish deferred model retirement |
| B3 | Orphan report-server component root | Backlog | small | Remove after import check |

**Counts:** 9 findings · 3 backlog-only notes · 1 escalation

## Subsystem map
- **Auth, invites, users, role-gated UI:** high depth. Entry points include `apps/frontend/src/auth.ts`, `apps/frontend/src/app/api/lib/withPrivilege.ts`, `apps/frontend/src/components/providers/GlobalContext.tsx`, `apps/frontend/src/components/ui/authcheck.tsx`, `apps/frontend/src/app/admin/users/page.tsx`, and invite helpers under `apps/frontend/src/lib/invites/`.
- **API route infrastructure:** high depth. Route wrappers and validation live in `apps/frontend/src/app/api/lib/withPrivilege.ts` and `apps/frontend/src/app/api/lib/validateRequest.ts`; route families under `apps/frontend/src/app/api/` vary in local parsing, envelope shape, and query validation.
- **Committee membership core:** high depth. Mutations run through `apps/frontend/src/app/api/committee/add/route.ts`, `apps/frontend/src/app/api/committee/requestAdd/route.ts`, `apps/frontend/src/app/api/committee/handleRequest/route.ts`, `apps/frontend/src/app/api/committee/remove/route.ts`, `apps/frontend/src/app/api/lib/membershipConfirmation.ts`, and `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts`.
- **Reports UI, jobs, and report server:** high depth. Shared report schemas and registries live in `packages/shared-validators/src/schemas/report.ts`, `packages/shared-validators/src/reportTypeMapping.ts`, and `packages/shared-validators/src/scopeReportRegistry.ts`; UI surfaces live under `apps/frontend/src/components/reports/`; worker dispatch is in `apps/report-server/src/index.ts`.
- **Upload/import and discrepancy flows:** medium depth. Presigned uploads use `apps/frontend/src/hooks/useFileUpload.ts` and `apps/frontend/src/components/admin/PresignedUploadReportForm.tsx`; multipart XLSX imports use `apps/frontend/src/components/admin/XlsxUploadCard.tsx`; discrepancy flows span `apps/frontend/src/app/api/lib/utils.ts`, `apps/frontend/src/app/admin/data/CommitteeUploadDiscrepancies.tsx`, and discrepancy routes.
- **Admin reference data:** medium depth. Terms, election dates, office names, crosswalk, meetings, governance config, eligibility flags, and audit screens use a mixture of route-local schemas and shared hooks.
- **Voter search and query processing:** medium depth. UI field state is concentrated in `apps/frontend/src/lib/searchFieldProcessor.ts`, `apps/frontend/src/lib/searchConfiguration.ts`, and `apps/frontend/src/lib/constants/searchFields.ts`; API query building is in `packages/shared-validators/src/searchQueryUtils.ts`.
- **Shared packages and Prisma model:** high depth. Prisma-shaped helpers live in `packages/shared-prisma/src/index.ts`; validators and registries live in `packages/shared-validators/src/index.ts`; schema invariants are in `apps/frontend/prisma/schema.prisma`.

## Findings

### 1. Scoped report types still require parallel edits
**Severity: High · Blast radius: large**

**What & where.** Scoped report metadata has a core registry in `packages/shared-validators/src/scopeReportRegistry.ts`, but adding or changing a report still fans out through schema variants in `packages/shared-validators/src/schemas/report.ts`, UI metadata in `apps/frontend/src/components/reports/scopeReportUiRegistry.ts`, form copy in `apps/frontend/src/components/reports/scopeReportFormSpecs.ts`, type-specific state and payload switches in `apps/frontend/src/components/reports/ScopedReportForm.tsx`, grid ordering in `apps/frontend/src/components/reports/GenerateReportGrid.tsx`, and worker dispatch in `apps/report-server/src/index.ts`.

**Why it hurts.** The registry reduces one class of drift, but report behavior still has several independent owners; a new scoped report can compile while missing worker behavior, form-specific validation, route exposure, or UI ordering.

**Opportunity.** Let each report register more of its own UI, payload, and worker behavior.

**Evidence.** The report skill’s scoped checklist matched the scan hits for `SCOPE_REPORT_REGISTRY`, `generateReportVariants`, `SCOPE_REPORT_UI_ORDER`, `SCOPE_REPORT_FORM_MESSAGES`, `ScopedReportForm` switch cases, and `jobData.type` branches.

### 2. Membership lifecycle rules have multiple owners
**Severity: High · Blast radius: large**

**What & where.** `apps/frontend/src/app/api/lib/membershipConfirmation.ts` centralizes SUBMITTED confirmation/rejection, but direct add, request add, remove/resign, admin decision handling, and petition outcomes still implement status transitions, eligibility-warning snapshots, seat assignment/clearing, P2002 handling, and audit metadata in `apps/frontend/src/app/api/committee/add/route.ts`, `apps/frontend/src/app/api/committee/requestAdd/route.ts`, `apps/frontend/src/app/api/committee/handleRequest/route.ts`, `apps/frontend/src/app/api/committee/remove/route.ts`, and `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts`.

**Why it hurts.** `MembershipStatus` is the core domain state machine, but its transitions are expressed as route-level code paths; later changes to audit shape, warning persistence, replacement behavior, or active-seat invariants require shotgun edits and invite drift.

**Opportunity.** Give committee membership transitions a single service-level owner.

**Evidence.** `MembershipStatus` and membership uniqueness live in `apps/frontend/prisma/schema.prisma`; scans found repeated `validateEligibility`, `eligibilityWarnings`, `logAuditEventOrThrow`, `status`, `seatNumber`, `$transaction`, and active-membership conflict handling across the mutation routes.

### 3. Route validation and response contracts drift
**Severity: Medium · Blast radius: large**

**What & where.** `apps/frontend/src/app/api/lib/validateRequest.ts` exists, and shared response schemas exist in `packages/shared-validators/src/schemas/api.ts`, but routes use several incompatible patterns: `apps/frontend/src/app/api/generateReport/route.ts` performs local `safeParse` with `{ error, issues }`; `apps/frontend/src/app/api/reports/[id]/route.ts` uses a route-local Zod schema plus `parse`; `apps/frontend/src/app/api/admin/electionDates/route.ts` catches all parse errors as `{ error: "Invalid input" }`; `apps/frontend/src/app/api/admin/officeNames/route.ts` returns flattened issues; upload routes such as `apps/frontend/src/app/api/getCsvUploadUrl/route.ts` and `apps/frontend/src/app/api/getVoterFileUploadUrl/route.ts` cast JSON bodies to local interfaces.

**Why it hurts.** Client hooks have to infer `error`, `message`, `issues`, `success`, and status-code semantics route by route; adding new endpoints means copying local JSON parsing and inventing another invalid-input envelope.

**Opportunity.** Standardize request parsing and JSON envelopes at the route boundary.

**Evidence.** `.review/scan_validation.txt`, `.review/scan_parse_casts_params.txt`, and `.review/scan_messages_envelopes.txt` showed the mix of `validateRequest`, local `z.object`, `safeParse`, `parse`, `request.json`, TypeScript casts, `{ error }`, `{ message }`, and `{ success }`.

### 4. Report list/status read models are split
**Severity: Medium · Blast radius: medium**

**What & where.** The reports dashboard initially queries pending jobs in `apps/frontend/src/app/reports/page.tsx`, live job polling reads `apps/frontend/src/app/api/reportJobs/route.ts`, report browsing reads `apps/frontend/src/app/api/reports/route.ts`, individual report mutation lives in `apps/frontend/src/app/api/reports/[id]/route.ts`, and completion state arrives through `apps/frontend/src/app/api/reportComplete/route.ts`.

**Why it hurts.** Report visibility, deletion, status inclusion, pagination, and presigned URL enrichment are split by caller rather than by a shared report read model, so changes to how reports are shown or hidden have to be reconciled across dashboard, list, job tracker, and webhook completion paths.

**Opportunity.** Share report read/status contracts across pages and APIs.

**Evidence.** The report scans show repeated `JobStatus`, `generatedById`, `deleted`, pagination, and status-filter logic across the report list/job routes and the dashboard Server Component.

### 5. Admin CRUD resource patterns repeat locally
**Severity: Medium · Blast radius: medium**

**What & where.** Reference-data routes such as `apps/frontend/src/app/api/admin/electionDates/route.ts`, `apps/frontend/src/app/api/admin/officeNames/route.ts`, and `apps/frontend/src/app/api/admin/terms/route.ts` each define local create schemas, duplicate existence checks, map uniqueness/P2002 differently, and return different success/error shapes; the corresponding UI screens in `apps/frontend/src/app/admin/dashboard/ElectionDates.tsx`, `apps/frontend/src/app/admin/dashboard/ElectionOffices.tsx`, and `apps/frontend/src/app/admin/terms/TermsManagement.tsx` each own their own mutation/toast shape.

**Why it hurts.** These are the same product workflow with different nouns. Every new small admin resource is likely to copy a route, tweak error handling, and drift from the others.

**Opportunity.** Extract the common reference-data CRUD contract.

**Evidence.** The validation and Prisma write scans showed repeated `findFirst`/`findUnique` before `create`, local Zod schemas, P2002 branches, and route-specific envelopes in the admin reference-data family.

### 6. Upload policy has two reusable UIs but duplicated server policy
**Severity: Medium · Blast radius: medium**

**What & where.** The frontend has reusable upload surfaces in `apps/frontend/src/hooks/useFileUpload.ts`, `apps/frontend/src/components/admin/PresignedUploadReportForm.tsx`, and `apps/frontend/src/components/admin/XlsxUploadCard.tsx`; server upload policy is still duplicated across `apps/frontend/src/app/api/getCsvUploadUrl/route.ts`, `apps/frontend/src/app/api/getVoterFileUploadUrl/route.ts`, `apps/frontend/src/app/api/admin/crosswalk/import/route.ts`, and `apps/frontend/src/app/api/admin/weightedTable/import/route.ts`.

**Why it hurts.** File size, extension, content type, storage prefix, and user-facing errors are policy decisions, but they are encoded per endpoint; upload changes require comparing route bodies instead of changing a descriptor.

**Opportunity.** Centralize upload policy metadata by upload kind.

**Evidence.** `.review/scan_uploads_files.txt` grouped presigned upload routes, multipart XLSX imports, shared upload UI, and file parsing helpers; the two presign routes in particular share the same request shape and flow with different constants.

### 7. Search field metadata is split across frontend and shared validators
**Severity: Medium · Blast radius: medium**

**What & where.** Field UI descriptors live in `apps/frontend/src/lib/constants/searchFields.ts`, display/behavior constants live in `apps/frontend/src/lib/searchConfiguration.ts`, client conversion lives in `apps/frontend/src/lib/searchFieldProcessor.ts`, Zod query shapes live in `packages/shared-validators/src/schemas/report.ts`, field lists live in `packages/shared-validators/src/constants.ts`, and Prisma where construction lives in `packages/shared-validators/src/searchQueryUtils.ts`.

**Why it hurts.** Adding or changing a search field requires keeping frontend display metadata, client normalization, schema membership, and backend query behavior aligned by hand.

**Opportunity.** Share field descriptors that drive UI, validation, and query building.

**Evidence.** The search scan connected `SEARCH_FIELDS`, `FIELD_CONFIG`, `SearchFieldProcessor`, `searchQueryFieldSchema`, `NUMBER_FIELDS`, `STRING_FIELDS`, `DATE_FIELDS`, `COMPUTED_BOOLEAN_FIELDS`, and `buildPrismaWhereClause`.

### 8. Discrepancy field ownership is split between API and UI
**Severity: Low · Blast radius: small**

**What & where.** Discrepancy detection uses `DISCREPENCY_FIELDS` in `apps/frontend/src/app/api/lib/utils.ts`, while display naming/grouping uses a separate `discrepanciesPrintMap` and grouping function in `apps/frontend/src/app/admin/data/CommitteeUploadDiscrepancies.tsx`; resolution payload validation lives separately in `packages/shared-validators/src/schemas/committeeDiscrepancy.ts`.

**Why it hurts.** A new discrepancy field can be detected without a matching display label or grouped UI behavior, and the typo in the constant name hints that this is not treated as a shared domain descriptor.

**Opportunity.** Co-locate discrepancy field metadata with detection and resolution schemas.

**Evidence.** Lane D compared the API discrepancy helper, admin discrepancy component, and shared discrepancy schemas.

### 9. Package ownership around Prisma remains uneven
**Severity: Low · Blast radius: medium**

**What & where.** `packages/shared-prisma/src/index.ts` re-exports Prisma types and shared domain helpers, and `packages/shared-validators/src/index.ts` consumes that boundary for report/search types; `packages/voter-import-processor/src/types.ts`, `packages/voter-import-processor/src/parseVoterFile.ts`, `packages/voter-import-processor/src/voterRecordProcessor.ts`, and `apps/report-server/src/lib/prisma.ts` still import generated Prisma client types or clients directly.

**Why it hurts.** Shared packages have two possible answers for “where do Prisma-shaped types come from,” which weakens package ownership and makes build/package boundaries harder to reason about.

**Opportunity.** Clarify whether `shared-prisma` is the package boundary or only a helper barrel.

**Evidence.** Boundary-file reading and package import scans showed both shared-prisma re-exports and direct `@prisma/client` imports in worker/import packages.

## Already good
- API trust-boundary wrappers are explicit: `apps/frontend/src/app/api/lib/withPrivilege.ts` provides `withPrivilege`, `withBackendCheck`, and `withPublic`, and the product route scan found wrapped API method exports.
- Auth email canonicalization is intentionally centralized in `apps/frontend/src/auth.ts` and `packages/shared-validators/src/emailIdentity.ts`.
- Scoped reports already have a useful cross-package core registry in `packages/shared-validators/src/scopeReportRegistry.ts`, plus compile-time alignment checks in `packages/shared-validators/src/schemas/report.ts`.
- `apps/frontend/src/app/api/lib/membershipConfirmation.ts` is a good precedent for moving route-level committee status transitions into a domain service.
- `apps/frontend/src/hooks/useApiMutation.ts`, `apps/frontend/src/hooks/useApiQuery.ts`, `apps/frontend/src/components/admin/XlsxUploadCard.tsx`, and `apps/frontend/src/components/admin/PresignedUploadReportForm.tsx` are solid shared UI/workflow primitives worth preserving.
- Search query execution is already centralized on the backend side in `packages/shared-validators/src/searchQueryUtils.ts`.

## Backlog-only notes

### B1. Migration-only partial indexes
**What & where.** Partial uniqueness constraints are documented in `apps/frontend/prisma/schema.prisma` for invites, invite jurisdictions, user jurisdictions, active committee memberships, and pending eligibility flags, while runtime code such as `apps/frontend/src/app/api/lib/committeeValidation.ts` handles some resulting P2002 cases.

**Why defer.** Prisma schema support is the limiting factor noted in the schema comments, and the current migration-backed constraints are deliberate.

**Future direction.** Revisit when the ORM can represent these invariants directly.

### B2. Legacy committee membership model overlap
**What & where.** `apps/frontend/prisma/schema.prisma` still carries `VoterRecord.committeeId`, `CommitteeList.committeeMemberList`, and `CommitteeRequest` alongside `CommitteeMembership`.

**Why defer.** The schema explicitly marks these as deferred ticket 3.0 compatibility fields, and current product code still has some historical references.

**Future direction.** Retire the legacy relation once CommitteeMembership is fully authoritative.

### B3. Orphan report-server component root
**What & where.** `apps/report-server/components/DesignatingPetition.tsx` remains under the legacy component root while product report-server UI lives under `apps/report-server/src/`.

**Why defer.** The inventory check found no current imports from `report-server/components`, so this is cleanup rather than architecture leverage.

**Future direction.** Delete the orphan root after a final import/build check.

## Not a finding
- **Small JSX repetition** — repeated labels, card markup, and local loading text are not architecture findings unless tied to a shared product contract.
- **Core report registry vs UI registry split** — `packages/shared-validators/src/scopeReportRegistry.ts` and `apps/frontend/src/components/reports/scopeReportUiRegistry.ts` intentionally separate worker-safe metadata from UI copy.
- **Acting privilege in client UI** — `apps/frontend/src/components/providers/GlobalContext.tsx` and `apps/frontend/src/components/ui/authcheck.tsx` intentionally model Developer role simulation; server authorization should continue to use actual session privilege.
- **Report-server worker asymmetry for `committeeRoster`/`ldCommittees`** — `apps/report-server/src/index.ts` shares XLSX wiring deliberately for the legacy and scoped committee report paths.
- **Scripts and migrations** — excluded by the manifest except as boundary context, so no script or migration cleanup is included.

## Escalations
- `apps/frontend/src/app/admin/page.tsx`, `apps/frontend/src/app/admin/users/page.tsx`, `apps/frontend/src/app/admin/terms/page.tsx`, `apps/frontend/src/app/admin/meetings/page.tsx`, `apps/frontend/src/app/admin/petition-outcomes/page.tsx` — admin Server Components fetch admin data before a server-side privilege check and rely on client `AuthCheck` from `apps/frontend/src/app/admin/layout.tsx`. → illegible-bug checklist (AGENTS.md)
