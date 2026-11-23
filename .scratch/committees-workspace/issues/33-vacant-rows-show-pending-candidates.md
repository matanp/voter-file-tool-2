# 33 - Vacant roster rows show pending candidates

Type: task
Status: needs-triage
Parent: ../map.md
Tier: 3 (polish) · Priority: P3
Source: split from [26](26-duplicate-submission-silent-success.md), part 3

## Problem

The roster's vacant rows don't say that someone is already submitted for the committee. A Leader looking at
the roster can't tell an empty seat from one with a candidate waiting for review, and may submit someone
else (or the same voter again; 26 now refuses that with a 409).

## Fix

Show the committee's pending plain-add submissions on its vacant rows, e.g. "1 candidate pending".

Decide first:

- Which rows show it: every vacant row, only the first, or a single line under the table. Pending
  submissions aren't tied to a seat (an accepted one takes the next open seat).
- Whether replacement submissions (`replacementFor` set) count. They target an occupied seat, not a vacancy.
- Where it goes in `CommitteeSeatTable` (`app/committees/CommitteeRosterTable.tsx`, shared with the legacy
  page). The vacancy action sits in the Contact cell for Admins, so the action slot is the wrong place for it.
- Whether ReadAccess rows (no vacancy action) show it too.

The data is already in the detail response (`detail.pending`).

## Acceptance criteria

- [ ] A committee with a pending plain-add submission says so on the roster, near its vacancies.
- [ ] A committee with no pending submissions shows nothing new.
- [ ] Covered in `__tests__/components/committees/RosterTab.test.tsx`.
