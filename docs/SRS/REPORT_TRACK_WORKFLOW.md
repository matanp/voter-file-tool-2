# Report Track Workflow (3.0 → 3.0a → 3.2 → 3.3, 3.4)

Single-developer workflow for the Report track. See [tickets/README.md](tickets/README.md) for parallelization and dependencies.

---

## Why 3.2 Depends on 3.1 (Access Track)

**3.1 is the Access track** (Jurisdiction Assignment UI). The dependency is **only for the 3.2 frontend form**:

- The Sign-In Sheet form needs a **scope** selector: "My Jurisdictions" (Leader) vs "Countywide" (Admin).
- For "My Jurisdictions", the **jurisdiction dropdowns** (cityTown, legDistrict) must be limited to the **current user’s assigned jurisdictions**.
- That requires the **UserJurisdiction** model and **`GET /api/user/jurisdictions`** from 3.1. Without them, you can’t show Leaders only their cities/LDs or enforce scope in the generate-report API.

**Report-server 3.2 does not depend on 3.1** — schema, `fetchSignInSheetData()`, PDF component, and `processJob()` case are independent. Only the frontend form and generate-report scope enforcement need 3.1.

**Handoff:** If someone else owns the Access track, you can do report-server 3.2 as soon as 3.0/3.0a are done, then implement the 3.2 frontend (form + API scoping) when 3.1 is complete. If you own both tracks, do 3.1 before the 3.2 form.

---

## Phases (One Developer)

| Phase | Tickets | When |
|-------|---------|------|
| **1** | 3.0 + 3.0a | Same sprint; 3.0a right after 3.0. |
| **2a** | 3.2 report-server | As soon as 1 is done (no 3.1). |
| **2b** | 3.2 frontend | After 3.1 is done (UserJurisdiction + `/api/user/jurisdictions`). |
| **3** | 3.3 then 3.4 | After 3.2 complete; sequential. |

---

## Phase 1: 3.0 + 3.0a (same sprint)

- [x] **3.0** — Verify/fix `fetchCommitteeData()` uses `memberships` (ACTIVE), term filter, `voterRecord`.
- [x] **3.0** — Update `CommitteeWithMembers` in `packages/shared-validators/src/committeeUtils.ts`: remove `committeeMemberList`, use `memberships`; fix all consumers.
- [x] **3.0** — Confirm `mapCommitteesToReportShape()` / `mapVoterRecordToMember()` use `memberships` end-to-end.
- [x] **3.0** — Confirm `ldCommittees` handler in report-server `index.ts` has no `committeeMemberList`; PDF/XLSX paths use `fetchCommitteeData()` → `mapCommitteesToReportShape()`.
- [x] **3.0** — Verify `report.ts` and shared-validators exports; no legacy committee-member refs.
- [x] **3.0** — Generate ldCommittees PDF + XLSX; spot-check output.
- [x] **3.0** — Update report-server tests: fixtures use `memberships`; add tests for fetch/map/empty committee.
- [x] **3.0a** — Audit all 5 report types per ticket checklist (ldCommittees migrated; others “no migration needed”).
- [x] **3.0a** — Grep report-server + shared-validators for `committeeMemberList`; zero hits.
- [x] **3.0a** — Record audit outcome in 3.0a ticket; close 3.0 + 3.0a.

---

## Phase 2a: 3.2 report-server (no 3.1)

- [x] Add `signInSheetReportSchema` to `report.ts` (with scope/cityTown/legDistrict/meetingDate); add to union and `REPORT_TYPE_MAPPINGS`.
- [x] Add `fetchSignInSheetData()` in `committeeMappingHelpers.ts` (scope + jurisdiction filter, ACTIVE memberships, active term).
- [x] Create `SignInSheet.tsx` (portrait 8.5×11, header, table, blank rows, footer).
- [x] Add `signInSheet` case in report-server `processJob()`.
- [x] Report-server tests: fetch filters, component structure, handler produces PDF.

---

## Phase 2b: 3.2 frontend (after 3.1)

- [ ] Enable Sign-In Sheet card in `GenerateReportGrid.tsx`; add `signInSheet` to `formatReportType()` in `reportUtils.ts`.
- [ ] Create `/sign-in-sheet-reports` page + `SignInSheetForm.tsx` (name, scope “My Jurisdictions”/“Countywide”, jurisdiction dropdowns from `/api/user/jurisdictions`, meeting date).
- [ ] Validation: scope=jurisdiction ⇒ cityTown required; Leader cannot select Countywide.
- [ ] Update `/api/generateReport` for `type: 'signInSheet'`; enforce Leader scope (UserJurisdiction) for requested cityTown/legDistrict.
- [ ] Frontend tests: form validation, Leader scope restriction.

---

## Phase 3: 3.3 then 3.4 (sequential)

### 3.3 — Designation Weight Summary

- [ ] Add `designationWeightSummaryReportSchema` (format pdf|xlsx, scope, jurisdiction); union + mappings.
- [ ] Add scope filtering to `fetchDesignationWeights()` in `committeeMappingHelpers.ts`.
- [ ] Create `DesignationWeightSummary.tsx` (landscape, groups, subtotals, grand total, missing-weights footnote).
- [ ] Add XLSX path for weight summary; add handler case in `processJob()`.
- [ ] Enable card in `GenerateReportGrid`; create `weight-summary-reports` page + `WeightSummaryForm.tsx`.
- [ ] Update `/api/generateReport`; Leader scope enforcement.
- [ ] Tests: fetch scope filter, PDF/XLSX, form.

### 3.4 — Vacancy, Changes, Petition Outcomes

- [ ] Add `vacancyReportSchema`, `changesReportSchema`, `petitionOutcomesReportSchema`; union + mappings.
- [ ] Add `fetchVacancyData()`, `fetchChangesData()`, `fetchPetitionOutcomesData()` in `committeeMappingHelpers.ts` (incl. petition outcome label helper).
- [ ] Create `VacancyReport.tsx`, `ChangesReport.tsx`, `PetitionOutcomesReport.tsx`; add XLSX paths and three handler cases.
- [ ] Create `vacancy-reports`, `changes-reports`, `petition-outcomes-reports` pages + forms (scope, jurisdiction, type-specific params).
- [ ] Enable all three cards; update `formatReportType()`; update `/api/generateReport`.
- [ ] Document consolidated report parameter matrix (per 3.4 ticket).
- [ ] Tests: fetch, PDF/XLSX, forms, Leader scope.

---

## Reference

- **Report track tickets:** [3.0](tickets/3.0-report-server-committee-membership-migration.md), [3.0a](tickets/3.0a-report-audit-committee-membership.md), [3.2](tickets/3.2-sign-in-sheet-report-ui.md), [3.3](tickets/3.3-designation-weight-summary-report-ui.md), [3.4](tickets/3.4-vacancy-changes-petition-reports-ui.md).
- **3.1 (Access track):** [3.1 Jurisdiction Assignment UI](tickets/3.1-jurisdiction-assignment-ui.md) — needed only for 3.2 frontend form and report API scope enforcement.
