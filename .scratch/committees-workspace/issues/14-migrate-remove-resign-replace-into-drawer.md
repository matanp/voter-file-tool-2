# 14 - Migrate removal, resignation, and Leader replacement into the drawer

Type: task
Status: resolved
Blocked by: 13
Parent: ../map.md

## Question

Execute plan §9: move the resignation and removal dialogs out of `CommitteeSelector.tsx` into the shared drawer as `remove-member` and `record-resignation`, and wire Leader `replace-member` submission through `requestAdd` with the stored target as today.

Preserve every domain requirement: removal requires a reason, **Other** requires notes, resignation requires received date and method; eligibility and warnings stay server-decided; privileged mutations stay auditable. Thin adapters only — no command-service changes (out of scope on the map). Run the §12.3 checklist.

## Answer

Built in Lane A right after 13, on the same branch. With both landed, every `RosterRowAction` kind opens the drawer.

### Removal and resignation

- `workspace/adapters.ts` gains `submitRemoval` and `submitResignation`. Both post to the unchanged `/api/committee/remove` on the composite key: the removal sends `removalReason` and optional `removalNotes`; the resignation sends `action: "RESIGN"`, `resignationDateReceived`, `resignationMethod`, `resignationReason`, and optional `removalNotes`. The LD sentinel is omitted.
  - The body types are `z.input` of `removeCommitteeDataSchema` / `resignCommitteeDataSchema`, and the tests parse them with those schemas.
  - Failures normalize to `{ ok: false, kind: "error" }`. That includes the endpoint's `{ status: "error" }`, which it sometimes sends with a 200.
  - Success messages are the existing toast copy ("Committee member removed successfully" / "Resignation recorded successfully").
- `removalProblems` and `resignationProblems` are the domain requirements as user-facing text: a reason; notes for **Other**; for a resignation, also the received date and the method. The endpoint's schemas still enforce the same rules.
- `workspace/drawer/MemberExitForms.tsx` has `RemoveMemberForm` and `RecordResignationForm`:
  - who is leaving ("Sam Seated (V-SEATED), seat 1"), and for a removal "This is an administrative removal, not a resignation";
  - a native `<select>` for the reason (shared `REMOVAL_REASON_LABELS`, now in `src/lib/removalReasonLabels.ts` and also used by `historyModel.ts`, which drops its copy);
  - notes labelled "(required)" or "(optional)" depending on the reason; a date input and Email/Mail radios for the resignation;
  - **Remove member** / **Record resignation** stay disabled until the requirements are met, and a "To continue:" list beside them names what's missing (`aria-describedby`), so the state isn't signalled by a greyed-out button alone;
  - a failure shows an alert in the form, the drawer stays open, and the button retries.
- `CommitteeActionDrawer` renders these forms for `remove-member` / `record-resignation` when the acting privilege is Admin (the row menu only offers them to Admins). Anyone else gets "Your role can't change this committee." Success follows the same path as 13: toast, `onComplete` (detail plus grid-row refresh), close, and focus back on the row trigger.

### Moved out of `CommitteeSelector.tsx`

The two dialogs' state (eight `useState`s), `removeCommitteeMemberMutation`, the submit handlers, the payload type, the local label map, and about 190 lines of dialog markup are gone. What's left is one `Dialog` shell. Its title stays "Record Resignation" / "Remove Member", and it renders the same `MemberExitForms` with `Footer={DialogFooter}`. On success it closes, refetches the detail (`fetchCommitteeList`) and roster, and toasts, as before. Ticket 16 deletes the shell together with the selector.

Two behaviour changes in the legacy UI:
- A failed removal now stays open with the error inline. It used to close the dialog and toast.
- The reason and method pickers are native controls instead of Radix `Select`.

### Leader replacement

Already wired in 13 and unchanged here. `replace-member` for Leader/RequestAccess is the add flow with the occupant preselected as the replacement target. It submits via `requestAdd` with `removeMemberId`, the stored target that Admin's `handleRequest` resolves on accept. It is never offered to Admin (plan §8, "Replacement in v1"). Eligibility and warnings come from the server preflight and from `requestAdd`'s own check.

### Tests

- `adapters.test.ts` (+7, 20 total): removal and resignation bodies against the schemas; blank notes and the sentinel omitted; a status error with and without a 200; the requirement lists.
- `CommitteeActionDrawer.test.tsx` (+4, 19 total): removal is blocked until a reason is chosen, and for Other until notes are entered, then posts, toasts, completes and closes; a server error keeps the drawer open; a Leader gets no form; a resignation is blocked until date, method and reason are given, then posts.
- `CommitteeWorkspace.drawer.test.tsx` (+1, 4 total): removing from the roster refreshes the grid row (1/4 → 0/4) and the detail, keeps the selection and URL, and returns focus to "Actions for seat 1".
- `CommitteeSelectorRemoveModal.test.tsx` was a placeholder (`expect(true)`). It now drives the legacy dialogs end to end (remove with Other and notes; resign), checking the posted bodies, the detail refetch, and the toast.

### §12.3 checklist

- Trust boundary, negative auth: no new or changed routes. `/api/committee/remove` stays `withPrivilege(Admin)` with its tests (`remove.test.ts`). The client gate is `actingPermissions` only (skills/auth-check-patterns).
- State race, data scope: unchanged endpoint.
- Validation: the bodies are the endpoint's Zod inputs, tested against the schemas. The client requirement checks only decide when the button is enabled.
- Audit and invariants: removal and resignation still go through the endpoint, which logs `MEMBER_REMOVED` / `MEMBER_RESIGNED` with the actual session role. There are no command-service changes.
- Gate (lane end): lint, build and `check:api-routes` pass. `test` has 2 failing suites, both failing on the branch base `8413196` before this lane: `CommitteeRequestForm.preflight.test.tsx` and `api/admin/committeeDiscrepancyMembershipType.test.ts`. `main` fixes both in `c365690`, which arrives when ticket 16 merges `main`.

### Lane review follow-up (code-review against `8413196`)

Fixed:
- **Spec**
  - The Admin add now carries the server's nonblocking warnings into the success toast. `requestAdd` already did.
  - Search won't run with nothing to narrow by, which would page through the whole voter file. It is disabled, with a hint.
  - A mutation that finishes after its drawer was closed still refreshes, but no longer closes a later opening. Openings are tracked by `generation`.
  - Focus is restored even when the row is gone (removing an unassigned member). The drawer falls back to the committee `h2` at close, and the workspace re-checks focus after the refresh settles.
  - The drawer keeps the last loaded detail, so a failed or slow background refresh doesn't close it and lose a half-filled form.
  - Added tests for the search-failure and retry path.
- **Standards**
  - Client `fetch` mocks are centralized as `installFetchMock` / `fetchJsonResponse` in `__tests__/utils/mocks.ts` (skills/test-type-safety). The four new or changed test files use them, with no call-site casts.
  - New shared helpers: `occupantLabel` (replaces two copies), `useActionSubmit` (replaces three copies of the submit state), and `hasLegDistrict` (the sentinel check).
  - The `RosterRowAction` / `RosterCommitteeRef` / `RosterTabProps` aliases and the `committeeRefFrom` re-export are gone; callers import from `committeeAction.ts`.
  - The remount key is renamed `generation`, and the summary rows no longer need casts.
- New tests: `CommitteeActionDrawer.test.tsx` (22) covers stale close, the empty-search guard, and search failure. `CommitteeWorkspace.drawer.test.tsx` (6) covers the focus fallback for an unassigned member and a failed refresh with a later drawer open. Mutation checks confirmed the stale-close and failed-refresh tests fail without their fixes.

Deferred or kept, for the orchestrator or human:
- **Seat destination** stays "Next open seat". `add` and `requestAdd` can't target a seat (13's Answer). This deviates from plan §8 "explicit … seat destination" and needs product sign-off; targeting a seat would be a command-service change.
- **Admin override UI** (13) is new capability, built from "override reason where permitted". The human can veto it.
- **Toast copy** "Submitted your request for approval" is kept. It is the existing toast (13: "existing success toast"), although `CONTEXT.md` lists "request" under _Avoid_ for **Submission**. A copy change belongs with ticket 16.
- The legacy `Dialog` shell, the `Footer` / `bodyClassName` props on the exit forms, and the remaining `toast` / `GlobalContext` `jest.mock` copies all go away with `CommitteeSelector` in ticket 16.
- The eligibility preflight response is cast, not Zod-parsed: `EligibilityPreflightResponse` is a server type with no schema. Adding one is a small follow-up.
