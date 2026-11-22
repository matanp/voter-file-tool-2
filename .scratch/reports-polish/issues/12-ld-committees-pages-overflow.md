# 12 - LD committees PDF: wrapped rows push pages past the bottom, over the next page

Status: needs-triage
Type: task
Source: production smoke test of PR #179 (2026-11-22), countywide `ldCommittees` PDF, 80 pages

## Problem

The LD committees PDF uses the legacy columns (Serve ED, Name, Address, City, State, Zip, Phone). They wrap instead
of truncating. `paginateCommittees` (`apps/report-server/src/components/CommitteeReport.tsx`) fills each page by
row count: 30 units, one per member plus one per ED header. It assumes every row is one line tall.

Real data wraps often:
- addresses with an apartment number, or a ZIP+4, take two lines;
- phone numbers break in the narrow Phone column ("(585)232-" / "3934");
- names take two lines.

A page with enough wrapped rows is taller than the paper. Its bottom (member rows, the stray table header, "Committee
Subtotal", the footer) then prints over the top of the next page: the title, the LD heading, the column headers and
the first rows.

In the 2026-11-22 countywide report, 7 of 80 pages overflowed (7, 34, 36, 38, 48, 59, 66):
- On page 8, page 7's subtotal and footer print over the title.
- On page 37, page 36's member rows print over the title, header and first row. Those rows are unreadable.

The committee roster PDF (the `columns` path) truncates every cell to one line, so the same data doesn't overflow
there. That truncation is ticket 05's subject.

## Why it went unnoticed

- PR #179 didn't cause it: it only added a `pageRange` slice. It does interact with #179, though. If an overflow
  lands on the last page of a 20-page slice, the spill becomes an extra page in that slice instead of overlapping
  the next one. The PDF then has one more page than "Page N of M" says.
- The PDF validation fixtures (`legacy-quick`, `legacy-large-800x4`, report-server-provisioning ticket 19) use
  short synthetic values that never wrap. `roster-long-values` covers long values for the roster path only.

## Options

1. **Estimate row height for legacy rows** and count wrapped rows as 2 (or more) units. This needs a reliable
   estimate of characters per line for each column; the risk is that the estimate drifts from real font metrics.
2. **Truncate legacy cells to one line**, as the roster path does. Pagination is correct by construction, but
   addresses and names may be cut. Ticket 05 asks the same question for the roster.
3. **Widen the Phone column, and shrink the City/State/Zip columns,** so phones never wrap. That reduces the
   overflow but doesn't fix it, because addresses and names still wrap.
4. **Let Chrome paginate** (`browserPaginatedPrint`, as vacancy, changes and outcomes do). This is correct for any
   data, but committee reports would lose code pagination. PR #179's 20-page slicing depends on that pagination,
   so this rules slicing out.

## Acceptance

- No page of the LD committees PDF overflows with real-length data.
- A legacy fixture with long values (two-line addresses, ZIP+4s, long names, phones) is added to the PDF validation
  harness. A run on the box shows every row above its own page's footer. Include a fixture whose overflow-prone
  page is a slice's last page (page 20).

## Questions for a human

- Which option? Option 1 keeps the full text; option 2 matches the roster and ticket 05.
- Should ticket 05 and this one be decided together? They share the 30-unit page budget.

Related: 05 (roster truncation and the page budget), 02, 03 and 06 (earlier overflow fixes in other reports),
report-server-provisioning 19 (fixtures) and 24 (slicing).
