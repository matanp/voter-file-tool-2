# 02 - Admin dashboards for absentee and election turnout results

Status: needs-triage

Part of [leader-feedback-2026-11-21](../README.md).

## Ask (verbatim)

> On the admin side for the absentee and election turnout results I'll share a few dashboards I built with Claude this year that I'd love to build into the system for next year so I can produce the info without the AI usage.
>
> This wouldn't be needed until next March

## What was asked

Admin-only dashboards for absentee ballot and election turnout results, built into the app. Today the
stakeholder builds them by hand with an AI assistant. They want to produce the same information from the app
next year without that step.

Needed by **March 2027**.

## The dashboards

The stakeholder shared three dashboards built in Claude, as claude.ai artifacts private to their organization;
we were invited to them:

- https://claude.ai/artifact/Teh8n3zcxuDMYCPwqKfChJ
- https://claude.ai/artifact/6m9uURfevJDBGYj6v7N3GB#chili (the Chili dashboard)
- https://claude.ai/artifact/P36YT4pANWYtwDeQeSWcDS

Claude Code can't read their data, because the stakeholder's organization doesn't allow it. PDF exports of all three are in the
gitignored `data/turnout-dashboards-2026/`. The Chili one lists individual voters with contact details, so keep
it there and don't quote it here.

### 1. Monroe County Early Vote Tracker 2026

A countywide early-voting tracker, refreshed daily during early voting. It has tabs for Early voting, Election Day
and Full turnout; the export shows the Early voting tab.

- Headline cards: early votes so far; change against the last midterm and the last presidential year at the same
  day; Democratic share; projected final; unaffiliated minus Republican; votes banked (early plus mail).
- Cumulative and per-day early votes by early-voting day, one line per general election since 2019.
- Countywide and by-party tables at the same point in each year, with "pace" projections.
- Who is voting early: each 2026 early voter matched to the voter file and the 2022 early-voting and mail reports,
  grouped by how they voted in 2022 (early, mail, Election Day, skipped, newly registered).
- Turnout so far among past voters, grouped by how they voted in 2022, 2024 and 2025.
- Mail ballots sent and returned, at the same number of days before Election Day each year.
- Breakdowns by town, by state legislative district (using the LTED matrix), by town and party, and Greece by ward.
- Every early-voting day since 2019, ranked by check-ins.
- Uses enrolled party throughout (DEM, REP including Conservative, BLK for unaffiliated) and gap columns D-R and
  BLK-R.

Sources: BOE early-voting check-in reports (voter-level files for 2021 onward), the voter file, BOE mail ballot
reports and the LTED matrix.

### 2. Chili mail ballots and election night results, GE 2026

A single-town dashboard for a close race after Election Day. Tabs for other towns (Webster, Mendon, Rush, Village of
Fairport) and a "Recount watch" tab suggest the same layout repeats per town.

- Headline cards: mail ballots issued, counted on election night, returned but not yet scanned, outstanding, and
  the supervisor margin.
- Election-night votes by ballot line, and uncounted mail ballots by party.
- Mail ballots over time: issued by date, returned by date, and the scan cutoff.
- Supervisor result and mail ballot status for each of the town's election districts.
- Every race on the town's ballot.
- Ballot cure tracker: open cure cases by party with the Election Law 9-209 deadline, a list of every case with
  voter contact details, affidavit ballot cures, and registration flags on mail voters.

Sources: BOE unofficial election-night results, the BOE Standard Ballot Request Report, the Absentee Cure Report
and the affidavit cure list.

### 3. 2026 Results by County Legislative District

Election-night results for the county, rolled up by County Legislative District (LD).

- A sortable table of the top-of-ticket margins in each LD (Governor, Comptroller, Attorney General, Congress, DA),
  with the sitting legislator and that LD's last County Legislature result.
- Seat counts by party, showing where the holder's party was ahead or behind in local races.
- A profile per LD: ballots cast, election districts, every 2026 contest on its ballots and its 2025 town races,
  noting contests that cover only part of the LD.
- Every town supervisor and council race, with the town-wide result and the margin inside each LD it touches.

Sources: BOE election-night results by election district, rolled up to LDs, plus past County Legislature and town
results.

## What we already have

- `/admin/absentee-report` takes an uploaded Standard Ballot Request Report CSV and produces an XLSX of
  requested and returned counts by ward and town (`apps/report-server/src/reportProcessors/absenteeReportProcessor.ts`).
  This is the starting point for the mail ballot parts of 1 and 2.
- The voter file and the LTED matrix are already imported, which covers the district and party breakdowns.
- We don't import early-voting check-in files, election-night results, cure reports or past results.

## Open questions for triage

- Which of the three matters most for next year, and what does "by March" need? The tracker runs during early
  voting in the fall. March is likely the deadline for having it ready, not for using it.
- Where does each BOE file come from, and in what format? Early-voting check-ins, election-night results by
  election district, cure reports and affidavit cure lists all need new imports. Ask the stakeholder for one
  sample of each.
- Should the app show on-screen dashboards like these, or downloadable reports like the existing absentee XLSX?
- The cure tracker and early-voter lists are voter-level data with contact details, used to chase ballots.
  Check them against [data-classification/01](../../data-classification/issues/01-data-classification-policy.md) and decide
  who can see them: Admins only, or Leaders for their own area?
- The Chili dashboard is per town. Should towns be chosen by the user or fixed to races marked as close?
- Year-over-year comparisons need history going back to 2019. Do we load past files once, or start from 2026?
