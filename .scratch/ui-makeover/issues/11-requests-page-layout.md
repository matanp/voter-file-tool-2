# 11 - Requests page: fix phone overflow and card-in-card layout

Status: needs-triage

Part of [ui-makeover](../spec.md).

## Problem

`/committees/requests` overflows at 375 (400px of content in a 375px screen). The column is a fixed `w-96 m-4` (`app/committees/requests/page.tsx:140,148`), and at 1280 it stays a 384px column with empty space beside it.

Each request is a large card titled "Committee Membership Request" in 24px (`RequestCard.tsx:85-118`). Reported exits use a different, denser card (`ExitReportList.tsx`), so one accordion mixes two visual languages. Permission denied is raw text (`page.tsx:65`).

## Proposal

The long-term direction is committees-workspace/22 (fold requests into the workspace). This ticket is the interim fix if 22 isn't scheduled soon:
- Use `PageContainer` and `max-w-2xl w-full`.
- Give requests and exits one compact row style: name · seat · type chip · reported date, with actions on the right or in a ⋯ menu.

If 22 is picked up first, close this ticket as superseded.

## Acceptance

- No horizontal overflow at 375.
- One row style for requests and exits.

Evidence: reviews/shell.md §2.
