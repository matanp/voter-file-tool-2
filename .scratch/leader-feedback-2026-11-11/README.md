# Leader feedback, 2026-11-11

Feedback received Wednesday 2026-11-11 by text message (9:53 AM to 11:38 AM). The thread is kept verbatim below. Each ticket in `issues/`
quotes its part word for word; nothing has been triaged or specified yet.

Earlier feedback: [leader-feedback-2026-11](../leader-feedback-2026-11/README.md).

## Attachments

The screenshot that came with the thread, and our own recordings, show real voters' details, so they are in
the repo's gitignored `data/` folder and are never committed.

| File in `data/`                               | What it is                                                                                         | Ticket |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------ |
| `leader-feedback-2026-11-11-voter-card-town.png` | Photo of a record search voter card: City WEBSTER, **Town: 00**, County Leg District 08, ED 27 | 04     |
| `leader-feedback-2026-11-11-admin-confirm-exit-report.gif` | Our recording of the admin Confirm flow on the committees page (not from the thread) | 01 |
| `leader-feedback-2026-11-11-admin-pending-tab.png` | Our still of a committee's Pending tab with Confirm / Reject (not from the thread) | 01 |

## Original thread (verbatim)

Two lines are our replies: "Not at my computer but admin should be able to approve / deny right from the
committees page" and "Noted on all of the above. When you say within a committee, …". Everything else is from
the leader.

> Hey, delete functionality on the committee leader side seems to work great. I don't see anywhere on the admin side to approve them
> Reports also look great. Is there a way to add a mass creation feature on the admin side when a new committee list is approved?
> Not at my computer but admin should be able to approve / deny right from the committees page
> 👍
> Eds with 0 members don't show in the committee menu making it harder to appoint
>
> The town code is not showing right
> Would be great to have ability to search names within the committee
> People are gona want cleaner mobile version, especially for searching names
> Noted on all of the above. When you say within a committee, do you mean across all committees, for a particular city or Rochester+ LD combo? Or on a specific committee with up to 4 people.
> Across all committees. If they are on the record search page it should show they are on a committee.
>
> Only in the committee they have access to on the committee list page.
> It should also show the town/city LD and ED

## Tickets

| #   | Ticket                                                                                     | Covers                                          |
| --- | ------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| 01  | [Admins approve or deny exit reports from the committees page](issues/01-admin-approve-exit-reports-on-committees-page.md) | "I don't see anywhere on the admin side to approve them" |
| 02  | [Mass-approve pending committee changes](issues/02-mass-create-from-approved-list.md) | "mass creation feature on the admin side"       |
| 03  | [EDs with no members missing from the committee menu](issues/03-empty-eds-in-committee-menu.md) | "Eds with 0 members don't show"                 |
| 04  | [Voter card shows the wrong town code](issues/04-voter-card-town-code.md)                   | "The town code is not showing right" + photo    |
| 05  | [Find committee members by name](issues/05-search-committee-members-by-name.md)            | Name search and the clarifying replies          |
| 06  | [Cleaner mobile layout, especially name search](issues/06-mobile-name-search.md)           | "cleaner mobile version"                        |
| 07  | [Name search on the committees page](issues/07-committee-name-search.md) | Split from 05: name search, Leader+ and jurisdiction-scoped |
| 08  | [Record search shows committee membership](issues/08-record-search-committee-badge.md) | Split from 05: badge on record search, roster access rules |
| 09  | [Open the PR for 06 with synthetic-data screenshots](issues/09-pr-for-06-with-screenshots.md) | Follow-up to 06: PR, public repo so no real voter data |
| 10  | [Exports show "00" under Village / Ward](issues/10-export-village-ward-00.md) | Follow-up to 04 (PR #149) |
| 11  | [Show village / ward names, not codes](issues/11-village-ward-names.md) | Follow-up to 04 (PR #149) |
| 12  | [Label the voter card's City line as the mailing city](issues/12-mailing-city-label.md) | Follow-up to 04 (PR #149) |
| 13  | [Small cleanups after PR #149](issues/13-town-and-header-cleanups.md) | Follow-up to 04 (PR #149) |
