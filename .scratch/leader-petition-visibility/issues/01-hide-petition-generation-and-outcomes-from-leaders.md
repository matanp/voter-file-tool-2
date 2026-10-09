# 01 - Hide petition generation and petition outcomes from Leaders

Status: ready-for-agent
Type: task

## Source

Avi, 2026-09-17 (`docs/avi-notes-9-17.md:4-7`):

> Remove all petition references from leader view. That will be a new feature for 2028
> ------ petition outcomes and designated petitions hide from them (on the report page)

## Background

`PrivilegeLevel` ranks `Developer > Admin > Leader > RequestAccess > ReadAccess` (`apps/frontend/prisma/schema.prisma:16-22`, `apps/frontend/src/lib/utils.ts` `hasPermissionFor`). So anything gated at RequestAccess or Leader is visible to Leaders. Everything Admin-only is already hidden: the petition outcomes panel and the designation weight check table in `CommitteeSelector`, the membership-type picker in `AddCommitteeForm`, `/admin/petition-outcomes`, and `petitionContext` on the committee detail endpoint.

The references fall into three groups by what the data is, not where it appears.

## Requirements

### A. Petition generation (in scope)

Leaders must not see or be able to use designated-petition generation.

- `apps/frontend/src/components/reports/GenerateReportGrid.tsx:39-43`: Designated Petition card, `minPrivilege: RequestAccess`.
- `apps/frontend/src/app/petitions/page.tsx:21`: page gate at RequestAccess.
- `apps/frontend/src/components/home/QuickActions.tsx:23-25`: "Petitions" quick action, which has no privilege filter at all.
- `apps/frontend/src/app/api/generateReport/route.ts:29-30`: route gate at RequestAccess. There's no per-type check, so a Leader can POST a `designatedPetition` job directly. Add a type-specific server-side check like the existing `ldCommittees` one (`:59-71`).
- `apps/frontend/src/components/home/FeaturesGrid.tsx:38`: static "Designated petitions" copy. Remove it or gate it if the home page renders for Leaders.

### B. Petition outcomes (in scope)

Leaders must not see petition results: won/lost/tie, vote counts, petition primary dates. Hiding only the Petition Outcomes report isn't enough, because the same results show up in two other places Leaders can reach.

- `apps/frontend/src/components/reports/scopeReportUiRegistry.ts:69-76`: Petition Outcomes report, `minPrivilege: Leader`. This drives the grid card and `/petition-outcomes-reports` (`apps/frontend/src/app/petition-outcomes-reports/page.tsx`). `generateReport` only enforces jurisdiction for scoped reports, not a per-type minimum, so add a server-side check for `petitionOutcomesReport` too.
- Changes Report: "Petition Won" / "Petition Lost" change types with vote-count details (`apps/report-server/src/committeeMappingHelpers.ts:544-576`). For Leader-generated reports, drop the petition-loss rows. Report a petition win as a plain "Added" without vote details. The report server needs the requester's privilege, or the frontend has to pass a flag in the job payload.
- Committee detail endpoint `GET /api/committee/{committeeListId}/detail`: `petition_outcome` history events are currently returned to Leaders (`apps/frontend/src/app/api/lib/membershipHistory.ts`, `.scratch/committees-workspace/issues/06-committee-detail-endpoint.md:66`). Omit them for non-Admins, as `petitionContext` already is. Decide whether a petition-win activation turns into a plain `confirmed`/`activated` event for Leaders or is dropped.
- Workspace ticket 12 (`.scratch/committees-workspace/issues/12-history-tab.md`): the "Election outcomes" section is Admin-only.

### C. "Petitioned" as a seat/membership type (open question for Avi)

This is seat and membership metadata, not a petition feature, and designation weight depends on it. Leave it as is until Avi confirms whether "all petition references" covers it.

- Vacancy Report: "Petitioned (Filled) / Petitioned (Vacant) / Non-Petitioned" columns (`apps/report-server/src/components/VacancyReport.tsx:67-69`, `xlsxGenerator.ts:365-378`).
- Designation Weight Summary: "Petitioned Seats / Occupied Petitioned / Vacant Petitioned" columns (`apps/report-server/src/components/DesignationWeightSummary.tsx:124-130`, `xlsxGenerator.ts:288-290`).
- Committee page: Members seat table "Petitioned/Appointed" type (`apps/frontend/src/app/committees/CommitteeSelector.tsx:1047`); roster table type label and "— petitioned vacant —" row (`apps/frontend/src/app/committees/CommitteeRosterTable.tsx:30,207`).
- Record search: "Petitioned" badge (`apps/frontend/src/app/recordsearch/RecordsList.tsx:282`).
- Roster and detail endpoints: `isPetitioned` / `petitionedVacant` (`apps/frontend/src/app/api/committee/roster/buildSeatRosterRows.ts:240-251`).
- Workspace tickets 09 (roster tab "petitioned-vacancy distinction") and 11 (seats and weight tab), plus the `_prototype` variants.

## Open questions

1. **Group C**: does "remove all petition references" include the Petitioned/Appointed distinction and the petitioned-seat columns? (Ask Avi.)
2. ~~**Gate shape**~~: resolved 2026-10-09. Raise both Designated Petition and Petition Outcomes to **Admin** (UI `minPrivilege`, page gates, and the new type-specific `generateReport` checks). This knowingly also removes them from RequestAccess users. Re-examining the privilege model is deferred (see `.scratch/committees-workspace/issues/03-requestaccess-submission-role.md`).
3. ~~**Report history**~~: resolved 2026-10-09. Leave Leaders' existing Designated Petition / Petition Outcomes reports in their report list (`apps/frontend/src/components/reports/ReportCard.tsx:271`) as they are.

## Acceptance (A and B)

- Both report types are gated at Admin everywhere (cards, pages, quick action, `generateReport`).
- A Leader sees no Designated Petition or Petition Outcomes card, page, or quick action. The direct URLs redirect or deny, and `POST /api/generateReport` returns 403 for both types.
- A Changes Report generated by a Leader has no "Petition Won"/"Petition Lost" rows and no vote counts.
- The committee detail response for a Leader has no `petition_outcome` history events. Cover this with a serialized-body test in the style of the existing Leader PII test.
- Admin behavior is unchanged.

## Comments

- 2026-10-09 (detail-endpoint slice): **Decision: a petition win shows to Leaders as a plain `activated` event.** Non-Admins get no `petition_outcome` events. The `MEMBER_ACTIVATED` audit row the petition-record route writes on a win (which Admins see folded into the `petition_outcome` event) becomes, for Leaders, `{ kind: "activated", source: "other", actor: { role }, member: { name, seatNumber } }`: no outcome, vote count, primary date, petition seat or `membershipType`. `source` is `"other"` rather than `"petition_outcome"` so the provenance itself does not leak. It is keyed on the ACTIVATED row, not `PETITION_RECORDED`, so Leaders see an event exactly when a status change happened (a win recorded for an already-active member shows nothing). Lost, tie and undo-compensated outcome rows are dropped. Response types (`CommitteeDetailResponse`, `HistoryEvent`) are unchanged. Code: `apps/frontend/src/app/api/lib/membershipHistory.ts`; test: "serializes no petition outcome, vote, or primary-date data for a Leader" in `apps/frontend/src/__tests__/api/committee/detail.test.ts`.
