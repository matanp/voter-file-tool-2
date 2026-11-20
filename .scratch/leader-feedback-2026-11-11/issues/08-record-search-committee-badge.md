# 08 - Record search shows committee membership

Status: resolved

Resolved by PR #158 (`record-search-committee-badge`), approved in PR #158 review 2.

Split from [05](05-search-committee-members-by-name.md); see its Decisions.

## What to build

On `/recordsearch`, a voter who is an ACTIVE committee member in the active term shows that on their result,
with the committee's town/city, LD and ED. It only shows when the viewer could see that committee's roster.

## Rules

- **Who sees it** (decided on the server from `session.user.privilegeLevel`, never from `actingPermissions`):
  - Admin / Developer: any committee.
  - Leader: only committees matching their jurisdictions (`getUserJurisdictions` +
    `committeeMatchesJurisdictions` / `buildJurisdictionWhere`). Outside them, show nothing: no badge, no hint.
  - RequestAccess / ReadAccess: nothing. Don't send the field at all.
- **Statuses:** ACTIVE only (`ACTIVE_MEMBERSHIP_STATUS`), active term only. An ACTIVE member with a reported but unapproved exit still shows the badge: they hold the seat until the exit is approved (confirmed 2026-11-18).
- The route stays at `withPrivilege(PrivilegeLevel.ReadAccess, ...)`; only the added membership data is gated.

## Current state

- `apps/frontend/src/app/api/fetchFilteredData/route.ts` runs `prisma.voterRecord.findMany` with no committee data
  and maps rows through `convertPrismaVoterRecordToAPI`.
- `CommitteeMembership.voterRecordId` is indexed, so an extra lookup for one page of results (or a filtered
  `include`) is cheap.
- Display goes in `apps/frontend/src/app/recordsearch/VoterCard.tsx` and/or `VoterRecordTable.tsx`.

## Acceptance

- [ ] Admin sees the badge with town/city, LD, ED for an ACTIVE member of any committee.
- [ ] Leader sees it for an ACTIVE member inside their jurisdictions and nothing (not even in the API response)
      for one outside.
- [ ] RequestAccess/ReadAccess responses contain no membership data.
- [ ] SUBMITTED, CONFIRMED and exited memberships never produce a badge.
- [ ] A Developer acting as ReadAccess still gets the data from the API (real role); the UI may hide it.
- [ ] Tests cover the server-side gating per role.

## Comments

- 2026-11-17: Built on branch `record-search-committee-badge`, PR [#158](https://github.com/matanp/voter-file-tool-2/pull/158). Two blind reviews (auth/standards, spec/bugs) found no bugs; nits fixed. Screenshots on `pr-assets/record-search-committee-badge/`, synthetic data only.
