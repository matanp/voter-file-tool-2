# 06 - Vacancy, Changes and Petition Outcomes: rows split across pages, stranded headings

Status: ready-for-agent
Type: task
Source: first Lightsail PDF validation full run, `20261120T061300Z-n795ih` (2026-11-20, full Chrome, deployed `45c450dc` code)

## Problem

These three reports don't paginate in code. The browser breaks pages wherever the content runs out, and nothing
keeps rows or headings together. Seen on the box:

- **Changes report (`changes-200`):** table rows are cut at the bottom of the page and finish as an orphan fragment at
  the top of the next (pages 1–9, 14, 16, 18). The Date column also wraps onto 2–3 lines ("Feb / 23, / 2026") while
  the right ~2.75in of the page is empty; that width problem is ticket [04](04-changes-report-landscape-width-and-blank-page.md).
- **Vacancy report (`vacancy-200`):** a group heading ("ROCHESTER, LD 21") sits alone at the bottom of page 4, with
  its rows starting on page 5. Continuation pages have no top margin, so the table header sits flush with the top
  edge, and rows run to within a few pixels of the bottom edge. A group's Subtotal row can land apart from its group.
- **Petition Outcomes (`outcomes-200`):** an ED heading ("City/Town: BRIGHTON, LD 16, ED 16", and others through ED 48)
  is stranded at the bottom of pages 4–12, with its table on the next page. Column widths also differ between ED
  tables (short-name tables get a narrow name column and a wide Seat # column).

## Fix

- Give the printed pages real top and bottom margins (Puppeteer `margin` or `@page`), so continuation pages aren't flush.
- `break-inside: avoid` on table rows (`tr`), and repeat the table header on each page (`thead { display: table-header-group }`).
- Keep each group heading with the start of its table (`break-after: avoid` on the heading, or wrap heading + first rows
  in a `break-inside: avoid` block), and keep Subtotal rows with their group.
- Petition Outcomes: fixed column widths shared by every ED table (`table-layout: fixed` plus explicit widths).

## Acceptance

- In the harness full run, `changes-200`, `vacancy-200` and `outcomes-200` have no split rows, no stranded headings, and
  margins on every page; the LLM review reports no pagination defects for them.
- Their page counts are re-approved (they're browser-paginated, so counts may change).
