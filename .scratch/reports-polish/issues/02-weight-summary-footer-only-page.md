# 02 - Weight Summary: a full last page spills its footer onto an extra page

Status: resolved
Type: task
Source: PR #155 full validation run (2026-11-17), fixtures `weights-20` and `weights-200`

## Problem

In the Weight Summary PDF, a group whose last page has exactly 20 rows (20, 40, … 200 rows) gets an extra physical
page that holds only the footer. "Page 1 of 1" ends up on physical page 2.

`apps/report-server/src/components/DesignationWeightSummary.tsx` chunks rows by `MAX_ROWS_PER_PAGE = 20`, then appends
the Subtotal row (and, on the very last page, the Grand Total block) to the last chunk. Twenty rows plus the Subtotal
row overflow the fixed `h-[8.5in]` page, so the `mt-auto` footer is pushed onto the next sheet. The page-number math
(`Math.ceil(rows / 20)`) doesn't count that overflow, so the printed numbers drift from the physical pages.

## Fix

Reserve room for the Subtotal (and Grand Total on the final page) on the last chunk: if the last chunk is full, either
lower its row limit or move the subtotal onto its own page, and make the "Page N of M" math use the same chunking.
Do not change the layout of pages that already fit.

## Acceptance

- `weights-20` renders on 1 page and `weights-200` on 10, footers on the same page as their table, page numbers matching
  physical pages. `weights-21` still renders 20 + 1 on 2 pages.
- A unit test for the chunking covers 19, 20, 21 and 40 rows.
- Verify with the PDF validation harness (`apps/report-server/pdf-validation/README.md`), full mode.

## Comments

**2026-11-21 — resolved.** Shipped in PR #170. Rows tightened (`py-1` → `py-0.5`, header included) so 20 rows + Subtotal + Grand Total + footer fit one page; one pagination function drives both the chunking and "Page N of M", reserving room for the trailing block and counting extra lines of long Missing Weights lists (lists over 40 chars collapse runs to ranges and break into lines in code; no seat dropped). Unit tests cover 19/20/21/40 rows and the boundaries. Production: weights-20 1 page (was 2), weights-200 10 (was 11), weights-21 2, weights-multi-group 4. Known limit: a missing-weights notes block taller than a whole page still overflows. Deployed at `1a5d1b62`; production full run `20261121T005219Z-mtc4sy` (Lightsail, chrome): 34 pass, 0 fail after the LLM review (388 none, 1 accepted question) and baseline approval (`b7466865`).
