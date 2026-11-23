# 17 - Audit trail as a dense, scannable log

Status: ready-for-agent

Blocked by: 04, 05

Part of [ui-makeover](../spec.md).

## Problem

`/admin/audit` spreads its filters and Export over several rows, then shows about 73px rows because Timestamp and Record type wrap. Summaries show raw seat IDs, and identical events repeat up to 4 times in a row. At 375 the Summary column, the most informative one, is cut off.

## Proposal

- A one-line filter bar: Today / 7d / 30d presets, an Action chip, and Export in a menu.
- About 44px rows under date group headers, with the action as a small tag.
- Consecutive duplicates collapsed to "×4".
- Seat IDs resolved to ED and town.
- Tapping a row opens the existing `AuditDetailDrawer`.
- Two-line cards on phones.

## Acceptance

- The Summary is visible at 375.
- No raw seat IDs.
- Duplicates are collapsed.

Evidence: reviews/admin.md §1C.

## Comments

### 2026-11-21 - triage

Ready for agent after 04 and 05.
