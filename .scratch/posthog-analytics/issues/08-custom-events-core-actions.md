# 08 - Custom events for core actions

Status: resolved

## Problem

The only events are pageviews and autocapture. "How many reports were generated", "did adding a member succeed",
and "how often does search return nothing" can only be guessed from button text, and button text changes with the
UI.

## Do

Add a small typed wrapper (e.g. `lib/analytics.ts` with `track(event, props)`) so event names and properties live
in one union type. Capture on the client after the server responds, with the outcome.

| Event | When | Properties |
|---|---|---|
| `record_search_performed` | search returns | `mode` (simple/advanced), `criteria_fields` (field names only), `result_count`, `duration_ms` |
| `voter_details_opened` | "See more details" popover opens | `from` (recordsearch/committee) |
| `committee_member_added` | add/replace confirm resolves | `role`, `flow` (add/replace/candidate), `outcome` (success/ineligible/error), `error_code`, `override_used`, `ms_in_flow` |
| `committee_member_removed` | removal resolves | `role`, `outcome`, `reason` |
| `report_requested` | report job submitted | `report_type`, `format` (pdf/xlsx), `role` |
| `report_downloaded` | download link clicked | `report_type`, `format`, `ms_since_request` |
| `report_failed` | job errors | `report_type`, `format`, `error_code` |
| `petition_action` | petition create/update | `action`, `outcome` |
| `admin_import_run` | voter/committee/weight import finishes | `import_type`, `outcome`, `row_count` |

Rules:
- **No voter PII in properties**: no names, addresses, VRCNUMs or search values. Field names and counts only.
- Use the same `role` value as the `privilegeLevel` person property.
- Check `skills/adding-reports/SKILL.md` before touching report code.

## Done when

Unit tests cover the wrapper's types, each event fires in its flow's integration test (mock posthog), and a local
run shows the events in PostHog's live events view.

## Comments

2026-11-21: Done. Event names and properties are one typed union in `lib/analytics.ts` (`track()`), shared with
09's `action_failed`. Every event carries `role` (the `privilegeLevel`), registered as a super property at
identify time instead of passed per event. No values, names or VRCNUMs are sent, only field names, codes and
counts.

| Event | Where | Properties |
|---|---|---|
| `record_search_performed` | `RecordsList` (main search) | `mode`, `criteria_fields`, `result_count`, `duration_ms`, `outcome` |
| `voter_details_opened` | `VoterRecordTable` popover | `from` (first path segment) |
| `committee_member_added` | `AddMemberFlow` | `flow` (add/replace), `mode` (add/submit), `outcome`, `override_used`, `ms_in_flow` |
| `committee_member_removed` | Remove / resignation / Leader exit report forms | `flow` (remove/resign/report), `outcome`, `reason` |
| `report_requested` | All 5 generateReport forms | `report_type` (Prisma `ReportType`), `report_key`, `format` |
| `report_completed` / `report_failed` | `ReportStatusTracker` (once per job) | same + `ms_since_request` |
| `report_downloaded` | `ReportCard` download / view on /reports | `report_type`, `via`, `ms_since_request` |
| `petition_action` | Petition outcomes record | `action`, `outcome`, `candidate_count` |
| `admin_import_run` | `XlsxUploadCard` (weighted table, crosswalk) | `import_type`, `outcome` |

Differences from the table above:

- `flow` + `mode` replace the `add/replace/candidate` flow values, because a replacement is always a submission.
- `committee_member_added` has no `error_code`. `action_failed` (09) has the code for each failure.
- `report_completed` is added, so request → complete/fail is a funnel.
- `report_downloaded` covers /reports only. Form links and auto-downloads after generation count as
  `report_completed`.
- `admin_import_run` has no `row_count`, because the import responses don't share a shape. Voter import is a
  report job, so it shows as `report_requested` with `report_key: voterImport`.
- `record_search_performed` covers /recordsearch only, not the embedded search forms (petitions, committees
  legacy, voter-list reports).

Tests: `__tests__/lib/analytics.test.ts`, `components/recordsearch/RecordsList.analytics.test.tsx`,
`components/reports/ReportStatusTracker.analytics.test.tsx`, and event assertions in
`components/committees/CommitteeActionDrawer.test.tsx` (add with ineligible → error → success outcomes, remove).

Checked in local dev against PostHog: a synthetic record search produced `record_search_performed`
(`["firstName","lastName"]`, 15 results, `role: Developer`, `qa_agent: true`) and `voter_details_opened`. That
check found the trailing-slash event loss fixed in 11.
