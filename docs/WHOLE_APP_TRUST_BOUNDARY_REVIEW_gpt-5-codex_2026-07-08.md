# Whole-App Trust Boundary Review

## Basis
- **Branch:** `feat/srs-implementation` · **Commit:** `daaf2c7` · **Date:** 2026-07-08 · **Model:** `gpt-5-codex`
- **Deliverable:** `docs/WHOLE_APP_TRUST_BOUNDARY_REVIEW_gpt-5-codex_2026-07-08.md`
- **Product files:** 356 · **checksum:** `c44a825f107e248477c02b2e8b26782dbd61aec1c8e9d4f8acf994ed38f3fd4c` · **algorithm:** sha256
- **Inventory:** `pnpm review:freeze trust` · **Scan profile:** `trust`
- **Methodology:** `docs/review/WHOLE_APP_TRUST_BOUNDARY_REVIEW_METHODOLOGY.md`
- **Axis:** authorization, scope, validation, race safety, audit invariants

## At a glance
| # | Finding | Severity | Blast | Opportunity |
|---|---------|----------|-------|-------------|
| 1 | Report worker accepts unsigned `/start-job` jobs | High | large | Verify worker ingress |
| 2 | `generateReport` under-authorizes admin-only report types | High | large | Gate by report type |
| 3 | RequestAccess committee flows skip jurisdiction scope | High | medium | Scope every low-role committee path |
| 4 | Public report downloads have no sensitivity allowlist | Medium | medium | Restrict publishable report types |
| 5 | Realtime report tokens are not channel-scoped | Medium | medium | Mint per-report capabilities |
| 6 | `reportComplete` terminal update is not atomic | Medium | medium | Conditional terminal writes |
| 7 | Membership transitions can overwrite concurrent state | Medium | medium | Conditional status transitions |
| 8 | Privilege and term changes leave audit gaps | Medium | medium | Audit authority-changing writes |

**Counts:** 8 findings · 2 backlog-only notes

## Subsystem map
| Subsystem | Trust-boundary surfaces reviewed | Depth |
|---|---|---|
| API wrappers and auth | `apps/frontend/src/app/api/lib/withPrivilege.ts`, `apps/frontend/src/auth.ts`, route inventory for 66 methods | high |
| Reports and worker | `apps/frontend/src/app/api/generateReport/route.ts`, `apps/frontend/src/app/api/reports/route.ts`, `apps/frontend/src/app/api/reports/[id]/route.ts`, `apps/frontend/src/app/api/reportComplete/route.ts`, `apps/report-server/src/index.ts` | high |
| Realtime report status | `apps/frontend/src/app/api/generateRealtimeToken/route.ts`, `apps/frontend/src/app/components/ReportStatusTracker.tsx` | medium |
| Committee membership | `apps/frontend/src/app/api/committee/requestAdd/route.ts`, `apps/frontend/src/app/api/committee/eligibility/route.ts`, `apps/frontend/src/app/api/committee/remove/route.ts`, `apps/frontend/src/app/api/lib/membershipConfirmation.ts` | high |
| Invite and privilege grant flow | `apps/frontend/src/app/api/admin/invites/route.ts`, `apps/frontend/src/app/api/auth/invite/[token]/apply/route.ts`, `apps/frontend/src/lib/applyPendingInvite.ts` | high |
| Reference/admin config | `apps/frontend/src/app/api/admin/terms/route.ts`, `apps/frontend/src/app/api/admin/terms/[id]/route.ts`, `apps/frontend/src/app/api/admin/governance-config/route.ts` | medium |
| Shared schemas and Prisma | `packages/shared-validators/src/schemas/report.ts`, `packages/shared-validators/src/scopeReportRegistry.ts`, `apps/frontend/prisma/schema.prisma` | high |

## Findings

### 1. Report worker accepts unsigned `/start-job` jobs
**Severity: High · Blast radius: large**

**What & where.** The frontend signs report-worker requests in `apps/frontend/src/app/api/generateReport/route.ts`, but the worker endpoint in `apps/report-server/src/index.ts` decompresses, parses, validates, and enqueues any raw `/start-job` request without checking `x-webhook-signature` or `WEBHOOK_SECRET`; `apps/report-server/src/webhookUtils.ts` only provides outbound signing.

**Why it hurts.** If the worker is reachable outside the trusted frontend boundary, a caller can enqueue arbitrary enriched report jobs, including voter-list exports, import jobs, and the worker-only BOE eligibility flagging variant accepted by the enriched schema. The callback path is signed on the way back, so the frontend may trust state produced from an unauthenticated worker ingress.

**Opportunity.** Treat `/start-job` as backend-authenticated ingress and reject missing/invalid HMAC before decompression/job enqueue.

**Evidence.** Mechanical route scans do not cover Express routes; manual review found inbound signature creation in the frontend and outbound callback signing in the worker, but no inbound verifier on the worker route.

### 2. `generateReport` under-authorizes admin-only report types
**Severity: High · Blast radius: large**

**What & where.** `apps/frontend/src/app/api/generateReport/route.ts` wraps the route at `PrivilegeLevel.RequestAccess`, then special-cases only legacy `ldCommittees` and scoped-report jurisdiction access. The shared union in `packages/shared-validators/src/schemas/report.ts` also accepts `voterList`, `absenteeReport`, and `voterImport`. The UI marks voter-list export Admin-only in `apps/frontend/src/components/reports/GenerateReportGrid.tsx`, and upload-key issuance is Admin-only in `apps/frontend/src/app/api/getCsvUploadUrl/route.ts` and `apps/frontend/src/app/api/getVoterFileUploadUrl/route.ts`, but the final job submission path does not repeat those server-side requirements.

**Why it hurts.** A RequestAccess user can bypass the Admin-only UI and directly submit voter-list export payloads with arbitrary search criteria, or submit import/absentee jobs using any known object key. The worker in `apps/report-server/src/index.ts` executes those report types from the submitted payload.

**Opportunity.** Add a server-side per-report-type authorization table and require Admin for voter-list exports, import jobs, absentee upload jobs, and any other admin-only report family.

**Evidence.** Compared UI `minPrivilege`, upload route wrappers, the generate-report schema union, and report-server processing branches.

### 3. RequestAccess committee flows skip jurisdiction scope
**Severity: High · Blast radius: medium**

**What & where.** `apps/frontend/src/app/api/committee/requestAdd/route.ts` is callable by `PrivilegeLevel.RequestAccess`, but it enforces committee jurisdiction only when `session.user.privilegeLevel === PrivilegeLevel.Leader`. `apps/frontend/src/app/api/committee/eligibility/route.ts` is also callable by `PrivilegeLevel.RequestAccess` and accepts any `committeeListId` without calling the jurisdiction helpers in `apps/frontend/src/app/api/lib/committeeValidation.ts`. The preflight response assembled in `apps/frontend/src/lib/eligibilityPreflight.ts` includes voter name, party, home district fields, committee capacity, warnings, and hard-stop reasons.

**Why it hurts.** A non-Leader RequestAccess account can submit membership requests into any active committee by city/LD/ED when eligibility passes, and can probe voter eligibility/committee facts for arbitrary committee IDs. That is cross-scope state mutation and voter-data exposure on reachable authenticated paths.

**Opportunity.** Apply the same `getUserJurisdictions`/`committeeMatchesJurisdictions` model to every non-admin committee read or write, with empty scope denying access.

**Evidence.** Wrapper inventory shows both routes are intentionally exposed at RequestAccess; code review found scope enforcement in leader fetch/scoped-report paths but not these RequestAccess paths.

### 4. Public report downloads have no sensitivity allowlist
**Severity: Medium · Blast radius: medium**

**What & where.** `apps/frontend/src/app/api/reports/[id]/route.ts` lets an admin toggle `public` on any report they own. `apps/frontend/src/app/api/reports/route.ts` then serves every `public: true` report to any authenticated user with author email metadata and a fresh presigned read URL, without checking `ReportType`.

**Why it hurts.** The same Report table stores sensitive downloadable outputs such as voter-list and absentee reports. One mistaken public toggle can make a PII-bearing file available to all authenticated users, even though report generation has stronger UI affordances for sensitive types.

**Opportunity.** Restrict public publication to an explicit safe report-type allowlist, or require a separate Admin review/action for PII-bearing report families.

**Evidence.** The public-list query scopes only to `public: true`/`deleted: false`; the patch route validates ownership and Admin status for public changes but not report sensitivity.

### 5. Realtime report tokens are not channel-scoped
**Severity: Medium · Blast radius: medium**

**What & where.** `apps/frontend/src/app/api/generateRealtimeToken/route.ts` mints an Ably token request for any authenticated user with only `clientId`. `apps/frontend/src/app/components/ReportStatusTracker.tsx` subscribes to `report-status-${reportId}`, and `apps/frontend/src/app/api/reportComplete/route.ts` publishes completion messages containing presigned report URLs to that channel.

**Why it hurts.** The API does not bind a token to a report the session owns, nor to a channel capability derived from ownership. If a report ID leaks through logs, public metadata, screenshots, or another bug, any authenticated user can attempt to subscribe to the completion channel and receive the signed download URL.

**Opportunity.** Issue realtime tokens with channel capabilities scoped to report IDs owned by the requesting session, or move completion URL retrieval behind the scoped reports API.

**Evidence.** Manual review found ownership checks in reports list/mutation routes, but no report-id input or ownership lookup in token creation.

### 6. `reportComplete` terminal update is not atomic
**Severity: Medium · Blast radius: medium**

**What & where.** `apps/frontend/src/app/api/reportComplete/route.ts` reads the report, checks `status === PROCESSING`, then later updates by `id` only for success or failure.

**Why it hurts.** Concurrent or retried completion callbacks with conflicting outcomes can both pass the precheck before either terminal update commits. The last update can overwrite the first terminal result, producing an incorrect final state and potentially publishing a URL/error that no longer matches the stored status.

**Opportunity.** Collapse the precheck and update into a conditional `updateMany`/transaction that only transitions `PROCESSING` rows and treats zero rows as idempotent skip.

**Evidence.** The handler has an idempotency guard, but the guard is separated from the terminal write; the route is otherwise correctly protected by `withBackendCheck`.

### 7. Membership transitions can overwrite concurrent state
**Severity: Medium · Blast radius: medium**

**What & where.** `apps/frontend/src/app/api/committee/remove/route.ts` reads an ACTIVE membership before a transaction, then updates by `id` only. `apps/frontend/src/app/api/committee/requestAdd/route.ts` reads an existing membership before its transaction and resubmits by `id` only. `apps/frontend/src/app/api/lib/membershipConfirmation.ts` checks SUBMITTED state inside a transaction, but the confirm and replacement updates are still unconditional by `id`; only rejection uses a conditional `updateMany` pattern.

**Why it hurts.** A concurrent admin accept/reject/remove/resubmit can change the membership between the read and unconditional write, allowing a stale request to overwrite ACTIVE, REJECTED, REMOVED, or RESIGNED state. The audit rows then record a before/after story that may not match the real prior state at write time.

**Opportunity.** Use conditional updates keyed by both `id` and expected `status`, or explicitly lock the membership row before deciding the transition.

**Evidence.** Prisma write scan highlighted these find-then-write flows; manual review found the safer conditional pattern already present for rejection, making the drift concrete.

### 8. Privilege and term changes leave audit gaps
**Severity: Medium · Blast radius: medium**

**What & where.** `apps/frontend/src/app/api/admin/invites/route.ts` creates and deletes privilege invites without writing `AuditLog` entries; deletion records `deletedAt` but not the deleting user. Applying invite jurisdiction grants is audited later in `apps/frontend/src/lib/applyPendingInvite.ts`, but invite creation/deletion and non-jurisdiction privilege grants are not. Separately, `apps/frontend/src/app/api/admin/terms/route.ts` creates terms and `apps/frontend/src/app/api/admin/terms/[id]/route.ts` changes the active term without using the existing `TERM_CREATED` audit action from `apps/frontend/prisma/schema.prisma`.

**Why it hurts.** Invite and active-term changes alter who can access the system and which term scopes committee/report operations. Without durable audit entries, an admin cannot reconstruct who issued/deleted an invite or who shifted the active committee term when later membership/report scope decisions look wrong.

**Opportunity.** Audit invite lifecycle and active-term changes with actor, before/after privilege/scope, and old/new active term.

**Evidence.** Audit scan found robust coverage for membership, petition, discrepancy, governance, jurisdiction, meetings, and crosswalk imports, but not these authority-changing routes.

## Already good
- API route wrapper inventory passed: 66 methods across 57 route files are explicitly wrapped with `withPrivilege`, `withBackendCheck`, or `withPublic`; the only public invite token route is explicit in `apps/frontend/src/app/api/auth/invite/[token]/route.ts`.
- Auth identity normalization follows the repo skill guidance: `apps/frontend/src/auth.ts` canonicalizes session/sign-in email, and `apps/frontend/src/app/api/admin/invites/route.ts` uses `canonicalEmailSchema`.
- Invite acceptance in `apps/frontend/src/app/api/auth/invite/[token]/apply/route.ts` and `apps/frontend/src/lib/applyPendingInvite.ts` consumes invites in a transaction with `updateMany`, expected invite IDs, same-email checks, and jurisdiction grant audit.
- Admin direct-add in `apps/frontend/src/app/api/committee/add/route.ts` locks the committee row and handles active-membership unique conflicts, preserving capacity and one-active-per-term invariants better than older find-then-write flows.
- Scoped report generation in `apps/frontend/src/app/api/generateReport/route.ts` uses shared schemas from `packages/shared-validators/src/scopeReportRegistry.ts` and validates leader jurisdiction for scoped report families.
- `apps/frontend/src/app/api/reportComplete/route.ts` correctly uses `withBackendCheck` and validates callback HMAC before trusting worker callbacks.

## Backlog-only notes

### B1. Public invite token validation reveals account existence
**What & where.** `apps/frontend/src/app/api/auth/invite/[token]/route.ts` returns invite payload plus `existingAccount: true` when the invite email already maps to a user.

**Why defer.** The caller already needs the high-entropy invite token, so this is not a broad enumeration path.

**Future direction.** Consider moving account-existence messaging to the authenticated apply step if invite links are commonly forwarded or exposed.

### B2. Missing privilege-level branch echoes identity in a 500
**What & where.** `apps/frontend/src/app/api/lib/withPrivilege.ts` includes `userId` and `email` in the JSON response when a session has no `privilegeLevel`.

**Why defer.** The value is returned to the authenticated user represented by that session, and the branch is a configuration/data-integrity failure rather than cross-user access.

**Future direction.** Keep the detailed identity in server logs and return a generic 500 envelope to the client.

## Not a finding
- **Bare API routes** — wrapper inventory passed for all current Next API methods; no unwrapped product route was found.
- **Developer acting role simulation** — client uses `actingPermissions` for UI visibility, while server routes reviewed here authorize from actual session privilege; this matches `apps/frontend/src/components/providers/GlobalContext.tsx` and `apps/frontend/src/app/api/lib/withPrivilege.ts` responsibilities.
- **Invite acceptance race** — `apps/frontend/src/lib/applyPendingInvite.ts` uses transaction-backed consumption and P2002/idempotency handling patterns; no race finding kept for that path.
- **Report object PATCH/DELETE ownership** — `apps/frontend/src/app/api/reports/[id]/route.ts` scopes mutations to `generatedById` and uses atomic `updateMany` after the existence check.
- **Admin governance config audit** — `apps/frontend/src/app/api/admin/governance-config/route.ts` writes fail-closed audit entries for config changes, so it is not part of the audit-gap finding.
