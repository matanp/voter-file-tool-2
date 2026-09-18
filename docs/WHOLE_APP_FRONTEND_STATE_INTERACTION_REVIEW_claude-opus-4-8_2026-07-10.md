# Whole-App Frontend State & Interaction Correctness Review

## Basis
- **Branch:** `feat/srs-implementation` · **Commit:** `f611874` · **Date:** 2026-07-10 · **Model:** `claude-opus-4-8`
- **Deliverable:** `docs/WHOLE_APP_FRONTEND_STATE_INTERACTION_REVIEW_claude-opus-4-8_2026-07-10.md`
- **Review run:** `.review/runs/WHOLE_APP_FRONTEND_STATE_INTERACTION_REVIEW_claude-opus-4-8_2026-07-10-f611874`
- **Product files:** 356 · **checksum:** `c44a825f107e248477c02b2e8b26782dbd61aec1c8e9d4f8acf994ed38f3fd4c` · **algorithm:** sha256
- **Inventory:** `pnpm review:freeze frontend-state` · **Scan profile:** `frontend-state-interaction`
- **Methodology:** `docs/review/WHOLE_APP_FRONTEND_STATE_INTERACTION_REVIEW_METHODOLOGY.md`
- **Axis:** client state correctness — does the UI ever let a user start or complete an action the server will reject, block, or has no path to finish? Server/client permission drift, blocked workflows, destructive-action confirmation, loading/error/optimistic state.

## At a glance
| # | Finding | Severity | Blast | Opportunity |
|---|---------|----------|-------|-------------|
| 1 | Petition-generation dead-end for ReadAccess users | High | small | Gate the card/page to `RequestAccess` |
| 2 | Election dates/offices delete with no confirmation | Medium | medium | Confirm destructive reference-data deletes |
| 3 | `seat.isPetitioned` overloaded: recorded-lock vs seat type | Medium | medium | Separate "outcome recorded" from seat type |
| 4 | Discrepancy failure toast styled as success | Low | small | Add `variant: "destructive"` on error |
| 5 | Scoped-report realtime subscription race | Low | small | Subscribe before/at submit or reconcile on mount |

**Counts:** 5 findings · 3 backlog-only notes

## Subsystem map
| Area | Defining files | Depth |
|---|---|---|
| Reports hub & generation gating | reports hub page, `apps/frontend/src/components/reports/GenerateReportGrid.tsx`, scoped UI registry, generate route | high |
| Scoped report forms & realtime status | `apps/frontend/src/components/reports/ScopedReportForm.tsx`, `apps/frontend/src/app/components/ReportStatusTracker.tsx` | high |
| Petition outcomes recorder | `apps/frontend/src/app/admin/petition-outcomes/PetitionOutcomesClient.tsx`, record route, seat flag | high |
| Committee membership add/remove/replace | `apps/frontend/src/app/committees/CommitteeSelector.tsx`, `apps/frontend/src/app/committees/AddCommitteeForm.tsx`, `apps/frontend/src/app/committees/CommitteeRequestForm.tsx` | high |
| Admin CRUD tables & destructive actions | election dates/offices, crosswalk, users, invites, jobs | high |
| Upload/import & discrepancies | `apps/frontend/src/components/admin/XlsxUploadCard.tsx`, `apps/frontend/src/components/admin/PresignedUploadReportForm.tsx`, `apps/frontend/src/app/admin/data/DiscrepancyActionsMenu.tsx` | medium |
| Meetings & submission decisions | `apps/frontend/src/app/admin/meetings/PendingSubmissionsTable.tsx` | medium |
| Shared UI hooks | `apps/frontend/src/hooks/useFileUpload.ts`, `apps/frontend/src/lib/utils.ts` | medium |

## Findings

### 1. Petition-generation flow is a permission dead-end for ReadAccess users
**Severity: High · Blast radius: small**
**What & where.** The "Designated Petition" card in `apps/frontend/src/components/reports/GenerateReportGrid.tsx` carries no `minPrivilege`, so it renders for every user who reaches the reports hub. Both the hub page `apps/frontend/src/app/reports/page.tsx` and the target page `apps/frontend/src/app/petitions/page.tsx` gate only on `getAuthenticatedPageAccess()` (any logged-in user). But the generation endpoint `apps/frontend/src/app/api/generateReport/route.ts` is wrapped in `withPrivilege(PrivilegeLevel.RequestAccess, …)`, and the petition form `apps/frontend/src/app/petitions/GeneratePetitionForm.tsx` POSTs there. Privilege order in `apps/frontend/src/lib/utils.ts` places `ReadAccess` below `RequestAccess`, so a ReadAccess user fails the wrapper.
**Why it hurts.** A `ReadAccess` user sees the Reports tab, lands on the hub, and — because the scoped cards (Leader) and Voter List card (Admin) are filtered out — the *only* visible generation card is Designated Petition. They open the form, fill it in, submit, and get a 403. The client-visible entry point promises an action the server always rejects for that role.
**Opportunity.** Give the Designated Petition card a `minPrivilege: RequestAccess` and gate `/petitions` to the same level so the entry point matches the route.
**Evidence.** `withPrivilege(PrivilegeLevel.RequestAccess …)` at generateReport route; card object with no `minPrivilege` in GenerateReportGrid `NON_SCOPE_REPORT_TYPES`; `PRIVILEGE_ORDER` = Developer < Admin < Leader < RequestAccess < ReadAccess in utils; both pages call `getAuthenticatedPageAccess()` only.

### 2. Election-dates and office-names deletes fire immediately with no confirmation
**Severity: Medium · Blast radius: medium**
**What & where.** `apps/frontend/src/app/admin/dashboard/ElectionOffices.tsx` and `apps/frontend/src/app/admin/dashboard/ElectionDates.tsx` delete a row the instant the "Delete" button is clicked — no confirm step. Structurally identical admin CRUD elsewhere always confirms first: `apps/frontend/src/app/admin/data/LtedCrosswalkTab.tsx` uses a Radix `AlertDialog`; `apps/frontend/src/app/admin/users/UsersClient.tsx` uses a `Dialog`; and report/invite/job deletes use a native `confirm()` (see Finding sibling note below).
**Why it hurts.** These are shared reference tables (election dates, office names) consumed by petition and report generation; an accidental single click removes one with no undo and no second chance. The inconsistency also means an admin who has learned "delete asks first" everywhere else is surprised here.
**Opportunity.** Route these two deletes through the same confirmation affordance the other admin tables already use.
**Evidence.** `onClick={() => handleDeleteOffice(office.id)}` / `handleDeleteDate(ed.id)` call the mutation directly; no `AlertDialog`/`Dialog`/`confirm` in either file. `rg 'window\.confirm|confirm\('` returns only `ReportCard.tsx`, `InviteManagement.tsx`, `PendingJobsIndicator.tsx`; `AlertDialog` delete confirmation only in `LtedCrosswalkTab.tsx`.

### 3. `seat.isPetitioned` is overloaded — an "outcome recorded" lock that also renders as seat type
**Severity: Medium · Blast radius: medium**
**What & where.** The petition-outcomes recorder `apps/frontend/src/app/api/admin/petition-outcomes/record/route.ts` flips `seat.isPetitioned` from `false` to `true` inside its transaction purely as a single-use "outcome already recorded" lock (`updateMany({ where: { id, isPetitioned: false }, data: { isPetitioned: true } })`). The recorder UI `apps/frontend/src/app/admin/petition-outcomes/PetitionOutcomesClient.tsx` reads the same flag as "outcome already recorded" and disables those seats ("Outcome already recorded"). But the roster in `apps/frontend/src/app/committees/CommitteeSelector.tsx` renders the *same* flag as the seat's *type*: `seat.isPetitioned ? "Petitioned" : "Appointed"`.
**Why it hurts.** One boolean drives two different user-facing meanings. After any petition outcome is recorded, the seat's roster row silently relabels to "Petitioned" regardless of the winner's actual membership type, and a directly-added `PETITIONED` member (via `AddCommitteeForm`) still shows "Appointed" because that path never sets the flag. An admin reconciling the roster against the outcomes recorder sees contradictory signals about what a seat is and whether it is recordable.
**Opportunity.** Distinguish "a petition outcome has been recorded for this seat" from "this is a petitioned-type seat" so each surface reads the field that matches its label.
**Evidence.** Record route transaction sets `isPetitioned: true`; PetitionOutcomesClient `availableSeats = seats.filter((s) => !s.isPetitioned)` and disabled `SelectItem` with "Outcome already recorded"; CommitteeSelector roster cell `{seat.isPetitioned ? "Petitioned" : "Appointed"}`.

### 4. Discrepancy-handling failure renders as a neutral (success-styled) toast
**Severity: Low · Blast radius: small**
**What & where.** `apps/frontend/src/app/admin/data/DiscrepancyActionsMenu.tsx` shows its error toast without `variant: "destructive"`, so a failed "Accept" / "Reject Due to Discrepancy" action pops the same neutral styling used for success toasts, differing only by the word "Error" in the title.
**Why it hurts.** Accept/Reject on a discrepancy is a consequential membership action; a failure that looks visually identical to a success can lead an admin to believe the record was resolved when it was not. The app's convention is a destructive-variant error toast (69 `variant: "destructive"` sites), so this reads as an oversight.
**Opportunity.** Add `variant: "destructive"` to the onError toast to match the app-wide error convention.
**Evidence.** onError `toast({ title: "Error", description: \`Error: ${error.message}\` })` with no `variant`, versus the destructive-variant pattern used across other mutation error handlers.

### 5. Scoped-report realtime subscription is opened only after the job is created — fast jobs can be missed
**Severity: Low · Blast radius: small**
**What & where.** `apps/frontend/src/components/reports/ScopedReportForm.tsx` only sets `reportId` inside the mutation's `onSuccess`, and `apps/frontend/src/app/components/ReportStatusTracker.tsx` subscribes to the Ably `report-status-${reportId}` channel after that render. There is a window between the server creating the job (and the report-server publishing `COMPLETED`) and the client subscribing.
**Why it hurts.** For a report that generates quickly, the completion/failure message can be published before the subscriber attaches, so the success toast and inline download link never appear and the form sits on its "started" state. The impact is bounded because the form also renders a static "Find your report in the Reports page" link, so the user is not fully stranded.
**Opportunity.** Reconcile job status on mount (or subscribe before/at submit) so a completion that races the subscription is still surfaced in-form.
**Evidence.** `onSuccess: (data) => { setReportId(data.reportId); … }` then `{reportId && <ReportStatusTracker …/>}`; `useChannel` only reacts to messages received after subscribe.

## Already good
- **Report card visibility matches page guards.** `apps/frontend/src/components/reports/GenerateReportGrid.tsx` filters cards by `minPrivilege`, and the Admin-only pages enforce the same bar server-side (e.g. `apps/frontend/src/app/committee-reports/page.tsx` returns an explicit "no permission" view). The scoped UI registry `apps/frontend/src/components/reports/scopeReportUiRegistry.ts` even documents `minPrivilege` as display-only, with the real gate in `apps/frontend/src/lib/loadScopedReportPageData.ts` (Leader+).
- **Committee membership mutations are confirmation-gated and reason-required.** `apps/frontend/src/app/committees/CommitteeSelector.tsx` puts removal and resignation behind modals with required reason/method fields and loading-disabled submit buttons.
- **Batch meeting decisions confirm before applying.** `apps/frontend/src/app/admin/meetings/PendingSubmissionsTable.tsx` disables the action when nothing is selected and confirms count + effect ("Members will be immediately activated") before mutating.
- **Upload flows are double-submit safe.** `apps/frontend/src/components/admin/XlsxUploadCard.tsx` and `apps/frontend/src/components/admin/PresignedUploadReportForm.tsx` disable the file input and submit while in flight; `apps/frontend/src/hooks/useFileUpload.ts` clears the stale `fileKey` whenever a new file is selected.
- **Export cap is explained, not just blocked.** `apps/frontend/src/app/recordsearch/RecordsList.tsx` disables the export button over the row cap and shows an inline reason with admin-contact guidance.

## Backlog-only notes

### B1. Admin full-committee add offers no in-form replacement path
**What & where.** `apps/frontend/src/app/committees/AddCommitteeForm.tsx` disables the add button with "Committee Full" once `committeeList.length >= maxSeatsPerLted` for admins, with no in-form way to swap a member — the admin must leave and remove someone from the roster cards first. The non-admin path in `apps/frontend/src/app/committees/CommitteeRequestForm.tsx` has an explicit remove+replace flow.
**Why defer.** It is a two-step-but-reachable workflow (remove via roster, then add), not a dead-end, and reworking the admin add form into a replace flow is a larger interaction change.
**Future direction.** Consider surfacing a "replace an existing member" affordance in the admin add form when the committee is full.

### B2. Voter-list report form loses its search on refresh with no in-page recovery
**What & where.** `apps/frontend/src/contexts/VoterSearchContext.tsx` holds the search only in memory, and `apps/frontend/src/app/voter-list-reports/VoterListReportForm.tsx` depends on it; a direct load or refresh leaves the form with an empty query whose only feedback is a "perform a search first" toast on submit.
**Why defer.** The empty case is handled (clear toast, no silent failure); adding persistence or an in-page link back to Record Search is a UX enhancement, not a correctness gap.
**Future direction.** Offer an inline link back to Record Search (or persist the last query) when the query is empty.

### B3. Candidate rows stay editable while a petition outcome is submitting
**What & where.** `apps/frontend/src/app/admin/petition-outcomes/CandidateOutcomeTable.tsx` accepts a `disabled` prop, but `apps/frontend/src/app/admin/petition-outcomes/PetitionOutcomesClient.tsx` never passes it during `recordMutation.loading`, so the underlying rows remain editable behind the confirm dialog while the request is in flight.
**Why defer.** The confirm dialog is the effective gate and the submit button is disabled; edits during the brief in-flight window have no correctness impact on the already-captured payload.
**Future direction.** Pass `disabled={recordMutation.loading}` for visual consistency with other in-flight forms.

## Not a finding
- **Native `confirm()` for report/invite/job deletes** — `apps/frontend/src/components/reports/ReportCard.tsx`, `apps/frontend/src/app/admin/users/InviteManagement.tsx`, and `apps/frontend/src/components/reports/PendingJobsIndicator.tsx` do confirm before deleting; the mechanism differs from the Radix dialogs (a consistency nit folded into Finding 2), but the destructive action is guarded.
- **PendingJobsIndicator 15s polling** — `apps/frontend/src/components/reports/PendingJobsIndicator.tsx` polls on a fixed interval that is cleared only on unmount; it does not silently stop.
- **Optimistic list removal on delete** — election/office/job/report deletes update local state inside `onSuccess` (after the server confirms), not optimistically, so there is no missing-rollback exposure.
- **Petition-outcomes empty-committee case** — `apps/frontend/src/app/admin/petition-outcomes/PetitionOutcomesClient.tsx` disables recorded seats, explains the all-recorded case, and the server re-checks `isPetitioned`; the ordinary case reaches a working control.
- **Governance-config save** — `apps/frontend/src/app/admin/governance-config/GovernanceConfigClient.tsx` gates save on a non-empty diff, confirms inline, disables during save, and surfaces a destructive error alert.
