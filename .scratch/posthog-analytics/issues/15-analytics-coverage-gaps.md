# 15 - Fill the analytics coverage gaps from 08 and 09

Status: needs-triage

Follow-up to 08 and 09. Two gaps were left open on purpose when those shipped.

## Do

- **`admin_import_run` has no `row_count`.** `XlsxUploadCard` can't read a count because each import returns a
  different shape. Add an optional `rowCount: (data) => number | null` prop to `XlsxUploadCard`, and pass it
  from the weighted-table and LTED crosswalk callers.
- **`action_failed` covers only the committee workspace** (`postJson` in `committees/workspace/adapters.ts`).
  Failures elsewhere (report requests, admin forms, petition outcomes, invites) aren't recorded. The shared
  point is `useApiMutation`'s error path: record `action_failed` there with `actionName(endpoint)` and
  `errorCode(...)` (codes only, never the message). Then check that the workspace doesn't count its failures
  twice.

## Done when

An admin import's event carries its row count, and a refused report request or admin form submission shows as
`action_failed` with its endpoint and code, with no free text in either event.
