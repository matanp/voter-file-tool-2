# 10 - Rasterizing-styles guard misses icons and inline CSS

Status: needs-triage
Type: task
Source: follow-up from PR #178 (fix/committee-report-no-shadow), filed during the 2026-11-21 workspace cull

## Problem

PR #178 removed Tailwind `shadow` classes from the committee report because Chrome rasterizes shadowed content in
the PDF. It added `apps/report-server/src/__tests__/noRasterizingStyles.test.ts` to stop shadows from coming back.
The guard scans the report components' class names only. It does not cover:

- icon components (inline SVGs and icon libraries can carry `filter`/`drop-shadow` styles)
- the inline CSS that `apps/report-server/src/utils.ts` injects into the rendered HTML

A shadow, filter or similar rasterizing style added in either place would get past the test.

## Done when

- The guard also checks the inline CSS in `utils.ts` and the icon components the reports render, or the ticket
  records why those can't introduce rasterizing styles.
