# 18 - History limit counts audit rows that never become events

Type: task
Status: resolved
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

## Answer

Built in Lane C (worktree off `committees-workspace` at `8413196`).

`loadMembershipHistory` (`apps/frontend/src/app/api/lib/membershipHistory.ts`) now reads audit rows in batches of `limit + 1`, ordered `[{ timestamp: "desc" }, { id: "desc" }]`, paging with Prisma's `cursor: { id }, skip: 1`. Each batch is turned into events with `buildHistoryEvents` (with that batch's meetings loaded), and the loop stops once more than `limit` events exist or a batch comes back short. The response carries the first `limit` events, and `hasMore` is `events.length > limit`, so it counts events, never rows.

- Non-Admin queries leave `PETITION_RECORDED` out of `where.action.in`. That rules out the worst case (a Leader right after a primary) at the database. The loop still covers accept pairs and Admin petition-win folds.
- `buildHistoryEvents` is stateless per row (the accept collapse keys on the ACTIVATED row's own `meetingRecordId`), so a batch boundary that falls between a CONFIRMED and ACTIVATED pair can't produce a wrong event.
- The common case costs the same as before. When the newest 51 rows yield more than 50 events, or there are fewer than 51 rows, the loader still makes one audit query and at most one meeting query. Each extra batch adds one of each.

Tests in `detail.test.ts`: the query shape (tiebreak; Leader `where` excludes `PETITION_RECORDED`), plus a "limit counts events, not audit rows" block with an in-memory audit table that honours `where`, order, `cursor`, `skip` and `take`. The block covers: a Leader with 55 petition rows + 5 others gets all 5 and `hasMore: false`; 55 petition rows + 60 others gives 50 events and `hasMore: true`; 30 Admin accept pairs give 30 events and `hasMore: false`; 60 pairs give exactly 50 distinct events and `hasMore: true`; 50 events followed only by an event-less row give `hasMore: false`.

## Comments
