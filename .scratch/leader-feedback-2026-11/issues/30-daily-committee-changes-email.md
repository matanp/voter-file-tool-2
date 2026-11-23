# 30 - Morning email summarising yesterday's committee changes

Status: needs-triage

Blocked by: email-sending implementation (see [email-sending map](../../email-sending/map.md))

## Ask

From the 2026-11-21 stakeholder review (marked as a future update):
- A daily summary email to everyone with access to a committee, after changes are made.
- Not one email per change. On any day changes are requested, send one email the next morning listing all of that day's requests and changes.

## Proposal

- A scheduled job runs each morning. For each jurisdiction with committee activity the previous day (submissions, exit reports, confirmations, rejections, removals), it emails every Leader assigned to it.
- Optionally, Admins get one countywide digest.
- The email lists each change with the committee, the member, what happened and who did it, plus a link back to the committee in the workspace. Per the email-sending map, there are no attachments and no voter-data dumps.
- Source the changes from the audit log for the previous day.

## Open questions

- Which events count: only Leader-initiated requests, or Admin decisions too?
- Do Admins get the countywide digest?
- Can a user opt out?
- What time is "next morning", and in what time zone (America/New_York)?

## Acceptance

- No email on a day with no changes. At most one email per user per day.
- Every recipient sees only committees in their own jurisdictions.
- The send goes through `shared-mailer` and is logged in `EmailLog`.
