# 12 - Usage dashboard

Status: resolved

Blocked by: 07, 08

Build a PostHog dashboard named "App usage" with test accounts filtered out:

- Weekly active users broken down by `privilegeLevel`
- Sessions per week and median session length
- Pageviews by top-level page (`/committees`, `/recordsearch`, `/reports`, `/admin/*`, `/petitions`)
- Reports requested / downloaded / failed by `report_type` (from 08)
- Committee member adds by `outcome` (from 08)
- Record searches and the share with `result_count = 0` (from 08)
- Rage clicks by page, linked to a replay playlist
- Exceptions per week (from 09)
- Lifecycle (new / returning / dormant) for signed-in users

Use native insight queries, not SQL, so the tiles refresh. Link the dashboard here when it's built.

## Comments

2026-11-21: Built: [App usage](https://us.posthog.com/project/114503/dashboard/2391997). Nine native insight tiles,
all with test accounts filtered out:

1. Weekly active users by role (`privilegeLevel`)
2. Sessions and median session length per week
3. Pageviews by section (first path segment)
4. Rage clicks by section (open a bar → View recordings)
5. Report jobs by type: requested / completed / failed / downloaded
6. Committee changes by outcome (Admin adds and removals, Submissions, Exit Reports)
7. Record searches and % with no results
8. Exceptions and failed actions per week
9. Signed-in user lifecycle

Tiles 5–8 stay empty until the 08/09 events reach production (after deploy). Not done: a saved replay playlist
for rage clicks. Make one during the next break-it session (05) so its recordings outlive retention.

2026-11-22: Tile 6 renamed to "Committee changes by outcome". It now has four series, `committee_member_added`,
`submission_created`, `committee_member_removed` and `exit_report_submitted`, after 08's events were split by
domain term.
