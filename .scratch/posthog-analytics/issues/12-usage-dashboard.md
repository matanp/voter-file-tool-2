# 12 - Usage dashboard

Status: ready-for-agent

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
