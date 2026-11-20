# 05 - Find committee members by name

Status: resolved

Split into [07](07-committee-name-search.md) (name search) and [08](08-record-search-committee-badge.md) (record search badge).

## Ask (verbatim)

> Would be great to have ability to search names within the committee
> Noted on all of the above. When you say within a committee, do you mean across all committees, for a particular city or Rochester+ LD combo? Or on a specific committee with up to 4 people.
> Across all committees. If they are on the record search page it should show they are on a committee.
>
> Only in the committee they have access to on the committee list page.
> It should also show the town/city LD and ED

(The second line is our question; the rest is the leader.)

## What was asked

Two pieces:

1. **Record search shows committee membership.** When a voter on record search is on a committee, the result
   says so, with the committee's town/city, LD and ED. This is "across all committees".
2. **Name search on the committee list page.** Search members by name, limited to the committees the user has
   access to (a Leader's jurisdictions), showing town/city, LD and ED for each hit.

## Notes

- Piece 1 exposes membership for any committee to anyone who can use record search. Check that against
  `skills/auth-check-patterns/SKILL.md` and decide who sees it.
- Decide which statuses count as "on a committee" (ACTIVE only, or also SUBMITTED / pending).

## Decisions (2026-11-15)

1. **Record search badge follows roster access.** Admin and Developer see membership on any committee. A Leader
   sees it only for committees in their jurisdictions (the same `committeeMatchesJurisdictions` rule as the
   rosters). RequestAccess and ReadAccess see nothing. The check runs on the server with the real session role.
   A Leader therefore sees nothing for a voter on a committee outside their jurisdictions; we accepted that.
2. **Name search is Leader and up only.** RequestAccess and ReadAccess get no name search, which matches the
   roster APIs (`withPrivilege(PrivilegeLevel.Leader, ...)`).
3. **Statuses.** The badge counts ACTIVE only (`ACTIVE_MEMBERSHIP_STATUS`, same as the one-committee-per-voter
   rule). Name search also returns SUBMITTED and CONFIRMED, labelled as pending.

### Access today (for reference)

| Role | Record search | Committee rosters |
| --- | --- | --- |
| ReadAccess / RequestAccess | whole voter file | none |
| Leader | whole voter file | own jurisdictions (town + LD; a null LD covers the whole town) |
| Admin / Developer | whole voter file | all |

The eligibility check (`api/committee/eligibility`, RequestAccess+) already returns
`ALREADY_IN_ANOTHER_COMMITTEE`, a yes/no that a voter is ACTIVE elsewhere. Out of scope here.
