# 08 - Custom events for core actions

Status: ready-for-agent

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
