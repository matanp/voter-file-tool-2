# 13 - Action drawer: add-member and submit-candidate flows

Type: task
Status: resolved
Blocked by: 09 (resolved), 03 (resolved)
Parent: ../map.md

## Question

Execute plan §8: one `CommitteeActionDrawer` (on `components/ui/sheet.tsx`) driven by the `CommitteeAction` discriminated union, with adapters in `committees/workspace/adapters.ts` translating actions into the current `add`/`requestAdd`/`remove` request bodies using the composite key from `CommitteeRef`. The drawer never sees endpoint URLs; the caller provides the action and handles completion.

This ticket covers `add-member` and `replace-member` (add with a preselected replacement target, via `requestAdd` for submission roles; not offered to Admin). Four steps in one drawer, no nested dialogs: find candidate (voter id / names, **only eligible** filter), review (hard stops, warnings, membership/capacity), details (membership type, email, phone, override reason where permitted), confirm (explicit destination, role-appropriate label — **Add member** / **Submit candidate** / none for ReadAccess, per ticket 03's answer). Full-screen sheet on mobile; focus trap, Escape, focus restore.

After success: close, refresh detail and the affected grid row, preserve filters/selection/tab, existing success toast. Tests (plan §12.2): candidate search/selection; eligible, warning, hard-stop, retry, full-committee states; successful add refreshing both panes; drawer reset and focus restoration. Run the §12.3 checklist.

## Answer

Built in Lane A (wave 3), on a worktree branch off `committees-workspace`. It lands together with 14, so no roster action is ever dead.

### Modules (`apps/frontend/src/app/committees/workspace/`)

- `committeeAction.ts` defines plan §8's `CommitteeRef` and the full `CommitteeAction` union, 14's kinds included, plus `committeeRefFrom` and `CommitteeActionHandler = (action, returnFocusTo?) => void`. `tabs/roster/rowActions.ts` keeps `RosterRowAction` / `RosterCommitteeRef` as aliases of these types, so its producers didn't change.
- `adapters.ts` is the only place that knows endpoint URLs:
  - `candidateSubmissionMode(action, actingPermissions)` returns `"add"` (Admin and above), `"submit"` (Leader and RequestAccess), or `null` (ReadAccess, and Admin on `replace-member`).
  - `candidateSearchQuery` builds the search. **Only eligible** restricts it to the committee's city, `L_T` and ED, as the legacy form does.
  - `searchCandidates` (`/api/fetchFilteredData`, page size 10, response parsed with Zod down to the fields the drawer shows), `fetchCandidateEligibility` (`/api/committee/eligibility`).
  - `submitCandidate(action, mode, details)` posts to `add` or `requestAdd` and normalizes the result to `{ ok: true, message }`, `{ ok: false, kind: "ineligible", reasons }`, or `{ ok: false, kind: "error", message }`. The success messages are the existing toast copy, including the idempotent add and the appended `requestAdd` warnings.
  - Bodies are typed as `z.input` of the endpoints' schemas, and the tests parse them with those schemas.
  - The LD sentinel (`-1`, for towns without LDs) is never sent: `legDistrict` is omitted, as the endpoints expect.
- `drawer/CommitteeActionDrawer.tsx` is the `Sheet`: right-hand on desktop (`md:w-[34rem]`), full screen below `md`.
  - The title is the role's verb (**Add member** / **Submit candidate** / **Replace member**). The description is the committee label ("GREECE · LD 1 · ED 5").
  - Radix provides the focus trap and Escape.
  - On close, focus returns to `returnFocusTo`: the row's menu trigger, because the menu item that opened the drawer is gone by then. The drawer keeps it along with the last action, so it outlives the caller clearing its state. A flow is remounted for every new action, so nothing carries over between openings.
  - On success it shows the toast, calls `onComplete`, and closes.
  - ReadAccess gets "Your role can't change this committee." and **Close**.
- `drawer/AddMemberFlow.tsx` runs the four steps. Each step has an `h3` with "Step n of 4" in text, and focus moves to it when the step changes. **Back** keeps the search results.
  1. **Find candidate** (`CandidateSearchStep.tsx`): Voter ID, First name, and Last name, plus **Only eligible candidates** (on by default). The results are a compact list labelled "Candidates", with a count and a "narrow the search" note past 10. Existing members are listed as "Already on this committee" and can't be selected. On `add-member` to a full committee (`rollup.filled + unassignedCount >= maxSeatsPerLted`, all server counts), an alert says so and **Select** is disabled. A replacement isn't blocked this way.
  2. **Review candidate**: identity, then the existing `EligibilitySnapshotPanel` fed by `useCandidateEligibility`, which aborts on a candidate change. It shows loading, failure with **Retry eligibility check**, hard stops, warnings, and seats. **Continue** needs a clean preflight. For an Admin with hard stops it offers **Override these hard stops** instead.
  3. **Membership details**: Admin only, the membership type as native radios (Appointed is the default, as today). Everyone gets contact email and phone (`ContactInfoLabel`). Submission roles get **Notes for the reviewer** (`requestNotes`). An override adds **Override reason (required)** (max 500), which is sent as `forceAdd` + `overrideReason`, so the server decides what is overridable and audits it.
  4. **Confirm**: a "Summary" list showing the committee, seat, candidate, type, contact, notes, and override reason. **Add member** or **Submit candidate**. Submissions say the candidate isn't on the committee until an Admin accepts. A server `INELIGIBLE` ("Cannot add member" / "Submission blocked", plus the escalation line) or any other error shows as an alert in the step, the drawer stays open, and pressing the button again retries.
- `CommitteeWorkspace.tsx` owns the open action, as the plan says, and renders the drawer with the loaded detail.
  - `onComplete` is the existing `refreshDetailAndGrid`, the same cross-pane refresh as ticket 10. It never writes the URL, so selection, tab and filters stay put.
  - The drawer closes if the selection moves away underneath it (browser Back).
- `CommitteeDetailPane` → `CommitteeTabs` → tab passes `onAction`. It is **optional on `CommitteeTabProps`** so that Lane B's `SeatsWeightTab` tests don't break. `CommitteeTabs` always passes it. `RosterRowActionMenu` dispatches `(action, triggerElement)`.

### Decisions made here

- **Seat destination.** `/api/committee/add` assigns the next open seat, and `requestAdd` assigns no seat (it's set on accept). Neither can target the seat the row action came from. So the confirm step says "Next open seat" (Admin) or "Next open seat, if the submission is accepted" (submission), rather than promising the clicked seat. A replacement shows "Replaces: Sam Seated (seat 1)". Seat targeting would be a command-service change, which is out of scope.
- **Admin override** ("override reason where permitted") is new UI over the existing `forceAdd` / `overrideReason` that `add` already honored for Admins. The client doesn't know which stops `CommitteeGovernanceConfig` marks non-overridable, so it offers the override on any hard stop. A non-overridable stop comes back as `INELIGIBLE` in the confirm step.
- Preflight runs for every role, as in `CommitteeRequestForm` (the legacy Admin form also ran it).
- `CONTEXT.md` gained **Submission**, **Hard Stop**, and **Eligibility Override**.

### Tests

- `src/__tests__/app/committees/workspace/adapters.test.ts` (13): mode per role; search query with and without the filter and the sentinel; add, override, idempotent, requestAdd and replace bodies against the real Zod schemas; ineligible, error and network outcomes.
- `src/__tests__/components/committees/CommitteeActionDrawer.test.tsx` (15): search and selection, including an existing member who can't be picked; unfiltered search and no results; full committee; eligible; warning; hard stop (Leader, no override); Admin override with a required reason; preflight **Retry**; Back; Admin add through the confirm summary, toast, `onComplete` and close; server hard stop, then a 500, then a successful retry; Leader submission (no type, notes, `requestAdd`); Leader replacement on a full committee; ReadAccess; Escape and Cancel.
- `src/__tests__/components/committees/CommitteeWorkspace.drawer.test.tsx` (3): an add from a vacant seat refreshes the grid row (1/4 → 2/4) and the detail row, with selection, tab, filters and URL unchanged and no `push`/`replace`. Focus returns to the row trigger after Escape and after success, and the next opening is fresh. A mutation check confirmed both focus tests fail without `returnFocusTo`.
- `RosterTab.test.tsx` now expects the trigger as `onAction`'s second argument.

### §12.3 checklist

- Trust boundary, negative auth, data scope: no new or changed routes. Every request goes to an existing wrapped endpoint (`add` Admin, `requestAdd` / `eligibility` RequestAccess, `fetchFilteredData` ReadAccess), which re-checks the actual session privilege and Leader jurisdiction. `actingPermissions` only picks which controls and endpoint the client shows (skills/auth-check-patterns), and a Developer acting as Leader is routed to `requestAdd`.
- State race: no new find-then-write. The endpoints keep their transactions and P2002 handling.
- Validation: the request bodies are the endpoints' Zod inputs, tested against the schemas. The search response is parsed with Zod.
- Audit and invariants: unchanged endpoints. An override goes through the server's `bypassedReasons` / `overrideReason` audit metadata.
- Gate: see 14's Answer. `CommitteeRequestForm.preflight.test.tsx` › "blocks submit when preflight returns hard stops" already fails on `committees-workspace` at `8413196`, before this lane. `main` fixes it in `c365690`, which reaches this branch when ticket 16 merges `main`.

## Comments

**2026-10-14, branch review (at `fdddbda`):** Roster row actions are visible but do nothing until this ticket lands. `RosterTab` defaults `onAction` to a no-op (`apps/frontend/src/app/committees/workspace/tabs/RosterTab.tsx:27`), so Admins see **Add member** / **Record resignation** / **Remove member**, and Leaders see **Submit candidate** / **Replace member**, and clicking them does nothing. Fine behind `COMMITTEES_WORKSPACE`, but don't set the flag in any shared environment before this ticket and 14 wire every `RosterRowAction` kind. Remove-member and resignation are ticket 14's, so after this ticket those two items are still dead. Either hide them until 14 or land 13 and 14 together.

**2026-10-14, decision:** no **Add another member** in v1. The drawer closes on success, as above. Revisit only if someone asks for it after real repeated use.
