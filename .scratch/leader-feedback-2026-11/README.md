# Leader feedback, November 2026

Feedback received 2026-11-01. The original message is kept verbatim below. Each ticket in `issues/` quotes
its part of the message word for word; nothing has been triaged or specified yet.

## Attachments

The files that came with the message are in the repo's `data/` folder. That folder is gitignored because the
files contain voter data, so they stay local and are never committed.

| File in `data/`                                       | What it is                                                                                                                                                                                                                                                                                                                  | Ticket |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `fwdcommitteefilesfrom20251218executivecommittee.zip` | Reports sent out after the 2025-12-18 executive committee meeting: `Deletes - Resignation - Exec Committee 2025-12-18 v2.xlsx`, `Adds - Exec Committee 2025-12-18 v2.xlsx`, `Committee Weight 2025-12-18 v2.pdf`, `Commitee File 2025-12-18 v2.pdf`, `Committee File 2025-12-18 v2.xlsx`, `Vacant Seats 2025-12-18 v2.xlsx` | 05     |
| `Brighton_09282026102755.pdf`                         | Preferred sign-in sheet format                                                                                                                                                                                                                                                                                              | 05, 10 |
| `dbo_View_TEAMSQL_Voter_Table 20261019.zip`           | Extended BOE voter file; unzips to one ~590 MB `dbo_View_TEAMSQL_Voter_Table 20261019.txt`                                                                                                                                                                                                                                  | 07     |

## Original message (verbatim)

> 1. There doesn't seem to be a way to remove someone without replacing them. We need a resignation option on the leader side. Ideally, include a place for them to upload a resignation letter; at minimum, add a pop-up telling them to send it to Stephen and me, editable on the admin side so we can change the process if needed. The Leaders submission is still pending admin approval.
> 2. The weight uploaded is per seat, not per ED. A full ED, or one with 2 members, should always be an even number.
> 3. Report generation doesn't work in city committees because you can only select Rochester and not the more specific committee. Remove the option to select leaders. They only need to ever make a report for their own committee. So report generation should be limited to the committee they have access to.
> 4. The report generation currently only includes the name and address. It would be great if the user could pick what gets exported, including address, mailing address, phone, and email. We would also ideally have the following monthly reports.
>
> Below are the reports that have been sent out in the past after executive committee meetings.
>
> Also, a much more extensive voter file the Board of Elections provided to Chris to help track changes more effectively. I don't know how hard it will be to use it. But I thought I should share it now that I am receiving them.
>
> I have also attached the sign in sheet format that I prefer. Also checking the Weight Report it doesnt seem to be including the weight numbers. And the Vacancy Report has everyone down as non petitioned members, we need a way to mark everyone from the original upload as petitioned.

## Tickets

| #   | Ticket                                                                                                        | Covers                                              |
| --- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 01  | [Leader resignation option](issues/01-leader-resignation-option.md)                                           | Item 1                                              |
| 02  | [Weights: per seat, and missing from the Weight Report](issues/02-weights-per-seat-and-weight-report.md)      | Item 2, Weight Report note                          |
| 03  | [Limit leader report generation to their own committee](issues/03-leader-reports-limited-to-own-committee.md) | Item 3                                              |
| 04  | [Let the user pick exported report fields](issues/04-pick-report-export-fields.md)                            | Item 4, first paragraph                             |
| 05  | [Monthly reports and sign-in sheet format](issues/05-monthly-reports-and-sign-in-sheet.md)                    | Item 4 monthly reports, past reports, sign-in sheet |
| 06  | [Vacancy Report: mark original upload as petitioned](issues/06-vacancy-report-petitioned-status.md)           | Vacancy Report note                                 |
| 07  | [Extended BOE voter file](issues/07-extended-boe-voter-file.md)                                               | Extended voter file note                            |
| 08  | [Resignation letter upload](issues/08-resignation-letter-upload.md)                                           | Item 1, "ideally" upload (split from 01)            |
| 09  | [Replacements use exit reports](issues/09-replacements-use-exit-reports.md)                                   | Item 1 follow-on (split from 01)                    |
| 10  | [Leader withdraws an exit report](issues/10-leader-withdraws-exit-report.md)                                  | Item 1 follow-on (deferred from 01)                 |
| 11  | [Sign-in sheet redesign](issues/11-sign-in-sheet-redesign.md)                                                 | Sign-in sheet format (split from 05)                |
| 12  | [Adds and Deletes exports](issues/12-adds-and-deletes-exports.md)                                             | Past Adds/Deletes files (split from 05)             |
| 13  | [Committee Weight by LT/Town report](issues/13-weight-by-lt-town-report.md)                                   | Past Committee Weight PDF (split from 05)           |
| 14  | [Vacant Seats export with weighted vote](issues/14-vacant-seats-weighted-export.md)                           | Past Vacant Seats file (split from 05)              |
| 15  | [Monthly report run](issues/15-monthly-report-run.md)                                                         | "Monthly reports" bundle (split from 05)            |
| 16  | [Centralize membership transitions](issues/16-centralize-membership-transitions.md)                           | Exit Report review follow-up                        |
| 21  | [R2 setup for Resignation Letters](issues/21-r2-letter-lifecycle-and-privacy.md)                               | 08 infrastructure (Cloudflare dashboard)            |
| 22  | [Scan uploaded Resignation Letters for malware](issues/22-resignation-letter-av-scan.md)                       | 08 follow-up, not prioritized                       |
