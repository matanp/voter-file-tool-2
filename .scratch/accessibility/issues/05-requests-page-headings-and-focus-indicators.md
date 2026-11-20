# 05 - Requests page headings and focus indicators

Status: needs-triage

Known items, raised in the Exit Report reviews and accepted for now.

## Heading outline on the requests page

`apps/frontend/src/app/committees/requests/page.tsx` now has an `<h1>Pending requests</h1>` (added in
`6d64703` as a focus target). Two problems with the outline around it:

- The h1 is followed directly by h3s, skipping h2: the Radix accordion triggers render as `h3`, and so does
  "Reported exits".
- `RequestCard.tsx` renders its own `<h1>Add …</h1>` for every submission, so the page has several h1s.

Overlaps `.scratch/ui-page-consistency/issues/01-heading-semantics-and-scale.md`.

## No visible focus on focus-target headings

The headings that receive focus from script after an Exit Report decision have `tabIndex={-1}` and
`outline-none`, so a sighted keyboard user sees nothing marking where focus landed:

- "Pending requests" in `requests/page.tsx`.
- "Reported exits" in `workspace/tabs/PendingTab.tsx`.
- The item's "Confirmed. / Rejected. Updating…" fallback line in `PendingExitReportItem.tsx`.

Decide on an app-wide convention for script-focused elements, e.g. a subtle `focus-visible` ring (ticket 01).

## Test gap

`apps/frontend/src/__tests__/components/committees/ExitReportList.test.tsx` checks focus against a stand-in page
wrapper, not the real `page.tsx`, which is a server component. If the "nothing pending" branch of `page.tsx`
stopped rendering the heading in the same place, focus would drop to the page body and no test would fail.
Covering that needs a test that renders the real page, or an e2e test.
