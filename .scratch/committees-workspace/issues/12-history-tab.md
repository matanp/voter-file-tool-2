# 12 - History tab

Type: task
Status: resolved
Blocked by: 04, 08
Parent: ../map.md

## Question

Execute plan §7.4 with what ticket 04 found is actually recoverable: petition outcomes, additions and replacements, resignations and removals, each with actor / date / reason / meeting context where present. Use user-facing labels like **Committee history** or **Election outcomes**, never **Petition Outcome Context**; add any new term to `apps/frontend/CONTEXT.md`. Petition outcomes are Admin-only ([leader-petition-visibility/01](../../leader-petition-visibility/issues/01-hide-petition-generation-and-outcomes-from-leaders.md), group B): the **Election outcomes** section, or the `petition_outcome` events in a merged timeline, never renders for Leaders, and the endpoint omits those events for them (see ticket 06's Comments).

Decide in the ticket (and record in the answer) whether it is one merged timeline or sectioned — that patch of fog on the map graduates here. Events 04 marked unrecoverable are omitted, not approximated.


## Answer

Built on branch `wave2-12` (from `committees-workspace` with 07, 08 and LPV-01 merged).

### Decision: sectioned, not one merged timeline

The tab has two `h3` sections, in this order:

1. **Election outcomes** (Admin only). One row per petition candidate: seat, candidate, result (Won / Lost / Tie), votes, and primary date, plus a won/lost/tied count and a link to the filtered `/admin/petition-outcomes` page. It is built from `detail.petitionContext`, not from history events.
2. **Committee history** (everyone who can open the committee). One newest-first timeline of `detail.history.events`. For an acting Admin it also includes the `petition_outcome` events ("Election result recorded: won seat 2"), which carry the actor and recording date.

Rationale:

- **Completeness.** History is capped at 50 audit rows, newest first. Election results are recorded at the start of a term, so they are the first events the cap cuts off. A section built from history events would quietly show an incomplete list of results under a heading that implies it is complete. `petitionContext` is uncapped and current, so the section is always complete for the term. It is also the same data as the old `CommitteeSelector` "Petition outcomes" panel, which gives ticket 16 parity when it deletes that panel.
- **One gate.** For Leaders the whole section is absent: there is no heading, empty state or count. The timeline drops one event kind. Both checks hang off a single `isAdmin` in `HistoryTab.tsx`.
- **The timeline is still the merged view.** Admins see the petition events in date order, so the timeline answers "what happened, when, and who did it". It also answers when a petition winner joined: Admins see that in the folded `petition_outcome` event, and Leaders see the plain `activated` event that LPV-01 emits. The section answers "who won each seat". The two answer different questions, so the overlap is deliberate.

### What the tab shows

Shared copy lives in `tabs/history/historyModel.ts` as pure functions:

- **Each event shows:** date (`<time dateTime>`), actor ("by Admin Jane Doe", or "by an Admin" when the name is withheld), a title, the member and seat, and one detail line per recorded fact.
- **Reasons:** removal and resignation reason labels, notes, the request note, rejection note or capacity auto-rejection, override reason, and the eligibility-warning count.
- **Meetings:** "At the Executive Committee meeting of Feb 28, 2026", plus meeting notes for Admins.
- **Resignations:** "Resignation received <date> by email".
- **Replacements:** "To replace …" on a submission, and "Replaced by …" on the outgoing removal.
- **Provenance from `source`:** "Added by a committee file import", "Removed after an eligibility flag review", "… when a discrepancy resolution was undone". A reversed petition row says "Restored when a discrepancy resolution was undone, not a new result".
- **Unrecoverable facts are not filled in.**
  - A plain Admin add has no reason line.
  - Nothing gets meeting context except accept and reject.
  - An Admin replace shows as its separate remove and add events.
  - Leaders' `activated` events with `source: "other"` read simply "Added".
- **Election outcome results:** a candidate whose membership has since moved on is shown as "Now resigned" (the current status that `petitionContext` reports), not as a guessed result.
- **Empty states:** "No committee history recorded for this term yet." For an Admin with `petitionContext: []`: "No election outcomes recorded for this committee this term."
- **`hasMore`:** a note below the timeline: "Showing the most recent events only. Older history for this term is not shown here."

### Gating (defence in depth)

- **The rule.** `isAdmin = hasPermissionFor(actingPermissions, Admin)`. Election outcomes render only when `isAdmin && detail.petitionContext !== undefined`. `petition_outcome` events are filtered out of the timeline unless `isAdmin`. The same flag gates the Admin-only fields the server sends: staff names, notes, reasons, method, replacement names, and membership type.
- **Why gate on the client too.** A Developer acting as Leader receives the Admin body from the server, because the server authorizes on the real session. The UI therefore has to hide that data on its own. Below Admin, the tab shows exactly what a real Leader would see.
- **Membership type.** Shown to Admins only. Whether "petitioned" counts as a petition reference for Leaders is still unresolved (group C), and keeping it behind this one switch makes the answer a one-line change.

### Files

- `apps/frontend/src/app/committees/workspace/tabs/HistoryTab.tsx` (replaced the stub)
- `apps/frontend/src/app/committees/workspace/tabs/history/historyModel.ts`, `CommitteeHistoryTimeline.tsx`, `ElectionOutcomes.tsx` (new)
- `apps/frontend/src/__tests__/components/committees/HistoryTab.test.tsx` (new, 15 tests)
- `CONTEXT.md`: new "Committee records" section with **Committee History** and **Election Outcome**. The ticket names `apps/frontend/CONTEXT.md`, but that file does not exist and the repo is single-context (`docs/agents/domain.md`), so the terms went into the root glossary.

### Tests

`HistoryTab.test.tsx` renders the tab directly inside a `GlobalContext` provider:

- **Admin:** both sections as `h3` in order, no "Petition Outcome Context" wording, and the outcomes table rows, counts and link. The timeline shows actor, date, reason, notes, meeting and request note for each kind, and a plain add has no invented reason or meeting.
- **Admin edge cases:** the empty outcomes state, and the reversed petition label.
- **Leader** (the Leader-shaped body): only Committee history, and the petition win reads as a plain "Added" with no petition, vote, primary or election text.
- **Defence in depth:**
  - Acting Leader with an Admin-shaped body: the real-Leader case, and separately the Developer-acting-as-Leader case.
  - Acting RequestAccess: hidden as well.
  - Acting Developer: sees the Admin view.
  - Mutation-checked: forcing `isAdmin = true` fails the three hiding tests.
- **States and pure helpers:** the empty history state, the `hasMore` note, system-source titles, and the pure `electionOutcomeRows` / `electionOutcomeCounts` helpers.

`CommitteeWorkspace.test.tsx`: the "renders each tab's registered component" test expected each tab's `h3` to equal its tab name. It now maps History to "Committee history"; this is a one-line `sectionHeading` lookup, and other tabs default to their name. Tickets 09 and 10 may touch the same lines, so expect a small merge there.

### Gate (2026-10-09)

- `test`: 116 suites / 1568 tests. 2 suites (9 tests) fail: the known pre-existing `committeeDiscrepancyMembershipType` and `CommitteeRequestForm.preflight`. Nothing else fails.
- `lint`: 0 errors. The 12 warnings are all pre-existing, in files this ticket does not touch.
- `build`: passes.
- `check:api-routes`: passed (70 methods / 60 files). No routes were changed.

## Comments

- **Endpoint follow-up for real paging (not done; out of this ticket's file ownership).** `loadMembershipHistory` takes `limit + 1` audit rows, then filters them and collapses some into others. As a result, a page can show fewer than 50 events while `hasMore` is true. This happens for Admins when CONFIRMED/ACTIVATED pairs are folded together, and for Leaders when `PETITION_RECORDED` rows are dropped.
  - **What real paging needs:** a keyset cursor on the detail endpoint, or a separate `GET /api/committee/{id}/history?before=<timestamp>,<auditLogId>`, ordered by `(timestamp desc, id desc)`. That ordering also needs `id` as a tiebreak, because the accept tx writes CONFIRMED and ACTIVATED with the same timestamp. The response should return `nextCursor` instead of `hasMore`.
  - **Leader page fill:** the loader should keep fetching until it has `limit` *visible* events for the reader, or accept short pages.
  - **Tab change:** a "Show older events" button that appends pages. The tab would own that local state, which is safe because it remounts per committee.
- **Not checked in a browser** (needs a DB and a session): the 375px layout. The outcomes table scrolls horizontally inside the tab (`overflow-x-auto`), and long note text wraps (`break-words`). Ticket 15 verifies this by hand.
