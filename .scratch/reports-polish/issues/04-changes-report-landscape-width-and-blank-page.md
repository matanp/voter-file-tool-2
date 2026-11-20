# 04 - Changes report: portrait-width layout on a landscape page, plus a blank trailing page

Status: ready-for-agent
Type: task
Source: PR #155 full validation run (2026-11-17), fixtures `changes-quick` and `changes-200`

## Problem

`apps/report-server/src/components/ChangesReport.tsx` renders a `w-[8.5in] min-h-[11in]` portrait container, but the
PDF is printed on Letter landscape (11in × 8.5in).

- A blank band about 3in wide is left on the right, and the Date column is squeezed onto three lines.
- The `min-h-[11in]` container is taller than the 8.5in landscape page, so even a 4-row report emits a blank second page.

The harness's LLM page review also raised four questions about this report; see the PR #155 run notes.

## Fix

Size the container for the page it actually prints on (11in wide, no 11in minimum height), or switch the job to
portrait. Pick one, and make the Date column fit on one line.

## Acceptance

- `changes-quick` renders on 1 page using the full landscape width; dates sit on one line.
- `changes-200` and `changes-empty` have no blank trailing page.
- Verify with the PDF validation harness, full mode.
