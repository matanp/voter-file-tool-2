# 16 - Eligibility flags and discrepancies as list → detail

Status: needs-triage

Blocked by: 03, 04, 05

Part of [ui-makeover](../spec.md).

## Problem

- **Eligibility flags is enormous.** `/admin/eligibility-flags` is about 43,000px tall at 1280 and about 111,000px at 375. That is hundreds of unpaginated, roughly 85px rows, each with the same text and a black "Review" button (`EligibilityFlagsTable.tsx:224-296`).
- **Weak filtering.** Filters are two full-width selects (`:176-215`).
- **Repeated root cause.** Most rows share one cause ("no crosswalk row"), repeated about 300 times.
- **Phone layout breaks.** At 375 the Reason column wraps to one word per line, and Review is off-screen.
- **Discrepancies is a narrow column.** `/admin/discrepancies` shows 33 collapsed accordions in a 260px column (`CommitteeUploadDiscrepancies.tsx:221`, `w-max`) on a 1280 screen.

## Proposal

- **Status chips with counts** (Pending / Confirmed / Dismissed / Auto-resolved), plus Reason and Town filters and search.
- **Group** by Town > ED with count badges (`GroupedList`).
- **A banner or group-by-reason** for shared root causes ("N flags: no crosswalk row") instead of repeating them.
- **Detail:** move the existing review dialog into the detail pane of a `ListDetailLayout`; it becomes a bottom sheet on phones.
- **Discrepancies:** the same layout, with an ED list and count badges on the left and the detail table on the right.

## Acceptance

- Both pages fit a screen with a scrollable list.
- A shared root cause appears once.
- Review works at 375.

Evidence: reviews/admin.md §1B.
