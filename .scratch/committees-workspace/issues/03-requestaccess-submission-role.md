# 03 - Does RequestAccess remain a submission role?

Type: grilling
Status: claimed
Parent: ../map.md

## Question

Spec §16 item 4: does `RequestAccess` remain a distinct role that can submit candidates via `requestAdd`, or is it fully replaced by `Leader`?

The plan currently assumes it stays: the drawer's primary action reads **Submit candidate** for "Leader or RequestAccess", the adapters route both through `requestAdd`, and `replace-member` is offered to both (plan §8). If it is being retired, the drawer, adapters, and role-specific tests (ticket 13) shrink, and `auth-check-patterns` should be updated.

Before grilling, check what the code does today: which routes accept `RequestAccess`, whether any users hold it, and what `actingPermissions` simulation offers. Put the decision to the human; do not answer it for them. Record the answer in `apps/frontend/CONTEXT.md` if the role's meaning changes.

## Findings (fact base, 2026-09-18; decision still open)

Rank: `Developer > Admin > Leader > RequestAccess > ReadAccess` (`apps/frontend/src/lib/utils.ts:22-28`). `Leader` was inserted *before* `RequestAccess` by migration `20260218000000_add_committee_membership`; no migration ever remapped existing `RequestAccess` rows.

**Routes gated at exactly `RequestAccess`** (only three):
- `POST /api/committee/requestAdd` (`requestAdd/route.ts:351`) — jurisdiction guard runs only `if (userRole === Leader)` (`:124-146`), so RequestAccess submits **unscoped** to any active-term committee. Flagged as an open scope finding in `docs/SRS/fix-plans/01-requestadd-leader-jurisdiction-scope.md` (proposes flipping to `Leader`).
- `GET /api/committee/eligibility` (`eligibility/route.ts:73`).
- `POST /api/generateReport` (`generateReport/route.ts:29`) — scoped reports then 403 with "No jurisdictions assigned" because jurisdictions can't be assigned to non-Leaders (`api/admin/jurisdictions/route.ts:51-55`, invite schema `admin/invites/route.ts:37-49`).

**Routes that exclude it** (Leader+): `roster`, `fetchCommitteeList`, `designationWeight`, `user/jurisdictions`; Admin: `add`, `remove`, `handleRequest`, `updateLtedWeight`. Net effect on `/committees` today: a RequestAccess user sees the list, gets "Access denied" toasts loading members (both loaders are Leader-gated), yet can still POST `requestAdd` directly.

**UI branches**: the only `=== RequestAccess` branch is `CommitteeSelector.tsx:1103-1111` ("Remove or Replace Member" → `CommitteeRequestForm` → `requestAdd`); Leader does *not* get that button. `AddCommitteeForm` shows submission UI to anything above ReadAccess. `petitions/page.tsx:19` and the Designated Petition report card (`GenerateReportGrid.tsx:43`) gate at RequestAccess. Invite UI offers it (`InviteManagement.tsx:413`; default is ReadAccess). `actingPermissions` (Developer-only, `manageProfile.tsx:106-121`) offers all five levels.

**Meaning per docs**: `scripts/README.md:255` "Requested but not yet granted" (pre-Leader); `SRS_IMPLEMENTATION_ROADMAP.md:560-577` "Leaders currently use RequestAccess… invited, not yet assigned jurisdictions (or deprecated)" and says `requestAdd` should require Leader; redesign spec §11 table says RequestAccess can submit. `CONTEXT.md:12` lists it without defining it.

**Real users?** Cannot tell from the repo (seed creates only a Developer).

**If retired**: 10 source sites (schema enum needs a remap migration; `utils.ts`; `invites/display.ts`; the three route gates; `petitions/page.tsx`; `GenerateReportGrid.tsx`; `CommitteeSelector.tsx:1103`; `InviteManagement.tsx`) and ~10 test files (`requestAdd.test.ts` ~22 sessions, `generateReport.test.ts`, `reports/[id].test.ts`, `utils.test.ts`, others).

**Questions for the human** (grilling, not answered here):
1. Is there anyone in production holding `RequestAccess` who is *not* a leader-in-waiting?
2. If it stays: should it be jurisdiction-scoped like Leader (today it's unscoped on `requestAdd`), and does the workspace show it a read-only committee list it can't actually load?
3. If it goes: retire to `Leader` (needs jurisdictions) or to `ReadAccess` (loses petitions/report access)? Which of the three RequestAccess-gated routes moves where?
