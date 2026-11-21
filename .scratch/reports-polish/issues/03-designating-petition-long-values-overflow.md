# 03 - Designating Petition: long candidate values push "Sheet No." and the notary box onto the next page

Status: resolved
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

## Comments

**2026-11-21 — resolved.** Shipped in PR #173. An in-browser fit script tightens, then shrinks (to an 8px printed floor), the candidate table and vacancies box, and zooms the whole sheet no lower than 90%, so signature rows, witness and notary text stay at least 90%. A sheet that still doesn't fit prints onto two pages and the job completes with `metadata: { warnings: [...] }` on the report-complete webhook (shared-validators schema widened; deploy the frontend before the report server). Production: petition-10-long 10 pages (was 11), each with "Sheet No. N" and the whole notary box; petition-quick unchanged. Follow-ups: [07](07-petition-form-length-limits.md), [08](08-show-report-warnings-in-ui.md). Deployed at `1a5d1b62`; production full run `20261121T005219Z-mtc4sy` (Lightsail, chrome): 34 pass, 0 fail after the LLM review (388 none, 1 accepted question) and baseline approval (`b7466865`).
