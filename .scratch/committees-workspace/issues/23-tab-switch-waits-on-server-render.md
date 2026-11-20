# 23 - Switching workspace tabs waits on a full server render

Status: needs-triage

## What happens

Clicking Roster / Pending / Seats & Weight / History often looks like it did nothing. The tab switches a moment
later, or after a second click. Found during PR #154 manual QA on 2026-11-18. It reproduces on `main` (821dde2b),
so it isn't from that PR.

It shows most right after a drawer or the profile panel closes, but it also happened with nothing closed: clicking
History then Pending in quick succession, the Pending click landed only after a ~1-3 s wait.

## Cause (verified locally)

The active tab is read from the URL only. `CommitteeTabs` → `setTab` → `writeUrl({ tab }, "replace")`
(`CommitteeWorkspace.tsx:238`, `:115-122`) calls `router.replace`. In the App Router that is a navigation: it
re-renders `app/committees/page.tsx`, which is `force-dynamic` and runs `auth()` plus a
`committeeList.findMany` over every committee in the term. The tab highlight and panel change only when that
RSC payload returns.

The dev server log shows two `GET /committees?…&tab=…` requests per click, 250-450 ms each on local Postgres.
In production against Neon, plus network, the lag is likely longer. A click that lands while an earlier
navigation is still in flight (for example a drawer close that also writes the URL) waits behind it.

Not measured in production.

## Options

- Update the tab with `window.history.replaceState` instead of `router.replace`. Next 15 syncs it into
  `useSearchParams` without a server request. Keeps the URL shareable and refresh-safe. The same applies to the
  town / LD filters (`:390-391`), which have the same cost.
- Or keep a local tab state that updates at once and mirror it to the URL (needs care with back/forward and
  `latestParams`).
- Separately: the page re-fetching every committee on any query-string change is the underlying cost; worth
  checking whether `committee` changes need it either.

## Acceptance criteria

- [ ] A tab click switches the tab immediately, with no request to `/committees`.
- [ ] The URL still carries `tab=`, and reload / shared links open the same tab.
- [ ] Back/forward still behave as today for committee selection (`push`) and tab changes (`replace`).
- [ ] A test covers the tab writing the URL without a router navigation.

## Also seen (same session, also on `main`)

The workspace drawer can run past the right edge of the window (the drawer's Close button is cut off) on a
1473 px-wide viewport, after the page has been scrolled. Not investigated; may deserve its own ticket.

## Comments

- 2026-11-18: Written from PR #154 QA. Reproduced on `main` with View voter details → Close → one History click.
