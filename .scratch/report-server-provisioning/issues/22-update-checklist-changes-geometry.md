# 22 - PDF validation: update the LLM checklist's Changes report item

Status: ready-for-agent
Type: task
Source: production full run `20261121T005219Z-mtc4sy` (2026-11-21), after PR #171

## Problem

Item 8 of `apps/report-server/pdf-validation/llm-review-checklist.md` still says the Changes report "lays out an
8.5in-wide portrait container" and tells reviewers to "never describe it as correct". PR #171 fixed that layout: the
container now fills the Letter landscape width with no fixed height, and the Changes fixtures' own review notes
(`pdf-validation/src/fixtures/tables.ts`) were updated to expect that. In run `20261121T005219Z-mtc4sy` the reviewers had
to be told by hand that the fixture notes win.

## Fix

Rewrite item 8 to match the current layout: the table should span the page width with the Date column on one line;
report a blank right band, a wrapped date, clipped or overflowing columns, or a blank trailing page as a `defect`.
Changing the checklist changes its sha256, which the next run's `llm-review-request.md` records.

## Acceptance

- Item 8 no longer describes the portrait container and agrees with the Changes fixtures' review notes.
- The next harness run's review request references the new checklist hash.
