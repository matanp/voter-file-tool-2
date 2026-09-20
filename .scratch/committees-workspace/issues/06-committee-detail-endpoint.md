# 06 - Add `GET /api/committee/{committeeListId}/detail`

Type: task
Status: open
Blocked by: 04
Parent: ../map.md

## Question

Execute plan §5 "Detail": a `committeeListId`-keyed route composing what `fetchCommitteeList` computes today (memberships, seats, designation-weight summary, petition context) plus pending memberships, recent membership history (shaped by what ticket 04 found is recoverable), and the composite key for adapters.

- Extract shared builders from `fetchCommitteeList` rather than copying; `fetchCommitteeList` itself stays until ticket 16.
- Pending memberships are returned for Leaders in their jurisdiction (read-only is a UI concern; scope is enforced here).
- Zod-define and validate the response in `lib/validations/committee.ts`.

Read `skills/auth-check-patterns/SKILL.md` first. Tests per plan §12.1, including cross-user/cross-jurisdiction `committeeListId` and PII omission. Run the §12.3 commands and checklist before resolving.
