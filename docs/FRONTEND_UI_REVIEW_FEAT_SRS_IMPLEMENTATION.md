# Frontend UI Review — `feat/srs-implementation`

**Review date:** 2026-06-21
**Re-reviewed:** 2026-07-10 (petition-outcomes fix prepared for commit)
**Scope:** New and changed frontend UI in the committed branch. Backend implementation details were intentionally out of scope.

**Status summary:** 8 resolved · 0 open

## Findings

### P0 — Petition Outcomes page blocks the frontend typecheck — ✅ Resolved

- **Location:** `apps/frontend/src/app/admin/petition-outcomes/page.tsx`
- **Issue:** `PetitionOutcomesPageProps.searchParams` permits both a plain object and a `Promise`. The generated Next.js 15 page type requires the promise form.
- **Impact:** `tsc --noEmit` fails on this page. This is a production-release blocker until the page-props type matches Next 15's contract.
- **Recommendation:** Type `searchParams` as `Promise<{ committeeListId?: string }>` (or use the framework's generated `PageProps` shape), then await it once.

### P1 — Admins cannot invite a Leader — ✅ Resolved

- **Location:** `apps/frontend/src/app/admin/users/InviteManagement.tsx`
- **Issue:** The invite form's type and role dropdown permit only `Admin`, `RequestAccess`, and `ReadAccess`; `Leader` is omitted.
- **Impact:** The branch adds Leader-specific screens and jurisdiction management, but the UI provides no way to onboard a new Leader. The Users screen can manage jurisdictions only for users who are already Leaders.
- **Recommendation:** Add `Leader` to the invite form's type, selector, and role presentation, with clear guidance that a jurisdiction must then be assigned.
- **Resolution (commit `6de6034`):** `Leader` is now a selectable privilege level (enabled when an active term and committee data exist). A jurisdiction builder captures one or more scopes before send; inline guidance explains the active-term requirement and links to Admin → Terms / Admin → Data when prerequisites are missing. At least one jurisdiction is required before submitting a Leader invite.

### P1 — Full committees cannot use the replacement workflow — ✅ Resolved

- **Location:** `apps/frontend/src/app/committees/CommitteeRequestForm.tsx`
- **Issue:** Candidate selection is disabled whenever `committeeList.length >= maxSeatsPerLted`, even when the same request includes removal of an existing member.
- **Impact:** “Remove or Replace Member” cannot create a replacement request for a full committee—the ordinary situation in which that flow is required.
- **Recommendation:** Allow candidate selection when a removal is selected, and label the resulting action as a replacement rather than a net addition.
- **Resolution:** Candidate selection stays enabled when a removal is selected (full committee only blocks net adds). Replacement copy is used in the add/search section, selection button, and summary line; the add search panel auto-opens when opened via “Remove or Replace Member”.

### P1 — The Reports dashboard advertises inaccessible report types — ✅ Resolved

- **Location:** `apps/frontend/src/components/reports/GenerateReportGrid.tsx`
- **Issue:** All signed-in users see the new Leader-only report cards. The report pages themselves render an access-denied state for users below Leader.
- **Impact:** Read Access users can click a prominent dashboard card only to reach a dead-end permission message.
- **Recommendation:** Filter Leader-only cards using the same permission rule as their pages, or render them visibly unavailable with an explanatory access requirement.

### P1 — Petition Outcomes permits selection of non-petitioned seats — ✅ Resolved

- **Location:** `apps/frontend/src/app/admin/petition-outcomes/PetitionOutcomesClient.tsx`
- **Issue:** The seat picker includes every committee seat. Appointed seats are merely annotated rather than excluded or disabled.
- **Impact:** An administrator can enter a primary-outcome workflow for a seat that was not petitioned, creating a confusing and likely unsuccessful submission path.
- **Recommendation:** Show petitioned seats only. If non-petitioned seats must remain visible, disable them and state why.
- **Resolution:** The data model has no independent pre-outcome petition signal, so the corrected fix leaves non-petitioned seats available for first outcome entry and disables seats that already have a recorded outcome. The client labels disabled seats, blocks stale selected-seat submission, and the API rejects already-recorded seats with `409` before membership or audit writes.

### P2 — Committee selector overflows on narrow screens — ✅ Resolved

- **Location:** `apps/frontend/src/app/committees/CommitteeSelector.tsx`
- **Issue:** The selection control bar uses `w-max` and a non-wrapping flex layout. In Rochester, it contains City, Legislative District, view toggle, Election District, and load controls.
- **Impact:** The primary committee navigation workflow overflows horizontally on mobile instead of reflowing into usable controls.
- **Recommendation:** Use a responsive grid or `flex-wrap` layout; avoid `w-max` for this container.

### P2 — Reports tab is visually inactive on most new report pages — ✅ Resolved

- **Location:** `apps/frontend/src/app/components/header.tsx`
- **Issue:** The active-route list includes only the older report paths and omits Sign-In Sheet, Weight Summary, Vacancy, Changes, and Petition Outcomes reports.
- **Impact:** Users navigating from the Reports dashboard lose the active navigation cue on the new pages.
- **Recommendation:** Add every report route prefix to the Reports active-route matcher, or centralize report-route detection.

### P2 — New dialogs lack an accessible description — ✅ Resolved

- **Locations:** `apps/frontend/src/app/admin/meetings/CreateMeetingDialog.tsx`, `apps/frontend/src/app/committees/CommitteeRequestForm.tsx`
- **Issue:** The dialogs render `DialogContent` without `DialogDescription` or an intentional `aria-describedby={undefined}`.
- **Impact:** Radix emits accessibility warnings in component tests, and screen-reader users receive incomplete modal context.
- **Recommendation:** Add a concise `DialogDescription` explaining the dialog's purpose.

## Validation performed

- Focused petition-outcomes component/API tests passed: 2 suites / 16 tests.
- `apps/frontend/node_modules/.bin/tsc --noEmit --pretty false --project apps/frontend/tsconfig.json` passes.
- The repo-recommended `pnpm --filter voter-file-tool ...` wrapper was blocked locally by a pnpm 11 vs pnpm 8 lockfile/tooling mismatch before project code ran.
- A production build was not re-run in this environment; the prior review noted a font download from `fonts.googleapis.com` was unavailable.

## Resolution log (2026-06-21)

Addressed the findings with an obvious, low-risk fix. P1 items were left for a
product decision and are **not** addressed here.

**Resolved**

- **P0 — Petition Outcomes page typecheck:** `searchParams` is now typed as
  `Promise<{ committeeListId?: string }>` only, matching Next 15's `PageProps`
  contract. (commit: fix(ui): address obvious frontend review findings)
- **P2 — Reports tab inactive on new report pages:** the Reports active-route
  matcher now includes `/sign-in-sheet-reports`, `/weight-summary-reports`,
  `/vacancy-reports`, `/changes-reports`, and `/petition-outcomes-reports`.
- **P2 — New dialogs lack an accessible description:** added `DialogDescription`
  to `CreateMeetingDialog` and `CommitteeRequestForm`.
- **P2 — Committee selector overflow:** the control bar now uses
  `flex flex-wrap items-end` instead of `w-max` + non-wrapping flex.
- **P1 — Reports dashboard advertises inaccessible report types:** per the
  product call, Leader-only cards (and the Admin-only Voter List card) now carry
  a `minPrivilege` matching the privilege their report page enforces. Cards the
  user cannot access are hidden entirely, so no card links into a dead-end
  access-denied page. (`GenerateReportGrid.tsx`)

**Deferred at the time (2026-06-21) — needs a product decision**

- **P1 — Full committees cannot use the replacement workflow:** changing the
  candidate-selection gating for replacements alters request semantics.
- **P1 — Petition Outcomes permits selection of non-petitioned seats:** whether
  to exclude or merely disable non-petitioned seats is a product call.

**Later resolved (not part of the 2026-06-21 pass)**

- **P1 — Admins cannot invite a Leader:** commit `6de6034` added `Leader` to the
  invite form with a jurisdiction builder and prerequisite guidance. See the
  2026-07-05 re-review log.

## Re-review log (2026-07-04)

Re-checked every finding against **committed** branch state at HEAD (`6ec0419` —
*Add API route trust-boundary guardrail*). Unstaged working-tree changes were
ignored.

**Still resolved (unchanged since 2026-06-21)**

- **P0 — Petition Outcomes page typecheck:** `searchParams` remains typed as
  `Promise<{ committeeListId?: string }>` only in
  `apps/frontend/src/app/admin/petition-outcomes/page.tsx`.
- **P1 — Reports dashboard advertises inaccessible report types:** confirmed in
  `GenerateReportGrid.tsx` — cards declare `minPrivilege` and are filtered out
  when the user lacks access (commit `d06a9da`).
- **P2 — Reports tab inactive on new report pages:** confirmed in `header.tsx` —
  active-route matcher includes all new report prefixes.
- **P2 — New dialogs lack an accessible description:** confirmed —
  `DialogDescription` present in `CreateMeetingDialog.tsx` and
  `CommitteeRequestForm.tsx`.
- **P2 — Committee selector overflow:** confirmed in `CommitteeSelector.tsx` —
  control bar uses `flex flex-wrap items-end`.

**Still open (no committed fix since original review)**

- **P1 — Admins cannot invite a Leader:** `InviteManagement.tsx` at HEAD still
  types invites as `"Admin" | "RequestAccess" | "ReadAccess"` with no `Leader`
  option in the role selector. *(Unstaged work in the workspace adds Leader +
  jurisdiction builder UI, but that is not on the branch yet.)*
- **P1 — Full committees cannot use the replacement workflow:**
  `CommitteeRequestForm.tsx` still disables candidate selection when
  `committeeList.length >= maxSeatsPerLted`, regardless of whether a removal is
  already selected.
- **P1 — Petition Outcomes permits selection of non-petitioned seats:**
  `PetitionOutcomesClient.tsx` still lists every seat; non-petitioned seats are
  annotated with `"(petitioned)"` when applicable but are not excluded or
  disabled.

**Not in original findings (informational):** commit `c24976c` (*honor acting
privilege in UI gates*) improves privilege-aware UI in `header.tsx` and
`authcheck.tsx` but does not close any remaining finding above.

## Re-review log (2026-07-05)

Re-checked every finding against **committed** branch state at HEAD (`159fa6c` —
*refactor(committee): extract designation-weight engine into shared-prisma*).
Unstaged working-tree changes were ignored.

**Newly resolved since 2026-07-04**

- **P1 — Admins cannot invite a Leader:** commit `6de6034` (*feat(auth): move
  invite consumption to transactional apply route*) adds `Leader` to
  `InvitePrivilegeLevel`, the role selector, and a jurisdiction builder in
  `InviteManagement.tsx`. The Leader option is disabled until an active term and
  committee data exist; the form requires at least one jurisdiction before
  submit and shows guidance linking to Admin → Terms / Admin → Data when
  prerequisites are missing.

**Still resolved (unchanged since 2026-06-21)**

- **P0 — Petition Outcomes page typecheck:** unchanged; `tsc --noEmit` passes.
- **P1 — Reports dashboard advertises inaccessible report types:** unchanged in
  `GenerateReportGrid.tsx`.
- **P2 — Reports tab inactive on new report pages:** unchanged in `header.tsx`.
- **P2 — New dialogs lack an accessible description:** unchanged in
  `CreateMeetingDialog.tsx` and `CommitteeRequestForm.tsx`.
- **P2 — Committee selector overflow:** unchanged in `CommitteeSelector.tsx`.

**Still open (no committed fix since original review)**

- **P1 — Full committees cannot use the replacement workflow:**
  `CommitteeRequestForm.tsx` still disables candidate selection when
  `committeeList.length >= maxSeatsPerLted`, regardless of whether
  `requestRemoveMember` is already set.
- **P1 — Petition Outcomes permits selection of non-petitioned seats:**
  `PetitionOutcomesClient.tsx` still lists every seat; only petitioned seats
  receive a `"(petitioned)"` suffix and none are excluded or disabled.

**Not in original findings (informational):** commits since `6ec0419` include
scope-report registry / shared report form scaffolding (`14f1274`), email
identity canonicalization (`8a54e7a`), and designation-weight extraction to
`shared-prisma` (`159fa6c`). These are refactors or backend-adjacent changes
and do not close the two remaining open UI findings.

## Re-review log (2026-07-10)

Re-checked the remaining petition-outcomes finding against the prepared
seat-picker and API hardening implementation.

**Newly resolved since 2026-07-05**

- **P1 — Petition Outcomes permits selection of non-petitioned seats:** the
  corrected implementation keeps first-outcome seats selectable and disables
  seats that already have a recorded outcome. The UI shows the disabled reason,
  explains when all seats are already recorded, and guards stale selected-seat
  state. The API now returns `409` for already-recorded seats, including a
  transaction-time conditional update guard for concurrent submissions.

## Working-tree note

The latest status includes the petition-outcomes fix prepared on 2026-07-10.
Unrelated unstaged local review documents are not reflected here.
