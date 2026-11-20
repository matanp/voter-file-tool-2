# QA sweep — 2026-11-18 (browser, local + prod smoke)

Status: needs-triage

Ticketed 2026-11-19: see [tiers.md](tiers.md).

Hands-on testing with Claude in Chrome. **Local** (`localhost:3000`, `COMMITTEES_WORKSPACE=1`, local Docker DB) was
tested as Developer and as Leader (ROCHESTER LD 17), with data changes allowed. **Prod**
(`opensourcepolitics.online`) got a **read-only** smoke test as Developer: no submits, edits, report runs or other
writes.

Goals: (1) information architecture and UX flows, (2) screen-reader accessibility, (3) bugs and rough edges.

---

## Summary

The committees workspace is in good shape. The add, remove, submit and confirm-exit flows all work. The drawers have
accessible names, step headings, focus moves into them, the remove dialog explains what's blocking it ("To
continue: Choose a reason"), and member search reports results through a status region. Prod was clean: no console
errors on any page I opened, and API latency was 0.4–2 s.

Highest-impact findings:

1. **Prod shows every DOB one day early (prod-only).** `new Date(DOB).toLocaleDateString()` renders a date stored at
   UTC midnight in the browser's time zone, so any US browser shows the day before. Local data is mostly stored at
   Pacific midnight, which hides the bug on a West Coast machine.
2. **The add/submit drawer drops field errors.** If you enter an invalid email, the server returns
   `{ email: 'Invalid email format' }` but the drawer shows only "Something went wrong / Invalid request data", and
   focus drops to `<body>` outside the dialog. The phone field takes anything (`abc` was accepted and stored).
3. **"Only eligible candidates" doesn't filter by party.** With the box checked, the search returned BLK and REP
   voters. Picking one then shows "Ineligible: Party does not match" in step 2.
4. **A duplicate Leader submission reports "Success" but does nothing.** Submitting the same voter again went
   through every step and showed "Submitted your request for approval", but only one row exists. Nothing in the
   roster or search results says the voter is already pending.
5. **Screen readers read committee buttons wrong.** The sidebar ED buttons compute names like "Brighton ED 14/4
   seats filled" for ED 1 (4/4), so "ED 1" plus "4/4" is heard as "ED fourteen…". There are 659 of these buttons, all
   in the tab order.

## Recommendations (in priority order)

1. **Fix DOB display now, separately from the date-handling epic.** Format calendar-date fields in UTC
   (`toLocaleDateString('en-US', { timeZone: 'UTC' })`) in `recordsearch/fieldsConfig.tsx:210,333` and
   `VoterCard.tsx:74`. That's correct for the ~97% of rows at UTC midnight. The Pacific-midnight rows (about 2.5%)
   still need the backfill in `.scratch/date-handling/`. Check exports too.
2. **Show server field errors in the drawer, and validate email and phone on the client** before step 4. Put
   each error next to its field and move focus to the first invalid field, or at least keep focus inside the drawer
   on the error alert.
3. **Make "Only eligible candidates" apply the party rule as well** (or rename it to "Only voters in this
   assembly district"). Either way, show ineligible rows with a reason instead of letting someone pick them and only
   find out at step 2.
4. **Block or flag duplicate pending submissions.** Show "Already pending for this committee" in the search
   results and step 2, and return a real error (409) instead of a silent no-op with a success toast. Show pending
   candidates in the roster (e.g. "1 candidate pending" on the vacant row) so a Leader doesn't submit again.
5. **Screen-reader quick wins** (each is small):
   - Put spaces or punctuation into the ED button name, e.g. `aria-label="Brighton ED 1, 4 of 4 seats filled"`.
   - Give each page its own `<title>`. Every page is "Open Source Politics", so tabs, history and screen-reader page
     announcements can't tell them apart.
   - Give the 100 "See more details" buttons the row's voter (`aria-label="Details for <name>, born <dob>"`). On close,
     the details popover should return focus to its trigger (focus stayed on the closed popover's content div) and
     needs an accessible name.
   - Announce the result count after a record search. The polite live region is there but stays empty.
   - Wrap radio groups in `fieldset`/`legend` (Vacancy Report "Scope" and "Vacancy Filter", plus other report
     forms).
   - Label the unlabeled controls: the Advanced search "Street" input, the chip remove "×" buttons, the Audit Trail
     From/To date inputs and pagination arrows, and the icon buttons on report cards in My Reports.
   - Give the unnamed `<nav>` landmarks labels (two of the three on admin pages have none). Set `aria-current` on
     the active admin sidebar link.
6. **IA cleanup** (see the section below): one name for "Committee List" / "Committees", keep admins in the admin
   shell, cut audit-log noise, and use one vocabulary for membership events.
7. **Report errors:** when the report server can't be reached, say "Report service unavailable, try again
   later" instead of "Internal Server Error". Replace the three native `confirm()` dialogs (report delete, failed
   report delete, invite revoke) with the app's dialog component.

---

## What I did

### Local, as Developer
- Home → Record Search (simple and advanced, last name "Smith", 3,992 results, details popover, Escape).
- Committees workspace: browsed the town/ED sidebar, member search ("hooper"), filter chips, phone-width layout
  (500 px, the minimum window width) and the mobile menu.
- **Add member** to Brighton ED 2 seat 4: candidate search, picked an ineligible voter (party), went back, picked an
  eligible one, entered an invalid email → server 422, fixed it → added. Then **removed** the member with reason
  "Other" plus a note. ED 2 ends back at 3/4.
- History and Seats & Weight tabs, Reports dashboard, Vacancy Report generation (fails locally because the report
  server wasn't running), the Admin audit trail, **Pending review → confirmed one reported removal** (ROCHESTER
  LD 17 ED 1 seat 2), and the Profile drawer.

### Local, as Leader (ROCHESTER LD 17)
- The workspace auto-scopes to Rochester / LD 17 (8 EDs). **Submitted a candidate** for ED 1 with phone `abc` (it was
  accepted). Then submitted the same voter again (showed "Success", but nothing new was stored). Checked the Pending
  tab, the reduced Reports list, and the `/admin` denial.

### Prod, read-only, as Developer
- Home, Committees (ED detail, Seats & Weight, mobile width), Record Search (read query), Reports, Pending
  requests, Admin audit trail. Watched console errors and network timings.

### Local data changes left behind
- Brighton ED 2: one add and one remove of the same voter (net zero; two audit rows).
- ROCHESTER LD 17 ED 1: the reported removal of seat 2 was **confirmed** (seat 2 is now vacant), and **one pending
  submission** for ED 1 has phone `abc` and note "QA test submission".
- Test sessions were cleaned up. Your local browser session row was briefly pointed at the Leader user and then
  restored to Developer.

---

## Findings in detail

### Bugs

| # | Where | What happens | Severity |
|---|---|---|---|
| B1 | Record search, voter card (**prod**) | DOB shows one day early. The same voter (same phone) shows their DOB one day later locally than in prod. Cause: `toLocaleDateString()` on a UTC-midnight instant. `originalRegDate` (fieldsConfig.tsx:333) has the same problem. | High |
| B2 | Add/Submit drawer, step 4 | Invalid email passes steps 3 and 4. The server's field error (`Invalid email format`) is swallowed and shown as "Invalid request data". Focus moves to `<body>`. | High |
| B3 | Add/Submit drawer, step 3 | The phone field has no validation; `abc` is stored as contact info. | Medium |
| B4 | Candidate search | "Only eligible candidates" (checked) still lists other-party voters, which step 2 then marks as ineligible. Step 2 also shows "Warning state: Clear" directly above the red "Ineligible" box. | Medium |
| B5 | Leader submit | A duplicate submission of a voter who's already pending shows a success toast but stores nothing. Nothing tells the user it's a duplicate. | Medium |
| B6 | Add member (Admin/Dev) | The success toast appears 3–4 s before the roster updates, so the seat still shows "— vacant — + Add member" right after "added successfully". Focus goes to "Actions for seat 4", which doesn't exist yet. (Remove handles this well: focus goes to the committee H2.) | Low |
| B7 | Record search popover | After Escape, focus isn't returned to the "See more details" trigger. | Low (SR/keyboard) |
| B8 | Advanced search toggle | Clicking "Advanced search →" when results are showing opens the form above the viewport, so it looks like nothing happened. | Low |
| B9 | Committees page load | The nav renders without Admin / View Profile (shows "…") until the session loads. The "Find a member" field also appears late and pushes the filters down. | Low |
| B10 | Reports dashboard | "1 reports have failed". The failed job gives no reason and no retry, only delete (native `confirm()`). | Low |
| B11 | Report generation | When the report server is down, the user sees a raw "Failed to generate report: Internal Server Error" toast. | Low |

**Not a bug (local data only):** locally, Seats & Weight shows seat weight 7.4375 under a header of "LTED weight
29.75 per seat", because every local `Seat.weight` is the old ÷4 value. Prod shows 29.75 per seat and designation
weight 89.25, which is correct. Re-import or backfill the local weights (see
`.scratch/leader-feedback-2026-11/issues/02`) so local QA doesn't flag it again.

### Screen-reader accessibility

What works: drawers are `role=dialog` with a name, step headings take focus, the member-search status region,
`aria-current="page"` on the top nav, named seat action menus ("Actions for seat 3"), tabs with `aria-selected`,
filter chips with `aria-pressed`, the remove dialog's "To continue" guidance, and focus moving to the H1 after
confirming an exit.

| # | Issue | Fix |
|---|---|---|
| A1 | ED buttons get names like "Brighton ED 14/4 seats filled" because adjacent spans have no separator | `aria-label` with commas, or add a separator in the sr-only text |
| A2 | Every page's `<title>` is "Open Source Politics" | Per-route `metadata.title` ("Committees · Brighton ED 2 — Open Source Politics") |
| A3 | 100 identical "See more details" buttons | Include the voter's name in the label |
| A4 | Details popover has no accessible name; focus isn't returned on close | `aria-labelledby` pointing at its H2, and return focus to the trigger |
| A5 | Record-search result count isn't announced (empty polite region) | Write "3,992 voters found" to the region |
| A6 | Error after submit drops focus to `<body>` | Move focus to the error alert, or the first invalid field |
| A7 | Radio groups without `fieldset`/`legend` (report forms) | Wrap them |
| A8 | Unlabeled: Advanced "Street" input, chip "×" remove, audit From/To dates, audit pagination arrows, report-card icon buttons | Associate labels or add `aria-label` |
| A9 | Unnamed `<nav>` landmarks; no `aria-current` on the active admin sidebar link | Add labels and `aria-current` |
| A10 | Heading order: home H1→H3; Reports "Report Jobs" H3 before the first H2; "My Reports"/"Public Reports" are H3 under nothing | Overlaps `.scratch/ui-page-consistency/issues/01` |
| A11 | 659 sidebar buttons are all tab stops | Roving tabindex (arrow keys within the list) or a "skip to committee detail" link |
| A12 | No skip link on any page | Add "Skip to main content" |
| A13 | Advanced search input names read "Enter Last Name (part 2)" | Drop the "(part N)" suffix |
| A14 | Profile role picker is named "Select Choose role"; the mobile menu opens with focus on its last item (View Profile) | Fix the label; focus the first item |
| A15 | Data tables have no caption and no `scope` on `th` (record results, roster, audit) | Add a caption, sr-only is fine. Seats & Weight already does this. |

### Information architecture and UX flows

1. **Naming:** the nav says "Committee List" but the page says "Committees", and the home page button says
   "Manage Committees". Pick one name ("Committees").
2. **Admin "Pending review" leaves the admin shell.** It goes to `/committees/requests`: the admin sidebar
   disappears, the top nav highlights "Committee List", and the content sits in a 240 px column on a 1500 px screen
   with no way back. Ties into `.scratch/committees-workspace/issues/22` (requests page into workspace).
3. **Requests page copy contradicts itself:** "Review and reject individually below. Confirmations are processed via a
   meeting record", yet every card has a working **Confirm** button. Group headers read "ROCHESTER, 17, 1" where the
   workspace says "Rochester · LD 17 · ED 1".
4. **Audit trail:** prod's first page is entirely "Seat Petitioned (Backfill)" rows whose summaries are raw IDs
   ("Committee seat cmu6hnk2"). Hide system/backfill events by default, and show "Brighton LD 45 ED 2 seat 3"
   instead of IDs. Event names don't match either: the audit says "Member Activated" where History says "Added".
5. **Two search boxes stacked in the sidebar** ("Find a member by name" and "ED number or town") with different
   behavior. Member search replaces the ED list. Consider one box with a scope toggle, or clearer labels.
6. **Record search results** show only name, DOB and phone, so there are many identical "AARON SMITH" rows. Add town
   or address and party to the row. The details popover has no actions (no "add to committee", no link to the
   voter's committee).
7. **Candidate search** shows "first 10 of 674" with no paging. That's fine as a nudge, but say which fields narrow
   it (voter ID is fastest). Step 4 says "Seat: Next open seat" even when the user started from a specific seat's
   "Add member".
8. **Jargon visible to Leaders:** a raw "VRCNUM <number>" on the Pending tab (related to
   `.scratch/committees-workspace/issues/21`), "Committee's Assembly District 136" next to "LD 45" in the
   eligibility snapshot (two names for districts in one panel), and "petitioned vacant" on the roster (see
   `leader-petition-visibility`).
9. **Reports:** the first panel is titled "Report Jobs" for admins and "Pending Reports" for Leaders. "Committee
   Roster" and "Committee Report (Advanced)" overlap. Report forms have no "← Reports" link back.
10. **Seat menu** has no "Edit contact info". Fixing a member's phone or email means removing and re-adding them.
11. **Leaders can't withdraw** a pending submission from the Pending tab.

### Prod-specific observations
- No console errors on any page visited.
- Timings: committee detail 0.6–2.0 s, roster 0.4–0.6 s, record search 1.6 s, one `/api/auth/session` at 1.6 s (it's
  called twice on load). Switching tabs makes a `/committees` RSC round trip per tab (known:
  `.scratch/committees-workspace/issues/23`).
- Prod data differs from local (4,389 vs 3,992 "Smith" results; ED 1 is 3/4 in prod), so local QA numbers won't match
  prod.
- The B1 DOB bug is the one finding that is worse in prod than locally.
