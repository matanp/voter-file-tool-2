# 05 - Committee Roster with every column: addresses and emails are cut off

Status: needs-triage
Type: task
Source: PR #155 full validation run (2026-11-17), fixture `roster-ed29` (all columns)

## Problem

With all five optional columns selected, the Committee Roster PDF cuts ordinary addresses, mailing addresses and
emails off with "…", ZIP code included. This is the current design: `CommitteeReport.tsx` uses a fixed table layout
and one `truncate`d line per cell so pagination (the 30-unit page budget) stays correct. The harness fixtures mark
it as allowed truncation, so it doesn't fail validation.

A roster whose addresses lose their ZIP codes may not be usable for mailing or canvassing.

## Options

1. Allow address/email cells to wrap to two lines and count those rows as 2 units in the page budget.
2. Drop or abbreviate low-value parts (repeat city/state) so the ZIP survives.
3. Warn in the export form that "all columns" truncates in PDF, and point to the XLSX export.

## Questions for a human

- Do Leaders print the all-columns roster, or use the XLSX for contact details?
- Which option, if any?

## Acceptance

- Decided option implemented; `roster-ed29` shows full ZIP codes (options 1–2), or the form warning ships (option 3).
- Pagination fixtures (`roster-ed45-split`, `roster-large-800x4`) keep their page counts or are re-baselined.
