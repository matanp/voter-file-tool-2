# 18 - Reject Exit Report has complete negative-auth coverage

Status: ready-for-agent
Merge blocking: yes

## Problem

`POST /api/committee/exitReport/reject` has an insufficient-privilege test but
no unauthenticated test. The `AGENTS.md` illegible-bug checklist requires new
protected API changes to cover unauthenticated and insufficient-privilege
requests, plus cross-user or cross-scope access where applicable.

## Acceptance criteria

- [ ] A signed-out rejection request returns 401 and performs no write.
- [ ] The existing insufficient-privilege coverage remains explicit.
- [ ] The test uses the repository's typed test helpers.
