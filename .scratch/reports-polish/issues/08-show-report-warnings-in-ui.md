# 08 - Show report warnings in the reports list

Status: ready-for-agent
Type: task
Source: follow-up to [03](03-designating-petition-long-values-overflow.md) (PR #173)

## Problem

Since PR #173, the report server can complete a job with `metadata: { warnings: string[] }` on the report-complete
webhook (schema in `packages/shared-validators/src/schemas/report.ts`). The frontend stores it in `Report.metadata`
as-is, but nothing displays it. Today the only producer is the designating petition: "Sheet 3 runs onto a second page;
shorten the candidate or vacancy-committee entries so each sheet fits on one page."

`apps/frontend/src/components/reports/ReportCard.tsx` reads `Report.metadata` only through `isVoterImportMetadata`
(`apps/frontend/src/types/reportMetadata.ts`).

## Fix

Add a type guard for the warnings shape next to `isVoterImportMetadata` and show each warning on the report's card
(and wherever the completed report is linked), visibly but without blocking the download.

## Acceptance

- A completed report with `metadata.warnings` shows every warning on its card; reports without warnings look unchanged.
- Voter-import metadata still renders as before.
- Unit tests for the guard and the card.
