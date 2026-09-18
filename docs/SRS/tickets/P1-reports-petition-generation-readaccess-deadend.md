# P1 — Petition Generation Is a Permission Dead-End for ReadAccess Users

**Status:** Done
**Priority:** P1 — High
**Effort:** 0.5 day
**Source:** [WHOLE_APP_FRONTEND_STATE_INTERACTION_REVIEW_claude-opus-4-8_2026-07-10.md](../../WHOLE_APP_FRONTEND_STATE_INTERACTION_REVIEW_claude-opus-4-8_2026-07-10.md) (Finding 1)
**Depends on:** [4.7 Scenario 7: Leader Reports Scope and Roster](4.7-scenario7-leader-reports-scope-and-roster.md)

## Problem

The reports hub and the Designated Petition entry point are gated only at "authenticated," but
report generation requires `RequestAccess`. Privilege order in `apps/frontend/src/lib/utils.ts` is
`Developer < Admin < Leader < RequestAccess < ReadAccess`, so a `ReadAccess` user sits **below** the
generation bar.

The drift chain:

1. `apps/frontend/src/components/reports/GenerateReportGrid.tsx` — the "Designated Petition" card in
   `NON_SCOPE_REPORT_TYPES` has **no** `minPrivilege`, so it is never filtered out:

   ```ts
   {
     title: "Designated Petition",
     description: "Generate designated petition forms (PDF)",
     href: "/petitions",
     enabled: true,
     // no minPrivilege
   }
   ```

   For a `ReadAccess` user the scoped cards (Leader) and Voter List card (Admin) are all filtered
   out, so Designated Petition is the **only** visible generation card.

2. `apps/frontend/src/app/reports/page.tsx` and `apps/frontend/src/app/petitions/page.tsx` both gate
   on `getAuthenticatedPageAccess()` only — any logged-in user renders the page and the form.

3. `apps/frontend/src/app/petitions/GeneratePetitionForm.tsx` POSTs to `/api/generateReport`, which
   is `withPrivilege(PrivilegeLevel.RequestAccess, …)` in
   `apps/frontend/src/app/api/generateReport/route.ts`.

Net effect: a `ReadAccess` user sees the card, opens the petition form, fills it out, submits, and
receives a `403` — the client-visible action is one the server always rejects for that role.

## Recommended Fix

### 1. Gate the card

In `GenerateReportGrid.tsx`, add `minPrivilege: PrivilegeLevel.RequestAccess` to the Designated
Petition entry so the existing `visibleReportTypes` filter hides it from `ReadAccess`.

### 2. Gate the page

In `petitions/page.tsx`, require `RequestAccess` rather than bare authentication — either inline via
`hasPermissionFor(access.privilegeLevel, PrivilegeLevel.RequestAccess)` on the
`getAuthenticatedPageAccess()` result, or add a `getRequestAccessPageAccess()` helper alongside
`getAdminPageAccess()` in `apps/frontend/src/lib/getAdminPageAccess.ts` and render the existing
"no permission" view on denial.

### 3. Sweep sibling entry points

Confirm no other always-visible card routes to a `RequestAccess`/higher generate flow without a
matching `minPrivilege` and page guard (the scoped and Voter List cards are already gated; only the
Designated Petition card is missing one).

## Acceptance Criteria

- [x] A `ReadAccess` user does not see the Designated Petition card on `/reports`.
- [x] A `ReadAccess` user visiting `/petitions` directly gets the "no permission" view, not the form.
- [x] A `RequestAccess`+ user sees the card, reaches the form, and can generate as before.
- [x] No other reports-hub card exposes a generate action the acting role's server route rejects.

## Test Plan

Follow [test-type-safety](../../../skills/test-type-safety/SKILL.md) when adding tests.

### Component — `GenerateReportGrid`

- With `actingPermissions = ReadAccess`, the Designated Petition card is not rendered.
- With `actingPermissions = RequestAccess`, the Designated Petition card is rendered.

### Page — `petitions/page.tsx`

- Denies (renders no-permission view) for a `ReadAccess` session.
- Renders the form for a `RequestAccess` session.

## Files to Touch

| File | Change |
|------|--------|
| `apps/frontend/src/components/reports/GenerateReportGrid.tsx` | Add `minPrivilege: RequestAccess` to the Designated Petition card |
| `apps/frontend/src/app/petitions/page.tsx` | Gate page to `RequestAccess`, render no-permission view on denial |
| `apps/frontend/src/lib/getAdminPageAccess.ts` | Optional: add `getRequestAccessPageAccess()` helper |
| `apps/frontend/src/__tests__/components/reports/GenerateReportGrid.test.tsx` | Card visibility by privilege |

## Implementation Order

1. Add/extend component test asserting card visibility by privilege.
2. Add `minPrivilege` to the Designated Petition card.
3. Gate `petitions/page.tsx` (inline or via new helper) and cover with a page/access test.
4. Manually verify `/reports` and `/petitions` as `ReadAccess` vs `RequestAccess`.

## Resolution

Implemented on `feat/srs-implementation`.

- `GenerateReportGrid.tsx` — added `minPrivilege: PrivilegeLevel.RequestAccess` to the Designated
  Petition card so the existing `visibleReportTypes` filter hides it from `ReadAccess`.
- `petitions/page.tsx` — gated inline: unauthenticated still renders `PageSignInRequired`;
  authenticated but below `RequestAccess` renders `AdminPageAccessDenied`. Kept the two denial
  states distinct so logged-out users retain the sign-in prompt.
- Reused the existing `AdminPageAccessDenied` (already the app's generic denial view, e.g. on
  `voter-list-reports/page.tsx`) rather than adding a `getRequestAccessPageAccess()` helper or a new
  denial component — the optional helper would have collapsed the sign-in vs. denied states.
- Added `__tests__/components/reports/GenerateReportGrid.test.tsx` asserting card visibility by
  privilege (hidden for `ReadAccess`, shown for `RequestAccess`). Passing; `tsc`/`eslint` clean.

Sweep result: the only always-visible card without a matching gate was Designated Petition. Voter
List (Admin) and the scoped cards (Leader) were already gated; the Committee Report (Advanced) card
is only added for acting Admins.

## Related

- [WHOLE_APP_FRONTEND_STATE_INTERACTION_REVIEW_claude-opus-4-8_2026-07-10.md](../../WHOLE_APP_FRONTEND_STATE_INTERACTION_REVIEW_claude-opus-4-8_2026-07-10.md)
- [4.7 Scenario 7: Leader Reports Scope and Roster](4.7-scenario7-leader-reports-scope-and-roster.md)
