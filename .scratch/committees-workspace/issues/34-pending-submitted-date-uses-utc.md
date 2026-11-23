# 34 - "Submitted" dates for pending requests show the UTC day

Type: task
Status: needs-triage
Parent: ../map.md
Tier: 3 (polish) · Priority: P3
Source: review of PR #183 ([26](26-duplicate-submission-silent-success.md))

## Problem

`CommitteeMembership.submittedAt` is an instant (`CONTEXT.md`), but three places format it with
`formatCalendarDateForDisplay`, which formats in UTC. A request submitted at 9pm Eastern shows the next day.

- `app/committees/workspace/tabs/pending/PendingSubmissionItem.tsx` ("Submitted <date>")
- `app/committees/workspace/drawer/AddMemberFlow.tsx` (step 2 "Already pending" alert)
- `app/api/committee/requestAdd/route.ts` (the 409 "Already pending… submitted <date>" message)

The three agree with each other today, so changing one alone would make them disagree.

## Fix

- Client sites: use `formatInstantDateForDisplay` (`lib/dateUtils.ts`), which formats in the viewer's zone.
- Server site: `formatInstantDateForDisplay` would use the server's zone (UTC on Vercel), so the route needs an
  explicit `America/New_York`. Either add a zone parameter to the helper, or return the raw instant in the 409
  and let the client format it.

Decide first: whether the 409 message should carry a formatted date at all, or the client builds the sentence.
Related: the calendar-date lint work (`chore/calendar-date-lint`) may flag these.

## Acceptance criteria

- [ ] A submission at 2026-11-18T02:00Z (9pm Eastern on Nov 17) shows "Nov 17, 2026" in all three places.
- [ ] Tests cover the evening case for the route and for one client site.
