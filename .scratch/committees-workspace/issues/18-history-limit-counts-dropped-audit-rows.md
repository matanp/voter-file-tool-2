# 18 - History limit counts audit rows that never become events

Type: task
Status: ready-for-agent
Parent: ../map.md

Found in branch review of `committees-workspace` against `main` (2026-10-14, at `fdddbda`).

## Problem

`loadMembershipHistory` (`apps/frontend/src/app/api/lib/membershipHistory.ts:427`) fetches `limit + 1` (51) **audit rows** and sets `hasMore` from that. `buildHistoryEvents` then throws some of those rows away:

- for every reader, the `MEMBER_ACTIVATED` row that comes with each accept (it has a `meetingRecordId`);
- for Admins, the `MEMBER_ACTIVATED` row that comes with each petition win (shown as the `petition_outcome` event instead);
- for non-Admins, every `PETITION_RECORDED` row (`:371`). There is one per candidate.

So the response can carry far fewer than `COMMITTEE_DETAIL_HISTORY_LIMIT` (50) events while `hasMore: true`. It's worst for Leaders right after a primary: a committee with many candidates can fill most of the 51 rows with petition rows the Leader never sees, leaving a nearly empty timeline that claims there is more.

## Fix

Keep fetching until enough events survive. For example, loop in batches of `limit + 1` with a timestamp/id cursor, building events as you go, until `events.length > limit` or the rows run out. Then set `hasMore` from the event count, not the row count. Filtering out `PETITION_RECORDED` for non-Admins in the `where` clause removes the worst case cheaply, but the accept-pair collapse still needs the loop.

Also add a stable tiebreak (`{ id: "desc" }`) to the `orderBy` so the batch boundaries are deterministic. The `CONFIRMED`/`ACTIVATED` pair from one accept can share a timestamp.

## Acceptance

- Tests in `apps/frontend/src/__tests__/api/committee/detail.test.ts`:
  - a Leader on a committee whose newest 60 audit rows are 55 `PETITION_RECORDED` + 5 others still gets up to 50 non-petition events (or all of them, with `hasMore: false`);
  - Admin accept pairs count as one event toward the limit.
- `hasMore` is true only when more *events* exist.

## Comments
