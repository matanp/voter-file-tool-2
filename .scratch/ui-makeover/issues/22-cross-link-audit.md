# 22 - Audit: can Leaders act where they look?

Status: ready-for-agent

Part of [ui-makeover](../spec.md). Applies the spec's "Act where you look" and "Without getting busy" principles.

## Ask

From a stakeholder chat on 2026-11-21, after the request in [21](21-request-from-voter-search.md):

> One thing I noticed with the demo is that people want to see what they want to do the first place they look. So anytime they are looking at one thing letting them jump to another part of the work is beneficial.
>
> Obviously without letting it get too busy. So that's the balance.

## Task

This is a research ticket. Produce a table, not code.

1. List the things a Leader looks at: voter, committee (ED), seat or member, pending request, exit report, report, and the home summary.
2. For each surface that shows one of them (record search results and detail, workspace list and drawer, home, reports, requests page, Pending tab), list the next steps a Leader might want from there, and whether they exist today. Next steps are either jumps (open the related thing) or actions (do something with it).
3. For each missing one, record:
   - how often a Leader would want it (high, medium or low)
   - where it should live under progressive disclosure: detail pane, drawer, ⋯ menu, or an inline link
   - whether a planned ticket already covers it, or it needs a new one
4. Add the result to this file under `## Answer`, and propose new tickets for the uncovered high-value gaps. Don't create them yet; the maintainer picks.

Known starting points:
- voter → their committee: covered by 09.
- voter → request add or contact update: covered by 21.
- home → workspace committee detail: covered by 10.
- failed report → retry: covered by 07.
- Likely gaps to check:
  - committee member → full voter record
  - pending request or exit report → the seat it's for
  - report row → the committee it covers
  - committee → generate a report for it (08 covers the workspace button)

## Method

Walk the app in local dev as the ROCHESTER LD 17 Leader account and as an Admin (the prod test account is RequestAccess, so Leader scoping can only be checked locally), at 1280 and 375. Use the `proto/ui-makeover` prototype where a page is being redesigned, so the audit reflects the new layouts. Keep any screenshots out of git (voter PII).

## Acceptance

- Every surface × thing pair above is in the table, with exists / covered by NN / gap.
- Each gap has a frequency, a proposed home and a ticket recommendation.
- Done before step 6 of the build order, so findings can be folded into 07, 09 and 10 while they are built.
