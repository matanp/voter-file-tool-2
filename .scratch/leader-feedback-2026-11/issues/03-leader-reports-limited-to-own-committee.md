# 03 - Limit leader report generation to their own committee

Status: resolved

## Ask (verbatim)

> 3. Report generation doesn't work in city committees because you can only select Rochester and not the more specific committee. Remove the option to select leaders. They only need to ever make a report for their own committee. So report generation should be limited to the committee they have access to.

## Diagnosis

The bug is real and reproducible from the code. It affects every jurisdiction-scoped report a Leader can open:
Committee Roster, Sign-In Sheet, Weight Summary, Vacancy, and Changes.

1. `loadScopedReportPageData` (`apps/frontend/src/lib/loadScopedReportPageData.ts`) gives a Leader the
   `CommitteeList` rows that match their assignments. A Rochester Leader assigned to one LD gets only rows
   for `ROCHESTER` + that LD.
2. `ScopedReportForm` (`apps/frontend/src/components/reports/ScopedReportForm.tsx`) shows the Legislative
   District picker only when `cityTown === "ROCHESTER" && legDistricts.length > 1`. With one LD the picker is
   hidden, so the Leader can pick only "Rochester" and the payload has no `legDistrict`.
3. `validateReportJurisdictionAccess` (`apps/frontend/src/app/api/lib/committeeValidation.ts`) runs
   `committeeMatchesJurisdictions("ROCHESTER", legDistrict ?? 0, …)`. LD 0 doesn't match the Leader's LD
   assignment, so the API returns 403 "You do not have access to the requested jurisdiction".

Town Leaders (assignments with `legDistrict: null`) aren't affected. That is why it only breaks "in city
committees".

The server check is correct and stays as it is. The bug is in the form.

"Remove the option to select leaders" is read as "remove the jurisdiction selection for leaders". No part of
the report UI lets anyone select a leader.

## Spec

Leaders choose from their own **Assignments** for the active term, not from City/Town then LD.

- **Page data:** for an actual Leader, `loadScopedReportPageData` also returns their assignments for the
  active term (`{ cityTown, legDistrict: number | null }[]`, from `getUserJurisdictions`). Admin/Developer
  data doesn't change.
- **Form, Leader with one assignment:** no City/Town or LD picker. Show the jurisdiction as read-only text
  (for example "Rochester – LD 22" or "Brighton"), and submit it automatically.
- **Form, Leader with several assignments:** a single dropdown listing exactly those assignments, with the
  same labels. The first one is selected by default.
- **Form, Leader with no assignments:** no picker. Show a message that they have no assigned committee for the
  current term, and disable submit.
- **Payload:** `scope: "jurisdiction"`, `cityTown` from the assignment, and `legDistrict` only when the
  assignment has one. A town-wide assignment sends no `legDistrict`, as today.
- **Admins** keep the current Countywide / By Jurisdiction, City/Town, and LD controls.
- **Developer acting as Leader:** match Leader functionality exactly
- No change to the API, the shared-validators schema, or report-server.

## Acceptance criteria

- [x] A Leader assigned only to Rochester LD N can generate each Leader-visible scoped report without
      choosing anything, and the request includes `legDistrict: N`.
- [x] A Leader with two assignments sees one dropdown with exactly those two, and each one generates.
- [x] A town-wide Leader (`legDistrict: null`) gets a payload with `cityTown` and no `legDistrict`.
- [x] A Leader with no assignments sees the "no assigned committee" message and can't submit.
- [x] The Admin form doesn't change.
- [x] Tests: loader returns Leader assignments; form payload for the single-LD, multi, town-wide, and
      no-assignment cases.

## Comments

- 2026-11-01 triage: confirmed the root cause above. Maintainer chose a picker limited to the Leader's own
  assignments, auto-selected when there is only one. Status set to `ready-for-agent`.
- 2026-11-01: implemented in `911971b` (merged via PR #134). Status set to `resolved`. A developer acting as
  Leader gets no assignments, so they see the "no assigned committee" message. That is intentional.
