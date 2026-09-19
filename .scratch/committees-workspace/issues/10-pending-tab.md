# 10 - Pending tab

Type: task
Status: open
Blocked by: 08
Parent: ../map.md

## Question

Execute plan §7.2: submitted candidates for the selected committee with submitted-by/date, eligibility status, warnings, Admin accept/reject via the existing `handleRequest` endpoint, and a link to `/committees/requests` for bulk review. Leaders see their jurisdiction's submissions read-only; the UI hides the controls, the detail endpoint (06) enforces scope.

Successful accept/reject refreshes the detail and the affected grid row and preserves filters, selection, and tab. Read `auth-check-patterns` before gating the controls.
