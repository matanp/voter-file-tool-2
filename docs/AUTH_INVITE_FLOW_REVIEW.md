# Review - Auth Invite Flow and Leader-Scoped Invites

Short review of the invite/auth flow, with emphasis on Leader invites that carry
pending jurisdiction scope.

**Verdict:** The core design is sound. Admin invite management is server-gated,
invite token validation is explicitly public, invite application requires an
authenticated same-email session, Leader invites require at least one jurisdiction,
and scoped grants are consumed transactionally before `UserJurisdiction` rows are
created. The main issues are hardening gaps rather than evidence that the flow is
fundamentally broken.

## Findings

### 1. P2 - Email identity is not canonicalized

Invite creation, sign-in lookup, pending invite lookup, and invite application all
compare raw email strings exactly. This can break valid Google sign-ins or create
duplicate invite/user records that differ only by case.

Relevant files:

- `apps/frontend/src/app/api/admin/invites/route.ts`
- `apps/frontend/src/auth.ts`
- `apps/frontend/src/lib/applyPendingInvite.ts`
- `apps/frontend/src/app/api/auth/invite/[token]/apply/route.ts`

Suggested fix: normalize emails with `trim().toLowerCase()` everywhere they enter
the auth/invite/`PrivilegedUser` flow, ideally backed by a lower/citext uniqueness
constraint.

### 2. P2 - Invite and role-grant audit coverage is incomplete

Leader jurisdiction grants are audited, but invite creation/deletion and the
actual `User` / `PrivilegedUser` privilege grant are not. That means the audit
trail can reconstruct jurisdiction scope grants, but not the full story of who
created, removed, or elevated access through an invite.

Relevant files:

- `apps/frontend/src/app/api/admin/invites/route.ts`
- `apps/frontend/src/lib/applyPendingInvite.ts`

Suggested fix: add audit events for invite create/delete and privilege grant
application. Keep them in the same transaction as the state changes where possible.

Fix plan: `docs/AUTH_INVITE_AUDIT_COVERAGE_FIX_PLAN.md`.

### 3. P3 - Negative-path test coverage is thin — RESOLVED

The focused tests originally covered happy-path apply, stale-term rejection,
pending lookup, and helper idempotency only. A negative-path suite has been added
covering: unauthenticated apply/pending/create (401), non-Admin create (403),
wrong-email apply (403), deleted/expired/used/not-found/blank token responses
(410/409/404/400) on both GET and apply, Leader-with-empty-scope rejection,
non-Leader-with-jurisdictions rejection, duplicate pending invite and P2002
mapping, plus `no_invite` and unconsumable-invite paths in the grant helper.

Relevant tests:

- `apps/frontend/src/__tests__/api/auth/invite-route.test.ts`
- `apps/frontend/src/__tests__/lib/applyPendingInvite.test.ts`
- `apps/frontend/src/__tests__/api/admin/invites.test.ts` (new)

## Things that look good

- Route trust boundaries are explicit: Admin invite management uses
  `withPrivilege(PrivilegeLevel.Admin)`, apply/pending use authenticated access,
  and token validation uses `withPublic`.
- Leader invite creation validates non-empty jurisdiction scope, active term, and
  committee existence.
- Invite application checks same-email ownership before granting access.
- Invite consumption uses conditional `updateMany` inside a transaction, which is
  a good race-safety pattern.
- Leader scoped grants create `UserJurisdiction` rows and audit jurisdiction
  assignment.
- Stale active-term scope is rejected before consuming an unused invite.

## Verification Run

- `pnpm --filter voter-file-tool test -- --runTestsByPath src/__tests__/api/auth/invite-route.test.ts src/__tests__/lib/applyPendingInvite.test.ts`
  - Passed: 2 suites, 8 tests.
- `pnpm run check:api-routes`
  - Passed: 65 methods across 56 route files.
