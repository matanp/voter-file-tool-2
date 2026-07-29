# Fix Plan: Lock Down `committee/requestAdd` to Leader Jurisdiction Scope

Source finding: P1 - RequestAccess users can submit committee requests outside any jurisdiction.

## Confirmation

Confirmed. `POST /api/committee/requestAdd` is exported with `withPrivilege(PrivilegeLevel.RequestAccess, requestAddHandler)`, while its jurisdiction guard only runs when `session.user.privilegeLevel === PrivilegeLevel.Leader`. Current tests also encode `PrivilegeLevel.RequestAccess` as the successful happy-path role.

This conflicts with:

- SRS 3.2: local committee leaders have access limited to assigned jurisdictions.
- SRS 11.2: leader authorization is jurisdiction scoped.
- Roadmap 3.1: `committee/requestAdd` should require `Leader`, and leaders can only submit to assigned jurisdictions.

## Evidence Checked

- `apps/frontend/src/app/api/committee/requestAdd/route.ts`
  - Lines 124-146: jurisdiction filtering only runs for exact `Leader`.
  - Lines 304-315: successful create writes `CommitteeMembership.status = "SUBMITTED"`.
  - Lines 345-348: route wrapper requires only `RequestAccess`.
- `apps/frontend/src/__tests__/api/committee/requestAdd.test.ts`
  - Lines 68-98: happy path uses `PrivilegeLevel.RequestAccess` and expects success.
  - Lines 634-656: auth test suite declares required privilege as `RequestAccess`.
- `docs/SRS/SRS_IMPLEMENTATION_ROADMAP.md`
  - Lines 564-578: `Leader` is the scoped role; `RequestAccess` is invited/not assigned; `committee/requestAdd` should require `Leader`.

## Target Behavior

- `ReadAccess` and `RequestAccess` cannot submit committee membership requests.
- `Leader` can submit only for committees matching one of their `UserJurisdiction` rows for the active term.
- `Leader` with no jurisdictions fails closed with 403.
- `Admin` and `Developer` retain access through the privilege hierarchy and bypass jurisdiction filtering, using actual session privilege only.

## Implementation Plan

1. Change the route wrapper:
   - In `apps/frontend/src/app/api/committee/requestAdd/route.ts`, export `POST` with `withPrivilege(PrivilegeLevel.Leader, requestAddHandler)`.
   - Keep using `session.user.privilegeLevel` as the actual server authority. Do not use `actingPermissions`.

2. Make the route-level scope check explicit:
   - Compute `const bypassesJurisdiction = userPrivilegeLevel === PrivilegeLevel.Admin || userPrivilegeLevel === PrivilegeLevel.Developer`.
   - For non-bypassing callers, load `getUserJurisdictions(userId, activeTermId, PrivilegeLevel.Leader)`.
   - Reject if the list is empty or `committeeMatchesJurisdictions(...)` returns false.
   - Avoid exact-role checks for authorization behavior where the wrapper already allows higher roles.

3. Preserve existing business behavior for valid leaders:
   - Existing create/resubmit/idempotent behavior should remain unchanged after authorization passes.
   - Eligibility checks, metadata persistence, and warnings should still run after the scope check.

4. Update tests:
   - In `requestAdd.test.ts`, change happy-path sessions from `RequestAccess` to `Leader`.
   - Change the auth test config required privilege from `RequestAccess` to `Leader`.
   - Add negative tests:
     - `RequestAccess` receives 403 and no membership row is created.
     - `Leader` with no jurisdictions receives 403.
     - `Leader` assigned to a different city/LD receives 403.
     - `Leader` assigned to matching city/all-LD or city/specific-LD succeeds.
     - `Admin` succeeds without `UserJurisdiction`.
   - Use existing jurisdiction helper tests as patterns from `apps/frontend/src/__tests__/api/lib/committeeValidation.jurisdictions.test.ts`.

5. UI follow-up:
   - Confirm client-side form visibility already hides submission controls below `Leader`.
   - If any `RequestAccess` UI still renders submission controls, gate it with `actingPermissions` only as display logic. Server remains authoritative.

## Verification

- Run `pnpm --filter voter-file-tool test -- requestAdd`.
- Run `pnpm --filter voter-file-tool exec tsc --noEmit --pretty false`.
- Run `pnpm run check:api-routes`.

## Illegible-Bug Checklist

- Trust boundary: route remains wrapped with `withPrivilege`.
- Negative auth: add unauthenticated, insufficient privilege, no-jurisdiction, and cross-jurisdiction tests.
- Data scope: prove every non-admin submission is within assigned jurisdiction.
- Validation: keep existing Zod request schema.

## Review (Claude, 2026-07-05)

Verdict: **Approach is correct and secure, but the plan is incomplete on two points that will cause test failures and a broken UX if followed literally.** Fix the two Medium items below before implementing.

### Precision — verified accurate
- `route.ts` line citations all correct: jurisdiction guard at lines 124‑146 (`if (userPrivilegeLevel === PrivilegeLevel.Leader)`), create at 304‑315, wrapper `withPrivilege(PrivilegeLevel.RequestAccess, requestAddHandler)` at 345‑348.
- Test citations correct: happy path uses `RequestAccess` at `requestAdd.test.ts:71`; auth suite `requiredPrivilege: PrivilegeLevel.RequestAccess` at line 638 (within the 634‑656 block).
- Roadmap 564‑578 confirms `committee/requestAdd` should require `Leader` (line 577) and defines hierarchy Developer > Admin > Leader > RequestAccess > ReadAccess.
- Helper signatures confirmed: `getUserJurisdictions(userId, termId, privilegeLevel)` returns `null` for Admin/Developer and `UserJurisdiction[]` otherwise (`committeeValidation.ts:129‑143`); `committeeMatchesJurisdictions(cityTown, legDistrict, jurisdictions)` returns false on an empty list (`.some` over `[]`), so "Leader with no jurisdictions → 403" is already satisfied (`committeeValidation.ts:194‑204`).
- Hierarchy math verified against `hasPermissionFor` + enum order (`schema.prisma:16‑22`, `utils.ts:31‑42`): `withPrivilege(Leader)` admits Leader/Admin/Developer and rejects RequestAccess/ReadAccess with 403. Matches the Target Behavior section exactly.
- Verification commands are valid: `voter-file-tool` is the frontend package name (`apps/frontend/package.json`); `check:api-routes` is a root script.

### Issue 1 — [MEDIUM, tests] Switching sessions to `Leader` requires a new `userJurisdiction.findMany` mock; plan omits it
Today the happy path passes precisely because the session is `RequestAccess`, which skips the `=== Leader` block, so no jurisdiction data is needed. `requestAdd.test.ts` has **zero** `userJurisdiction` references. Once happy-path/auth sessions become `Leader`, the handler will call `getUserJurisdictions` → `committeeMatchesJurisdictions`, and with no mock `prismaMock.userJurisdiction.findMany` returns the default (empty) → `committeeMatchesJurisdictions(...) === false` → **403**, breaking every success test (including the generated auth success case at `createAuthenticatedTestCase(Leader, 201)`).
- Correction: update the shared `setupHappyPath` helper (`requestAdd.test.ts:47`) to mock `(prismaMock.userJurisdiction as { findMany: jest.Mock }).findMany.mockResolvedValue([{ cityTown: "Test City", legDistrict: 1, ... }])` (or `legDistrict: null` for the all-districts case). Pattern already used at `fetchCommitteeList.test.ts:52` and `generateReport.test.ts:291,328`. Note there are 22 `RequestAccess` occurrences in this file, not just the happy path — all success-expecting ones must flip to `Leader`, and the negative-role tests the plan adds must NOT get the matching mock.

### Issue 2 — [MEDIUM, UI / new issue] Step 5's premise is false; RequestAccess submission UI exists and will 403
Step 5 assumes the client "already hides submission controls below Leader." It does not:
- `AddCommitteeForm.tsx:269` returns `null` only for `actingPermissions === ReadAccess`; `RequestAccess` still reaches the add flow and renders `CommitteeRequestForm` (posts to `/api/committee/requestAdd`).
- `CommitteeSelector.tsx:1163‑1171` renders a "Remove or Replace Member" button **exclusively** for `actingPermissions === PrivilegeLevel.RequestAccess`, which opens `CommitteeRequestForm` (line 1201).
After this change those controls will hit the server and get 403 for RequestAccess users. Server stays authoritative (secure), but the UX is broken.
- Correction: regate both call sites to `Leader` using `actingPermissions` (per auth-check skill: display-only gate, e.g. `hasPermissionFor(actingPermissions, PrivilegeLevel.Leader)`), not `=== RequestAccess`. Make this a required step, not a "confirm."

### Issue 3 — [LOW, simplification] Step 2's rewrite is optional
The minimal, sufficient fix is changing only the wrapper to `PrivilegeLevel.Leader`. The existing `if (userPrivilegeLevel === PrivilegeLevel.Leader)` block already yields correct behavior once the wrapper gates the door: Admin/Developer skip it (bypass), RequestAccess/ReadAccess never reach the handler. The `bypassesJurisdiction = Admin || Developer` refactor is a readability improvement aligned with the skill's "avoid exact-role checks" guidance and is fine to do, but it is not load-bearing for correctness — either form is acceptable.

### Issue 4 — [LOW, note] Auth-suite harness does not exercise the real hierarchy
`createInsufficientPrivilegeTestCases` (`testUtils.ts:838‑852`) mocks `hasPermissionFor` to a fixed boolean and excludes only `requiredPrivilege` and `Admin`. With `requiredPrivilege = Leader` it will generate a "Developer gets 403" case even though Developer really outranks Leader; it passes only because the mock forces false. This is a pre-existing harness limitation, not introduced here — acceptable, but do not read those generated cases as real-hierarchy coverage. The plan's hand-written negative tests (RequestAccess 403, Leader-no-jurisdiction 403, cross-jurisdiction 403) are the meaningful ones; keep them.

### Bottom line
Ship it after (1) adding the `userJurisdiction.findMany` mock to `setupHappyPath` and flipping all success sessions to `Leader`, and (2) regating the `AddCommitteeForm`/`CommitteeSelector` submission controls from ReadAccess/RequestAccess to Leader. The server-side authorization design itself is correct and idiomatic.

