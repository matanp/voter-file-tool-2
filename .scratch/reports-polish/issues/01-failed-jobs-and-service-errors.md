# 01 - Failed report jobs, service errors, native confirms, panel naming

Status: needs-triage
Tier: 3 (polish) · Priority: P3
Source: [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md), findings B10, B11, I9

## Problem

- **B10.** Reports dashboard with a failed job: "1 reports have failed", with no reason or retry; the only action is
  delete, which uses native `confirm()`.
- **B11.** Generating with the report server down shows "Failed to generate report: Internal Server Error"
  (`ECONNREFUSED` from `generateReport/route.ts:160`).
- Three native `confirm()` dialogs: report delete, failed-report delete, invite revoke.
- **I9.** First panel is "Report Jobs" (Admin) or "Pending Reports" (Leader); "Committee Roster" and "Committee Report
  (Advanced)" overlap; report forms have no link back.

## Fix

1. Show a failed job's reason and a Retry action; fix the plural ("1 report has failed").
2. Map connection failures to "Report service unavailable, try again later".
3. Replace the three `confirm()` calls with the app's dialog component.
4. One panel name for both roles; describe how the two roster reports differ (or merge them); add "← Reports".

## Open question

Merge or keep the two roster reports? Needs a product call.

## Acceptance criteria

- [ ] Failed jobs show a reason and can be retried.
- [ ] No native `confirm()` left in the app.
- [ ] Report server down gives the plain message.

## Comments

### 2026-11-21 — UI makeover review

[ui-makeover/07](../../ui-makeover/issues/07-reports-hub-dense-list.md) redesigns `/reports` as one dense list, with running and failed jobs at the top and Retry in the row. That gives this ticket's failed-job reason and retry a home.
