# Frontend UI Review — `feat/srs-implementation`

**Review date:** 2026-06-21  
**Scope:** New and changed frontend UI in the committed branch. Backend implementation details were intentionally out of scope.

## Findings

### P0 — Petition Outcomes page blocks the frontend typecheck

- **Location:** `apps/frontend/src/app/admin/petition-outcomes/page.tsx`
- **Issue:** `PetitionOutcomesPageProps.searchParams` permits both a plain object and a `Promise`. The generated Next.js 15 page type requires the promise form.
- **Impact:** `tsc --noEmit` fails on this page. This is a production-release blocker until the page-props type matches Next 15's contract.
- **Recommendation:** Type `searchParams` as `Promise<{ committeeListId?: string }>` (or use the framework's generated `PageProps` shape), then await it once.

### P1 — Admins cannot invite a Leader

- **Location:** `apps/frontend/src/app/admin/users/InviteManagement.tsx`
- **Issue:** The invite form's type and role dropdown permit only `Admin`, `RequestAccess`, and `ReadAccess`; `Leader` is omitted.
- **Impact:** The branch adds Leader-specific screens and jurisdiction management, but the UI provides no way to onboard a new Leader. The Users screen can manage jurisdictions only for users who are already Leaders.
- **Recommendation:** Add `Leader` to the invite form's type, selector, and role presentation, with clear guidance that a jurisdiction must then be assigned.

### P1 — Full committees cannot use the replacement workflow

- **Location:** `apps/frontend/src/app/committees/CommitteeRequestForm.tsx`
- **Issue:** Candidate selection is disabled whenever `committeeList.length >= maxSeatsPerLted`, even when the same request includes removal of an existing member.
- **Impact:** “Remove or Replace Member” cannot create a replacement request for a full committee—the ordinary situation in which that flow is required.
- **Recommendation:** Allow candidate selection when a removal is selected, and label the resulting action as a replacement rather than a net addition.

### P1 — The Reports dashboard advertises inaccessible report types

- **Location:** `apps/frontend/src/components/reports/GenerateReportGrid.tsx`
- **Issue:** All signed-in users see the new Leader-only report cards. The report pages themselves render an access-denied state for users below Leader.
- **Impact:** Read Access users can click a prominent dashboard card only to reach a dead-end permission message.
- **Recommendation:** Filter Leader-only cards using the same permission rule as their pages, or render them visibly unavailable with an explanatory access requirement.

### P1 — Petition Outcomes permits selection of non-petitioned seats

- **Location:** `apps/frontend/src/app/admin/petition-outcomes/PetitionOutcomesClient.tsx`
- **Issue:** The seat picker includes every committee seat. Appointed seats are merely annotated rather than excluded or disabled.
- **Impact:** An administrator can enter a primary-outcome workflow for a seat that was not petitioned, creating a confusing and likely unsuccessful submission path.
- **Recommendation:** Show petitioned seats only. If non-petitioned seats must remain visible, disable them and state why.

### P2 — Committee selector overflows on narrow screens

- **Location:** `apps/frontend/src/app/committees/CommitteeSelector.tsx`
- **Issue:** The selection control bar uses `w-max` and a non-wrapping flex layout. In Rochester, it contains City, Legislative District, view toggle, Election District, and load controls.
- **Impact:** The primary committee navigation workflow overflows horizontally on mobile instead of reflowing into usable controls.
- **Recommendation:** Use a responsive grid or `flex-wrap` layout; avoid `w-max` for this container.

### P2 — Reports tab is visually inactive on most new report pages

- **Location:** `apps/frontend/src/app/components/header.tsx`
- **Issue:** The active-route list includes only the older report paths and omits Sign-In Sheet, Weight Summary, Vacancy, Changes, and Petition Outcomes reports.
- **Impact:** Users navigating from the Reports dashboard lose the active navigation cue on the new pages.
- **Recommendation:** Add every report route prefix to the Reports active-route matcher, or centralize report-route detection.

### P2 — New dialogs lack an accessible description

- **Locations:** `apps/frontend/src/app/admin/meetings/CreateMeetingDialog.tsx`, `apps/frontend/src/app/committees/CommitteeRequestForm.tsx`
- **Issue:** The dialogs render `DialogContent` without `DialogDescription` or an intentional `aria-describedby={undefined}`.
- **Impact:** Radix emits accessibility warnings in component tests, and screen-reader users receive incomplete modal context.
- **Recommendation:** Add a concise `DialogDescription` explaining the dialog's purpose.

## Validation performed

- Focused frontend component tests passed: 7 suites / 22 tests.
- `pnpm --filter voter-file-tool exec tsc --noEmit --pretty false` failed. The Petition Outcomes page-props error above is a direct frontend failure; the command also reported unrelated existing errors outside this review's frontend UI scope.
- A production build could not proceed in this environment because its font download from `fonts.googleapis.com` was unavailable.

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

**Deferred — needs a product decision (not addressed)**

- **P1 — Admins cannot invite a Leader:** whether/how Leaders are onboarded
  (and the required jurisdiction-assignment guidance) is a product call.
- **P1 — Full committees cannot use the replacement workflow:** changing the
  candidate-selection gating for replacements alters request semantics.
- **P1 — Reports dashboard advertises inaccessible report types:** whether to
  hide, disable, or keep the Leader-only cards as teasers is a product call.
- **P1 — Petition Outcomes permits selection of non-petitioned seats:** whether
  to exclude or merely disable non-petitioned seats is a product call.

## Working-tree note

The workspace contained unstaged changes to the roster components and related tests during review. They were preserved and are not part of this review document; findings describe the committed branch state.
