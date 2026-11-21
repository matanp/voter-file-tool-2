# 06 - Results rows can't be told apart

Status: needs-triage
Tier: 3 (polish) · Priority: P3
Source: [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md), finding I6

## Problem

Record results show only name, DOB and phone; many identical names appear in a row. The details popover has no
actions.

## Fix

Add town and party columns. Consider links from the popover to the voter's committee or "Add to committee".

## Open question

Which actions belong in the popover, and for which roles?

## Acceptance criteria

- [ ] Town and party show in each row, at 768 px too (see [03](03-details-column-clipped-at-768.md)).

## Comments

### 2026-11-21 — UI makeover review

[ui-makeover/09](../../ui-makeover/issues/09-record-search-list-detail.md) answers this visually: line 1 has name, age, party and a member chip; line 2 has address, town and ED. Review and design notes are in [ui-makeover/reviews/recordsearch.md](../../ui-makeover/reviews/recordsearch.md).
