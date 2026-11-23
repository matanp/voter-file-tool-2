# 03 - Status colour tokens and a shared StatusBadge

Status: resolved

Blocked by: 01, 04

Part of [ui-makeover](../spec.md).

## Problem

There are six private status-colour maps:
- `PendingJobsIndicator.tsx:99`
- `ReportCard.tsx:267`
- `invites/display.ts:22`
- `EligibilityFlagsTable.tsx:59-65`
- `CommitteeSummaryBlock.tsx:20`
- `CommitteeGrid.tsx:135`

They disagree. "Pending" is yellow in one and amber in another, and red means both "Admin role" and "failed". `Badge` has no success, warning or info variant, so all 26 uses override its colours by hand.

Some badges print raw enums or DB type names: `RESOLVED_BY_RESCAN`, and "Committee Report" on Committee Roster rows.

## Proposal

- **Tokens:** `--success`, `--warning`, `--danger` and `--info`, each with `-bg`, `-fg` and `-solid` (emerald, amber, red, blue). Amber always means pending or needs attention. Red always means failed or destructive.
- **Privilege tags are neutral.** A privilege is not a status.
- **`StatusBadge`:** a `Badge` with `success | warning | danger | info | neutral` variants, an optional icon and an optional count (the workspace's `⏱2` chip).
- Replace the six maps with it. Map enums to human labels at the call site.

## Acceptance

- The six maps are gone. One `StatusBadge` and one token set.
- "Pending" looks the same everywhere. Red never marks a privilege.
- No raw enum or DB type name is visible in a badge.

Evidence: reviews/design-system.md §1 and §2.

## Comments

### 2026-11-21

Green primary buttons were kept (spec "Decisions"). Make the `success` tone visibly different from a primary button: a pill with a soft background and label, never a solid green block.

### 2026-11-21 - triage

Ready for agent. Light-only tokens (dark mode dropped). Build after 01 and 04, because all three edit `globals.css`, `tailwind.config.ts` and `components/ui`.

### 2026-11-21 - resolved

Shipped in PR 190, with follow-ups in PR 191.
- **Tokens:** `--success`, `--warning`, `--danger` and `--info`, each with `-bg`, `-fg` and `-solid`, used through `components/ui/status-badge.tsx`.
- **`StatusBadge`:** `tone` (one of the four, plus `neutral`), an optional `icon` and an optional `count`.
- **Six maps replaced:** all six private maps are gone. The roster and member-search pending chips use `StatusBadge` too.
- **Privileges** are neutral tags with `privilegeLabel()` (`lib/invites/display.ts`).
- **Report types:** `formatReportType` is an exhaustive `REPORT_TYPE_LABELS` map, so a new `ReportType` fails tsc until it has a label. CommitteeReport shows as "Committee Roster".
- **Eligibility flags:** `RESOLVED_BY_RESCAN` shows as "Auto-resolved".
