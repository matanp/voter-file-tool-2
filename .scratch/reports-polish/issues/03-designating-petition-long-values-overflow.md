# 03 - Designating Petition: long candidate values push "Sheet No." and the notary box onto the next page

Status: ready-for-agent
Type: task
Source: PR #155 full validation run (2026-11-17), fixture `petition-10-long`

## Problem

With long candidate names, offices or addresses, the candidate table grows. "Sheet No. N" and the bottom border of the
notary box (`apps/report-server/src/components/DesignatingPetition.tsx`, `sheetNoText` and the "Notary Public or
Commissioner of Deeds" block) move onto the next physical page, so every petition sheet becomes two pages.

A petition sheet must stay one page.

## Fix

Keep each sheet on one page with long values: fit the candidate table text (smaller font or wrapping rules for long
cells), or shrink flexible spacing elsewhere on the sheet. Short-value sheets (`petition-quick`) must look the same as
today.

## Acceptance

- `petition-10-long` renders 10 pages (one per sheet) with "Sheet No." and the whole notary box on each.
- `petition-quick` is unchanged against its approved baseline.
- Verify with the PDF validation harness, full mode.
