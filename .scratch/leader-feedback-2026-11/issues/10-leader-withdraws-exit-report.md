# 10 - Leader withdraws an exit report

Status: needs-triage

Blocked by: 01

## Why

Deferred from [01](01-leader-resignation-option.md) on 2026-11-01 to keep 01 small. Until this ships, a Leader
who filed an exit report by mistake asks an Admin to reject it.

## Thinking so far (not decided)

These came up while grilling 01 and were left open when withdraw was deferred.

- **Who can withdraw:** anyone who could have filed the report (RequestAccess+ with jurisdiction over the
  committee for the active term), not only the Leader who filed it. Admins keep using Reject.
- **Where:** while a report is pending, the roster row menu swaps "Report resignation or removal" for
  "Withdraw exit report". The same action appears on the Leader's read-only Pending tab item. The note is
  optional, and there's no instructions dialog.
- **Write:** a conditional update on `status = 'ACTIVE' AND exitReportedAt = <value the Leader saw>`, returning
  409 if an Admin already confirmed or rejected. Clears all report and exit fields, like 01's reject.
- **Audit:** a new `MEMBER_EXIT_REPORT_WITHDRAWN`, in the history list and visible to Leaders. It stays separate
  from Reject so the history shows who backed out.
- **Interaction with [09](09-replacements-use-exit-reports.md):** withdrawing a report linked to a pending
  replacement cancels the whole replacement. The candidate's Submission becomes `REJECTED` with
  `rejectionNote: "Replacement withdrawn by Leader"`, audited as `MEMBER_REJECTED` with
  `{ source: "replacement_withdrawn" }`. `requestAdd` reuses a REJECTED row, so the same person can be submitted
  again. A new `WITHDRAWN` status was considered and leaned against: every status switch would need it.
- **Withdraw vs Admin reject on a linked replacement:** they stay different. An Admin rejecting the exit alone
  means "this member isn't leaving", and the candidate stays as a plain pending add (09). A Leader withdrawing
  means "never mind this replacement", so both are cancelled.

## Comments
