# Committee Operations Workspace UI Implementation Plan

**Status:** Proposed  
**Related specification:** [COMMITTEES_WORKSPACE_REDESIGN_SPEC.md](./COMMITTEES_WORKSPACE_REDESIGN_SPEC.md)  
**Primary route:** `/committees`

## 1. Objective

Replace the current selector-plus-long-page experience with a split-pane
Committee Operations Workspace. The redesigned workspace should make committee
selection, roster management, weight configuration, pending review, and
membership actions distinct but connected workflows.

Keep `/committees` as the primary route and preserve existing authorization,
data-scope, and mutation behavior throughout the UI migration.

## 2. Target Experience

```text
Committees                         Current term
18 open seats · 3 pending         [Review pending] [Generate report]

┌ Committee list ──────────┬ Wheatland · ED 3 ────────────────┐
│ Filters                  │ 2 of 4 seats filled  [Add member]│
│                          │                                   │
│ Wheatland · ED 1   4/4   │ Roster | Pending | Seats | History
│ Wheatland · ED 2   3/4   │                                   │
│ Wheatland · ED 3   2/4 ◀ │ Selected tab                     │
│ Rochester · ED 1  1/4    │                                   │
└──────────────────────────┴───────────────────────────────────┘
```

Membership actions open in a contextual right-side drawer. On narrow screens,
the list and detail become consecutive full-screen views and the drawer becomes
full-screen.

## 3. Design Decisions

1. `/committees` remains the primary route.
2. The desktop layout uses a filterable committee grid and persistent detail
   pane.
3. The mobile layout uses list-to-detail navigation rather than forcing a
   compressed split pane.
4. The default detail tab is the roster.
5. Add, replace, remove, and resignation flows use one contextual action drawer.
6. LTED weight and designation-weight tools live together under **Seats &
   Weight**.
7. The UI initially calls existing mutation endpoints through narrow adapters;
   command-service consolidation is not a prerequisite for this redesign.
8. Actual server privilege determines authorization, data scope, PII, and audit
   identity. `GlobalContext.actingPermissions` controls client-only visibility
   and role simulation.
9. This plan inverts the specification's rollout order: the spec's Phase A
   (transition engine consolidation) is deferred and the UI ships first on
   adapters. Update spec §14 in the first PR so the two documents agree
   throughout the migration, not only at cutover.
10. Spec §16 open decisions resolved by this plan:
    - Decision 1: roster contact info stays Admin-only, matching the existing
      `includeContact` policy in `api/committee/roster/route.ts`.
    - Decision 3: `/committees` is fixed to the active term in v1; no term
      switcher.
11. Committee identity is `committeeListId` in the URL and in action objects,
    but every existing mutation endpoint (`add`, `requestAdd`, `remove`) keys
    on the composite `(cityTown, legDistrict, electionDistrict)`. Grid rows and
    detail responses must carry both so adapters can translate without a
    lookup.

## 4. Phase 0: Validate the Layout with a Throwaway Prototype

Build three read-only variants on the existing route. Expose them only in
development through a `?variant=` URL parameter.

### Variant A: Split Pane

- Committee grid on the left.
- Tabbed committee detail on the right.
- Contextual action drawer for mutations.

### Variant B: Full-Width Index and Detail

- Full-width committee table.
- Selecting a committee transitions to a dedicated full-width detail view.
- Back navigation returns to the preserved table state.

### Variant C: Dashboard with Expanding Detail

- Global metric cards and grouped committee sections.
- Selecting a committee expands an inline detail region.
- Actions remain near the selected committee.

Use realistic committee counts, vacancies, incomplete weights, pending
submissions, and member names. Stub all mutations.

Evaluate:

- How quickly a user can find an ED and determine its status.
- Whether roster and vacancy information are readable at normal laptop widths.
- Whether the add-member workflow preserves enough committee context.
- Behavior at 375px, 768px, and desktop widths.
- Keyboard navigation through selection, tabs, and the drawer.

Expected decision: promote Variant A and use Variant B's navigation behavior on
mobile. Capture the decision, then remove the prototype code from the production
branch.

Scope guard: Variant A is the expected winner and the current roster-first
`contentLayer` view in `CommitteeSelector.tsx` is already a working Variant B.
Build Variant A plus a 375px pass first; build B and C only if there is real
disagreement about the layout after seeing A. Keyboard navigation is verified
on the real shell in Phase 2, not on the prototype. Use the repo `prototype`
skill for the throwaway build.

## 5. Phase 1: Extend the Existing Read Models

Most of the workspace read model already exists. Do not add a parallel copy of
the vacancy and weight math.

- `GET /api/committee/roster` already returns one `EdRollup` per committee
  (`filled`, `totalSeats`, `unassignedCount`, `designationWeight`,
  `missingWeightSeatNumbers`) plus a scope-wide `summary`, with jurisdiction
  scoping and Admin-only contact.
- `GET /api/fetchCommitteeList` already returns the single-committee detail
  (memberships, seats, designation-weight summary, petition context).

### Grid: extend `/api/committee/roster`

- Make `cityTown` optional so a single call can return every committee in the
  user's scope (all towns for Admin; jurisdictions for Leader). Keep the
  existing `cursor`/`limit` pagination and use it — Admin scope is every ED in
  the county.
- Add `committeeListId` and the composite key to each `EdRollup`.
- Add a `pendingCount` per rollup and aggregate open-seat, pending, and
  active-membership counts to `summary`.
- Add available filter values (towns, leg districts) to the response.
- Allow `rows` to be omitted (`includeRows=false`) so the grid does not pay
  for every seat row it will not render.

### Detail: `GET /api/committee/{committeeListId}/detail`

A `committeeListId`-keyed route that composes what `fetchCommitteeList`
already computes and adds:

- Pending memberships for the committee.
- Recent membership history (additions, replacements, resignations,
  removals with actor, date, reason, and meeting context when available).
- The composite key, for mutation adapters (Design Decision 11).

Reuse the same builders as `fetchCommitteeList`; extract shared helpers rather
than copying. `fetchCommitteeList` is retired in Phase 7 once nothing calls it.

Define and validate both responses with Zod in
`apps/frontend/src/lib/validations/committee.ts`.

Requirements:

- Scope every response using the user's actual server-side privilege and
  jurisdiction.
- Omit PII fields for users who cannot access them.
- Never treat client capability flags or `actingPermissions` as authorization.
- Do not fetch detail for every committee when loading the grid.
- Return already-computed row summaries to avoid client-side N+1 requests.
- Use `withPrivilege`, `withBackendCheck`, or the appropriate authenticated
  wrapper for every route.

Keep existing mutation endpoints during the initial rollout. The workspace UI
should not depend on rewriting domain transitions before it can ship.

## 6. Phase 2: Build the Workspace Shell

### Shipping Mechanism During Migration

Phases 2–6 each land partial parity, so they need a way to merge to `main`
without exposing a half-built page. Gate the workspace behind a single
server-side switch in `committees/page.tsx`:

- Environment flag `COMMITTEES_WORKSPACE=1` (read on the server; never derived
  from `actingPermissions`).
- Flag off: render the existing `CommitteeSelector` unchanged.
- Flag on: render `CommitteeWorkspace`.

This is a top-level branch, not the workspace wrapping or embedding
`CommitteeSelector`. Phase 7 makes the workspace unconditional and deletes the
flag and the old branch together.

Replace the top-level responsibilities of `CommitteeSelector.tsx` with these
modules:

```text
CommitteeWorkspace
├── CommitteeWorkspaceHeader
├── CommitteeGridPane
│   ├── CommitteeFilters
│   └── CommitteeGrid
├── CommitteeDetailPane
│   ├── CommitteeContextHeader
│   ├── CommitteeSummary
│   └── CommitteeTabs
└── CommitteeActionDrawer
```

`CommitteeWorkspace` owns only:

- Filters.
- Selected committee ID.
- Selected tab.
- Open action.
- Loading and error coordination.

Each child module receives a narrow interface based on domain data and intent.
Child modules should not need to know endpoint URLs, refetch sequences, or the
entire workspace state.

Grid rendering: group rows by town with collapsible sections and paginate via
the roster endpoint's cursor. Do not introduce a virtualization or split-pane
library; the existing `components/ui/sheet.tsx` and `tabs.tsx` cover the
drawer and tabs, and "collapse the grid pane" is a toggle, not a drag handle.

### URL State

Represent the selected committee, tab, and active filters in the URL:

```text
/committees?committee=123&tab=roster&town=Wheatland&ld=3
```

This provides browser back/forward support, reload stability, and shareable
committee links. Filters belong in the URL too: without them a shared link
drops its context and "select the first visible committee" picks the wrong row.
Use `router.replace` for filter and tab changes and `router.push` for committee
selection so back/forward moves between committees, not between keystrokes.

Selection behavior:

- Restore an accessible committee from the URL.
- If absent, select the first visible committee on desktop.
- Preserve the current Leader shortcut: a Leader whose scope is a single
  `(cityTown, legDistrict)` starts with that scope's filters applied (see
  `singleCommitteeScope` in `committees/page.tsx`).
- On mobile, begin with the committee list unless a valid committee ID is
  present.
- Clear or replace invalid selections after filters change.
- Cancel or ignore stale detail requests when selection changes quickly.

## 7. Phase 3: Build the Detail Tabs

### 7.1 Roster

Make the existing seat table the primary representation instead of stacking
large voter cards.

Include:

- Seat number.
- Member or vacancy state.
- Membership type.
- Contact information when authorized.
- Petitioned-vacancy distinction.
- Row action menu.

Reuse and extend `CommitteeRosterTable.tsx`.

Available row actions:

- Add member from a vacant row.
- Replace member.
- Record resignation.
- Administrative removal.

### 7.2 Pending

Show submitted candidates for the selected committee:

- Candidate.
- Submitted-by and submitted-date context.
- Eligibility status.
- Warnings.
- Accept and reject actions for admins.
- Link to the meeting workflow for bulk review.
- Leaders see the submitted candidates for committees in their jurisdiction,
  read-only, with no accept/reject controls. The detail endpoint enforces this
  scope server-side; the UI only hides the controls.

Retain `/committees/requests` during the migration.

### 7.3 Seats & Weight

Move all seat and weight concerns into this tab:

- LTED total-weight editor.
- Vacancy and filled-seat summary.
- Designation-weight total.
- Per-seat weight breakdown.
- Missing-weight warnings.
- Occupancy verification.

This removes the current unbounded transition from `AddCommitteeForm` into the
LTED weight input.

### 7.4 History

Combine relevant historical context:

- Petition outcomes.
- Additions and replacements.
- Resignations and removals.
- Actor, date, reason, and meeting context when available.

Use user-facing labels such as **Committee history** or **Election outcomes**
rather than **Petition Outcome Context**.

## 8. Phase 4: Replace `AddCommitteeForm` with an Action Drawer

Create one drawer module with a discriminated action interface:

```ts
type CommitteeRef = {
  committeeListId: number;
  cityTown: string;
  legDistrict: number;
  electionDistrict: number;
};

type CommitteeAction =
  | { kind: "add-member"; committee: CommitteeRef; seatNumber?: number }
  | { kind: "replace-member"; committee: CommitteeRef; memberId: string }
  | { kind: "remove-member"; committee: CommitteeRef; memberId: string }
  | { kind: "record-resignation"; committee: CommitteeRef; memberId: string };
```

`CommitteeRef` carries both the id and the composite key because the existing
mutation endpoints key on the composite (Design Decision 11). Adapters in
`committees/workspace/adapters.ts` translate each action into the current
request bodies for `/api/committee/add`, `requestAdd`, and `remove`; the drawer
never sees endpoint URLs.

The caller provides the action and handles completion. Candidate search state,
eligibility loading, form state, and error presentation remain inside the
drawer module.

### Replacement in v1

There is no admin direct-replace endpoint. The only replacement path today is
Leader `requestAdd` with a stored replacement target, resolved by Admin in
`handleRequest`. Therefore in v1:

- `replace-member` is the add-member flow with a preselected replacement
  target. For Leader/RequestAccess it submits via `requestAdd` with the target.
- For Admin it is **not offered** until an atomic replace command exists.
  Admin performs remove followed by add, as today.
- An atomic admin replace is a command-service change (spec Phase A) and is
  tracked separately; it is not a prerequisite for this redesign.

### Add-Member Flow

#### Step 1: Find Candidate

- Voter ID, first name, and last name.
- **Only eligible candidates** filter.
- Compact candidate results.

#### Step 2: Review Candidate

- Identity and district information.
- Eligibility hard stops.
- Nonblocking warnings.
- Existing membership and capacity state.

#### Step 3: Membership Details

- Membership type.
- Email and phone.
- Override reason where permitted.

#### Step 4: Confirm

- Explicit committee and seat destination.
- Role-appropriate primary action.

Role-specific labels:

- Admin: **Add member**.
- Leader or RequestAccess user: **Submit candidate**.
- ReadAccess user: no action.

Do not nest dialogs. Confirmation and override states should occur within the
same drawer workflow.

After success:

- Close the drawer.
- Refresh the selected detail and affected grid row.
- Preserve filters, selected committee, and selected tab.
- Show the existing success toast.
- Optionally offer **Add another member** for repetitive entry.

## 9. Phase 5: Migrate the Remaining Actions

Move the existing resignation and removal dialogs from `CommitteeSelector.tsx`
into the shared action drawer.

Preserve each action's domain requirements:

- Removal requires a reason.
- **Other** requires notes.
- Resignation requires received date and method.
- Leader replacement submissions carry the replacement target through
  `requestAdd` as today; atomic admin replacement is out of scope (see
  Phase 4, "Replacement in v1").
- Eligibility and warnings remain server-decided.
- Privileged mutations remain auditable.

Use thin adapters around the existing mutation endpoints during this phase.
Command-service consolidation can proceed separately without blocking the UI
redesign.

## 10. Phase 6: Responsive Behavior and Accessibility

### Desktop

- Allocate approximately 35–40% to the grid pane and 60–65% to detail.
- Allow the grid pane to collapse.
- Keep the detail header and tabs visible while scrolling.

### Mobile and Tablet

- Convert the list and detail into separate navigation states.
- Selecting a committee opens the detail view.
- Provide a clear **Back to committees** control.
- Convert the action drawer to a full-screen sheet.
- Prevent horizontal page overflow at 375px.

### Accessibility

- Use exactly one page-level `h1`: **Committees**.
- Use `h2` for selected-committee context and `h3` for tab sections.
- Use semantic tabs with keyboard navigation.
- Make committee rows keyboard selectable.
- Trap focus in the drawer, restore focus on close, and support Escape.
- Do not communicate loading, errors, warnings, or eligibility through color
  alone.

## 11. Phase 7: Cutover and Cleanup

After the workspace reaches parity:

- Make the workspace the unconditional `/committees` experience and delete
  the `COMMITTEES_WORKSPACE` flag and the old branch in `page.tsx` together.
- Remove the old selector and detail rendering.
- Retire `/api/fetchCommitteeList` once nothing calls it.
- Retire `AddCommitteeForm` after all roles use the drawer.
- Remove duplicate seat, member-card, weight, and petition-context rendering.
- Keep `/committees/requests` until the meeting-centric workflow fully replaces
  it.
- Update the related redesign specification with any validated prototype
  decisions that differ from the original proposal (the rollout-order change
  itself is recorded in the first PR; see Design Decision 9).

Do not leave the workspace layered over `CommitteeSelector`. Replace the old
orchestration once each responsibility has moved to its new module.

## 12. Verification Plan

### 12.1 Read-Model Tests

Cover:

- Unauthenticated access.
- Insufficient privilege.
- Leader jurisdiction scoping.
- Cross-user and cross-jurisdiction committee IDs.
- PII omission.
- Empty-term and empty-jurisdiction states.
- Vacancy, pending, and missing-weight calculations.

### 12.2 UI Tests

There are currently no tests under `apps/frontend/src/app/committees/`. The
selection, URL, and stale-request tests below are deliverables of the shell PR
(sequence item 3), not a final verification step; they are the hardest part to
retrofit.

Cover:

- URL-driven selection and tabs.
- Filtering and invalid-selection recovery.
- Loading and failed-detail states.
- Switching committees during a pending request.
- Role-specific controls using `actingPermissions`.
- Candidate search and selection.
- Eligible, warning, hard-stop, retry, and full-committee states.
- Successful add refreshing both panes.
- Drawer reset and focus restoration.
- Weight editing and error handling.

### 12.3 Regression Commands

Run:

```bash
pnpm --filter voter-file-tool test
pnpm --filter voter-file-tool lint
pnpm --filter voter-file-tool build
pnpm check:api-routes
```

Before merging API, auth, role-gated UI, report, upload, invite, committee
membership, or audit-log changes, complete the illegible-bug checklist:

- **Trust boundary:** every route is `withPrivilege`, `withBackendCheck`, or
  `withPublic`.
- **Negative auth:** tests cover unauthenticated, insufficient privilege, and
  cross-user or cross-scope access.
- **State race:** find-then-write flows use transactions, unique constraints,
  conditional updates, or P2002 handling.
- **Validation:** request bodies and query parameters use Zod/shared validators,
  not TypeScript casts.
- **Data scope:** list, file, report, and PII responses prove owner,
  jurisdiction, or privilege scope.
- **Audit/state invariants:** privileged mutations preserve audit and domain
  invariants.

## 13. Completion Criteria

The redesign is complete when:

1. Users can move among committees without repeatedly manipulating dropdowns.
2. The page has one clear title and no competing green section headings.
3. Committee selection and tab state survive reload and browser navigation.
4. Roster information is the default detail content.
5. Adding a member no longer pushes committee data down the page.
6. LTED weight and designation verification live together.
7. All role and jurisdiction restrictions match or improve upon current
   behavior.
8. Existing add, request, remove, resign, weight, and petition workflows retain
   parity.
9. The old `CommitteeSelector` orchestration and inline `AddCommitteeForm` are
   removed rather than maintained in parallel.

## 14. Suggested Pull Request Sequence

1. **Prototype:** development-only Variant A (B and C only if needed), plus
   the spec §14/§16 updates from Design Decisions 9–10.
2. **Read model:** roster endpoint extensions, `committeeListId` detail
   endpoint, validation, and negative authorization tests.
3. **Workspace shell:** `COMMITTEES_WORKSPACE` flag, grid, URL selection and
   filters, detail loading, responsive navigation, empty states, and the
   selection/URL/stale-request tests.
4. **Detail tabs:** roster, pending, seats and weight, and history.
5. **Action drawer:** add and submit flows using existing mutations.
6. **Action migration:** Leader replacement submission, remove, and
   resignation flows.
7. **Cutover:** remove the flag, the old selector/form orchestration, and
   `fetchCommitteeList`; complete visual, responsive, and accessibility
   verification.
