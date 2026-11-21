# 18 - Admin config and import page polish

Status: ready-for-agent

Blocked by: 01, 04, 05

Part of [ui-makeover](../spec.md).

## Problem

Grouped low-priority findings (see reviews/admin.md §2):
- **Election Config:** `max-w-xl mx-auto` cards leave dead space, and every row has a filled red Delete button (`ElectionDates.tsx:231`).
- **Governance Config:** a field about 900px wide for the number "4", and a greyed Save inside an inner card.
- **Committee Terms:** explanatory cards sit above the term list.
- **Users:** raw-text roles; Role and Manage are cut off at 375.
- **LTED Crosswalk / Voter Import / Weighted Table:** little import state, 67px rows with a red Delete on each, and mismatched file controls.
- **Meetings, Petition Outcomes:** sparse; "0 decision(s)".
- **Inconsistent admin page headers.**

## Proposal

- The compact `PageHeader` on every admin page.
- Config forms: width capped at about 640px, label/control rows in sections, and a sticky Save bar shown only when there are changes.
- Delete as a ghost icon or ⋯ menu item, with a confirm.
- A shared `ImportCard`: drop zone, last-import summary, history.
- Users: privilege tags, invite status chip, mobile cards.
- Terms list first; Create Term behind a button.

## Acceptance

- No filled destructive buttons in table rows.
- Every admin page uses the shared header.
- Users is readable at 375.

Evidence: reviews/admin.md §2.

## Comments

### 2026-11-21 - triage

Ready for agent, but it is a grab bag. Split it into one PR per group (config forms, import pages with `ImportCard`, users, terms). Added 05 as a blocker for the compact `PageHeader`. Lowest priority in the effort.
