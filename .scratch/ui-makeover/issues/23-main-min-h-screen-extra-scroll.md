# 23 - Root `<main>` adds a bar-height of scroll under full-height views

Status: needs-triage

Part of [ui-makeover](../spec.md).

## Problem

The root layout (`apps/frontend/src/app/layout.tsx`) renders `<main className="min-h-screen ...">` below the 48px app bar, so every page is at least the viewport plus the bar. Views that size themselves to the space under the bar, such as the committees workspace (`h-[calc(100dvh-var(--app-bar-height))]`) and the admin layout (`min-h-[calc(100dvh-var(--app-bar-height))]`), still get about 48px of page scroll. `PageContainer` also sets `min-h-screen`.

## Proposal

Make `<main>` `min-h-[calc(100dvh-var(--app-bar-height))]`, or drop its min-height and let pages that need it set their own. Check `PageContainer` the same way.

## Acceptance

- At 375 and 1280, `/committees` and `/admin/*` have no page-level scroll when their content fits.
- Short pages still fill the viewport.

Evidence: noted as known in the PR 190 description, which says it predates that PR.
