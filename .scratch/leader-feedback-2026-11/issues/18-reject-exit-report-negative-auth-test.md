# 18 - Reject Exit Report has complete negative-auth coverage

Status: resolved
Merge blocking: yes

## Problem

`POST /api/committee/exitReport/reject` has an insufficient-privilege test but
no unauthenticated test. The `AGENTS.md` illegible-bug checklist requires new
protected API changes to cover unauthenticated and insufficient-privilege
requests, plus cross-user or cross-scope access where applicable.

## Acceptance criteria

- [x] A signed-out rejection request returns 401 and performs no write.
- [x] The existing insufficient-privilege coverage remains explicit.
- [x] The test uses the repository's typed test helpers.

## Answer

`exitReport.test.ts` ("returns 401 when signed out", in the reject `describe`) sends a
signed-out rejection and asserts a 401, no `committeeMembership.updateMany`, and no
`auditLog.create`. The 403-for-Leader test that follows it still covers the
insufficient-privilege case. Both use the typed `prismaMock` delegates and
`expectErrorResponse`. Verified green in `pnpm test`.
