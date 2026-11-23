# 14 - Record report outcomes on the server

Status: needs-triage

Follow-up to 08. `report_completed` and `report_failed` fire in the browser, from the requesting form's
`ReportStatusTracker`. A user who leaves the page, or starts a second job from the same form, logs no outcome for
the job, so the "Report jobs by type" tile (12) undercounts completions and failures. A failed job the user
didn't wait for is exactly the case worth counting.

## Do

- Add `posthog-node` to the frontend, and record `report_completed` / `report_failed` in
  `app/api/reportComplete/route.ts`, where the report server reports each job's final status. Use the job's
  `generatedById` as the distinct id, so the event lands on the person who asked for it, and set
  `privilege_level` from that user.
- Send the same properties as the client event (`report_type`, `report_key` when known, `format`,
  `ms_since_request` from `Report.requestedAt`). No error text: it can quote voter data.
- Remove the client-side calls (`trackReportStatus`, `reportRequests`) so outcomes aren't counted twice.
- Flush the client before the route returns (serverless), and never let a PostHog failure fail the route.
- Keep the test-account filter working: server events have no `$host` or `qa_agent`. Check that the person
  properties the filter uses (`privilegeLevel`, `devMode`) still drop internal jobs, or add a property the
  filter can match.

## Done when

A job whose requesting tab was closed still shows its outcome in PostHog. The report tile's completed + failed
count matches the `Report` table's finished jobs for the same week, with test accounts filtered out.
