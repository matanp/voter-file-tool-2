# 16 - Tighten analytics types and the drawer's tracking

Status: needs-triage

Follow-up to 08. Cleanup from the PR #181 review. Nothing here changes what PostHog receives.

## Do

- Type `report_type` in `lib/analytics.ts` as Prisma's `ReportType | "unknown"` instead of `string`, and
  replace `getPrismaReportType(key as ReportTypeKey)` in its try/catch with a type guard or a `safeParse` on
  the key.
- The committee drawer forms (`AddMemberFlow`, `RemoveMemberForm`, `RecordResignationForm`, `ReportExitForm`)
  each repeat "await `run`, then `track(..., outcomeOf(failure))`". Give `useActionSubmit` an optional tracking
  callback that receives the outcome, so each form passes its event once.

## Done when

`tsc` rejects an unknown report type in a `report_*` event, `lib/analytics.ts` has no cast, and the drawer
forms have no copied tracking code. The drawer's analytics tests still pass unchanged.
