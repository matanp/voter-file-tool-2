# 02 - Mass-approve pending committee changes

Status: needs-triage

## Ask (verbatim)

> Reports also look great. Is there a way to add a mass creation feature on the admin side when a new committee list is approved?

## Reading

Our current reading: once the committee list is approved (at a meeting, or by the BOE), the Admin wants to act
on everything waiting in one pass, not item by item. That means bulk approve / deny for pending Submissions,
Exit Reports, and roster-import discrepancies. It does not mean importing a new membership list
(`.scratch/committee-roster-import/`) or setting up seats for a new term (`.scratch/leader-term-rollover/`).
Confirm this with the leader before speccing.

## What exists today

| Pending item                 | Where an Admin acts on it                                       | Bulk?                                    |
| ---------------------------- | --------------------------------------------------------------- | ---------------------------------------- |
| Submissions                  | `admin/meetings` → `PendingSubmissionsTable`                     | Yes: select, then Confirm / Reject selected, per meeting (`api/admin/meetings/[meetingId]/decisions`) |
| Submissions                  | Committee workspace → Pending tab                                | No: one at a time                        |
| Exit Reports                 | Committee workspace → Pending tab (`api/committee/exitReport/confirm`, `/reject`) | No                     |
| Roster-import discrepancies  | `admin/discrepancies`                                            | No: one action menu per row             |
| Eligibility flags            | `admin/eligibility-flags`                                        | No: one review dialog per flag          |

Bulk confirm for Submissions already exists but only through a meeting. The leader may not know about it.
That is the same discoverability problem as [01](01-admin-approve-exit-reports-on-committees-page.md).

## Open questions

- What does "a new committee list is approved" mean in practice: a meeting vote, or the BOE certifying the list?
  The answer decides whether bulk actions belong to a meeting or work across all committees.
- Which pending items matter most? Submissions and Exit Reports, or import discrepancies as well?
- Should bulk Exit Report decisions go through the same meeting flow as Submissions, so one meeting covers
  both adds and removals?
- Related: 01 (approve Exit Reports from the committees page) could ship together with this as one Admin
  "pending changes" list.
