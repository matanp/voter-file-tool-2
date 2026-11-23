# 28 - Edit contact info on a seat; Leaders withdraw a pending submission

Type: task
Status: needs-triage
Parent: ../map.md
Tier: 3 (polish) · Priority: P3
Source: [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md), findings I10, I11

## Problem

- **I10.** The seat menu has no "Edit contact info"; fixing a member's phone means remove and re-add.
- **I11.** A Leader can't withdraw a pending submission (e.g. the `abc` phone from [24](24-drawer-shows-field-errors.md)).

## Fix

- "Edit contact info" in the seat menu, for Admins and for Leaders on their own committees. Writes an audit row.
- "Withdraw" on the Leader's Pending tab for their own SUBMITTED rows.

## Open questions

- Can Leaders edit contact info directly, or does it go through approval?
- What status does a withdrawn submission get?

## Acceptance criteria (once decided)

- [ ] Contact info is editable in place and audited.
- [ ] A Leader can withdraw their own pending submission.

## Comments

### 2026-11-21

Stakeholder review answered part of the first open question: Leaders must be able to update a member's contact information. Still open: whether a Leader's edit applies directly or waits for Admin approval.
