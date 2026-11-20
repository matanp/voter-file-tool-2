# 07 - Name search on the committees page

Status: resolved

Split from [05](05-search-committee-members-by-name.md); see its Decisions.

## What to build

On `/committees` (the workspace, `COMMITTEES_WORKSPACE=1`), a Leader, Admin or Developer can search committee
members by name across every committee they can access in the active term. Each hit shows the member's name,
status, and the committee's town/city, LD and ED, and opens that committee.

## Rules

- **Who:** Leader and up. Gate the endpoint with `withPrivilege(PrivilegeLevel.Leader, ...)`. Hide the control in
  the UI with `actingPermissions` (client visibility only, per `skills/auth-check-patterns/SKILL.md`).
- **Scope:** decide it on the server from `session.user.privilegeLevel`. Admin and Developer see every committee.
  A Leader sees only committees matching their jurisdictions; use `getUserJurisdictions` +
  `buildJurisdictionWhere`. A Leader with no jurisdictions gets no results.
- **Term:** active term only (`getActiveTerm`).
- **Statuses:** ACTIVE, plus SUBMITTED and CONFIRMED shown as "pending". No exited or rejected members.
- **Match:** case-insensitive on first and/or last name; a minimum query length and a result cap keep it cheap.

## Current state

- The workspace search box (`apps/frontend/src/app/committees/workspace/CommitteeFilters.tsx`) matches only ED
  number or town (`gridModel.ts` `matchesQuery`). Name search is new; whether it shares that box or gets its own
  is an implementation choice.
- Mobile layout for this search is ticket [06](06-mobile-name-search.md).

## Acceptance

- [ ] Leader finds a member of a committee in their jurisdiction by partial name; the hit shows town/city, LD, ED.
- [ ] Leader gets no hit for a member of a committee outside their jurisdictions, including a direct API call.
- [ ] A Leader with a null-LD jurisdiction finds members in every LD of that town.
- [ ] Admin finds members in any committee.
- [ ] RequestAccess/ReadAccess get 403 from the endpoint and see no search control.
- [ ] SUBMITTED/CONFIRMED hits show as pending; RESIGNED/REMOVED/REJECTED/PETITIONED_* never appear.
- [ ] Tests cover the scope rules on the server.

## Comments

- 2026-11-16: Built on branch `committee-name-search` (worktree `../voter-file-tool-name-search`), PR
  [#153](https://github.com/matanp/voter-file-tool-2/pull/153). Endpoint `GET /api/committee/memberSearch`, a
  "Find a member by name" box in the workspace list pane. Blind standards/spec review findings fixed in the
  second commit. Screenshots on `pr-assets/committee-name-search/` use synthetic data only.
