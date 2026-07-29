# Fix Plan: Remove Admin Direct Activation Bypass for Appointed Vacancy Fills

Source finding: P1 - Admin direct-add bypasses Executive Committee confirmation.

## Confirmation

Confirmed. Admin UI calls `/api/committee/add`, and that route creates or updates `CommitteeMembership` directly to `ACTIVE`. New records set `activatedAt` and `seatNumber`, but do not set `confirmedAt` or `meetingRecordId`. Reactivation explicitly clears `confirmedAt`.

This conflicts with the SRS vacancy-fill workflow:

- SRS 6.4: vacancies are filled via Executive Committee vote and recorded against a meeting record.
- Scenario 3: admin selects submitted candidates approved at a meeting; status moves Submitted -> Confirmed; confirmation date and meeting reference are stored; member becomes Active.

## Evidence Checked

- `apps/frontend/src/app/committees/AddCommitteeForm.tsx`
  - Lines 253-262: admin add path calls `addCommitteeMemberMutation`, which targets direct add.
- `apps/frontend/src/app/api/committee/add/route.ts`
  - Lines 226-249: existing membership is updated to `ACTIVE`, with `confirmedAt: null`.
  - Lines 271-281: new membership is created as `ACTIVE` with `activatedAt`, `membershipType`, and `seatNumber`.
  - Line 398: route is admin-only, so this is a privileged bypass rather than a public auth gap.
- `apps/frontend/src/app/api/lib/membershipConfirmation.ts`
  - Lines 248-314: `confirmSubmittedMembership` already performs the SRS-compliant transition and writes `meetingRecordId`, `confirmedAt`, `activatedAt`, `MEMBER_CONFIRMED`, and `MEMBER_ACTIVATED`.
- `apps/frontend/src/app/api/committee/handleRequest/route.ts`
  - Lines 69-139: accept path requires and validates `meetingRecordId`, then calls `confirmSubmittedMembership`.
- `apps/frontend/src/app/api/admin/meetings/[meetingId]/decisions/route.ts`
  - Lines 141-149: meeting decisions already use `confirmSubmittedMembership`.

## Target Behavior

- Appointed vacancy fills cannot become `ACTIVE` without a submitted membership, Executive Committee meeting reference, confirmation timestamp, and audit trail.
- Admins may submit on behalf of leaders, but that creates or resubmits a `SUBMITTED` membership.
- Petition outcomes continue to use the petition outcome route, not the appointed vacancy direct-add route.
- Any retained emergency override must be explicit, audited, and require a `meetingRecordId`.

## Implementation Plan

1. Decide route semantics and make them explicit:
   - Preferred path: retire `/api/committee/add` as an activation route for appointed vacancy fills.
   - Convert admin "add" behavior to "submit on behalf" by reusing the `requestAdd` create/resubmit logic or extracting shared submission code into a helper.
   - Keep petitioned winners under `/api/admin/petition-outcomes/record`.

2. Refactor submission creation:
   - Extract a helper such as `submitCommitteeMembershipRequest(txOrClient, params)` from `requestAdd` if duplication would otherwise grow.
   - The helper should create or resubmit `CommitteeMembership` with:
     - `status: "SUBMITTED"`
     - `submittedById`
     - `membershipType` optionally set to `APPOINTED` for admin-on-behalf, or left null if current workflow expects type at confirmation.
     - `submissionMetadata` for contact, replacement target, notes, and warnings.
   - Preserve eligibility validation before submission.

3. Update `AddCommitteeForm`:
   - For admin appointed vacancy fills, call the submission endpoint/path and show submitted state rather than immediate active-member success.
   - Remove or relabel the `Membership Type` selector from this direct-add context if `PETITIONED` should only be set through petition outcomes.
   - If product keeps a direct override UI, require a selected `meetingRecordId` and label it as a confirmation/override action, not a simple add.

4. Harden or replace `/api/committee/add`:
   - Option A, preferred: change it to return 410 or 422 for appointed direct activation and point callers to submission plus meeting decision flow.
   - Option B, if emergency activation remains:
     - Add `meetingRecordId` to `committeeDataSchema`.
     - Validate the meeting exists and is an Executive Committee meeting.
     - Set `confirmedAt`, `activatedAt`, and `meetingRecordId`.
     - Emit both `MEMBER_CONFIRMED` and `MEMBER_ACTIVATED` via `logAuditEventOrThrow`.
     - Include override metadata explaining why the normal Submitted -> meeting decision path was bypassed.

5. Update tests:
   - In `apps/frontend/src/__tests__/api/committee/add.test.ts`, remove expectations that a normal admin add creates `ACTIVE`.
   - Add tests proving admin-on-behalf creates `SUBMITTED` and does not set `activatedAt`, `confirmedAt`, or `seatNumber`.
   - Add tests for direct activation rejection when `meetingRecordId` is missing if the route remains.
   - If emergency activation remains, add tests for invalid meeting, successful meeting-backed confirmation fields, and both audit rows.
   - Update UI tests for `AddCommitteeForm` success messaging.

6. Data cleanup:
   - Add a one-time SQL/reporting check for current branch data:
     - active appointed memberships where `confirmedAt is null` or `meetingRecordId is null`.
   - Decide whether to backfill from known meeting records, demote to `SUBMITTED`, or document accepted historical exceptions.

## Verification

- Run `pnpm --filter voter-file-tool test -- add.test handleRequest.test meetings.test`.
- Run `pnpm --filter voter-file-tool exec tsc --noEmit --pretty false`.
- Manually exercise admin submit-on-behalf and meeting decision flows if using a dev server.

## Illegible-Bug Checklist

- Trust boundary: admin route remains `withPrivilege(Admin)`; submission route remains `Leader` or above.
- Negative auth: direct activation without meeting must fail.
- State race: confirmation continues to use existing row lock and capacity check in `confirmSubmittedMembership`.
- Audit/state invariants: every activation has meeting fields and fail-closed audit.

## Review (Claude, 2026-07-05)

Verdict: **Sound diagnosis and correct direction, but under-specified on the Option A/B decision and misses a cleaner reuse path. Not yet ready to implement as written — resolve the issues below first.**

### Precision — all cited line numbers and behaviors confirmed accurate

- `add/route.ts` 226-249: existing membership updated to `ACTIVE`, `confirmedAt: null` (line 238), `activatedAt: new Date()` (line 234). Confirmed.
- `add/route.ts` 271-281: new membership created `ACTIVE` with `activatedAt`, `membershipType`, `seatNumber`, no `confirmedAt`/`meetingRecordId`. Confirmed (271-282).
- `add/route.ts` 398: `export const POST = withPrivilege(PrivilegeLevel.Admin, addCommitteeHandler)`. Confirmed.
- `membershipConfirmation.ts` `confirmSubmittedMembership`: writes `confirmedAt`, `activatedAt`, `meetingRecordId`, `membershipType`, `seatNumber` (248-262) and emits both `MEMBER_CONFIRMED` (292-302) and `MEMBER_ACTIVATED` (304-314) via `logAuditEventOrThrow`. Confirmed.
- `handleRequest/route.ts` 69-139: accept path requires `meetingRecordId` (70-75), validates the meeting exists (77-87), then calls `confirmSubmittedMembership`. Confirmed.
- `AddCommitteeForm.tsx` 253-262: admin path calls `addCommitteeMemberMutation.mutate` against `/api/committee/add`. Confirmed. Membership Type selector (APPOINTED/PETITIONED) is at 295-306.
- Minor nit: meeting-decisions citation says "Lines 141-149" — the actual `confirmSubmittedMembership` call is 142-149 (141 is `try {`). Trivial.

### Issues

1. **[HIGH — Completeness] The Option A vs Option B fork leaves the plan non-actionable.** Steps 3 (UI), 5 (tests), and the whole route contract branch on this unresolved choice. Downstream work cannot start until it is decided. Recommendation: commit to **Option A** (retire direct activation; admin "add" becomes submit-on-behalf) as the primary deliverable, and split any "emergency meeting-backed activation" into a separate, explicitly-scoped follow-up rather than carrying both branches through every step. The meeting-decisions flow (`decisions/route.ts`) plus `handleRequest` already provide the meeting-backed activation path, so Option B is largely redundant with existing capability.

2. **[MEDIUM — Best approach] If any emergency direct-activation is kept (Option B), do NOT re-implement the activation body.** Step 4B proposes manually setting `confirmedAt`/`activatedAt`/`meetingRecordId` and emitting the audit pair inside `add/route.ts`. That duplicates the row-lock, capacity check, replacement-target handling, seat assignment, and the `MEMBER_CONFIRMED`+`MEMBER_ACTIVATED` audit pair that `confirmSubmittedMembership` already encapsulates (membershipConfirmation.ts 106-316), and will drift from it. Cleaner: within one `$transaction`, create the row as `SUBMITTED` then immediately call `confirmSubmittedMembership(tx, {... meetingRecordId ...})`. This reuses the vetted logic and yields identical audit/state invariants for free.

3. **[MEDIUM — Correctness] `membershipType` at submission should be left `null`, not set to `APPOINTED`.** Step 2 says "optionally set to APPOINTED for admin-on-behalf." The established workflow resolves type at confirmation: `handleRequest` uses `membership.membershipType ?? "APPOINTED"` (route.ts:67) and `decisions` uses the same fallback (route.ts:147), and `requestAdd` explicitly writes `membershipType: null` on both create and resubmit (requestAdd/route.ts:263, and omitted on create at 305-315). Setting `APPOINTED` at submission would diverge from `requestAdd` for no benefit. Prefer null to match the shared submission contract.

4. **[MEDIUM — New issue] Success/idempotency semantics change and will break current UI + tests if not handled.** Today `/api/committee/add` returns 200 idempotent-success when the member is already `ACTIVE` (add/route.ts:308-317), and `AddCommitteeForm` shows an active-member success toast and calls `onAdd(...)` to refresh the roster (AddCommitteeForm.tsx:100-116). Converting to submit-on-behalf changes this to a "SUBMITTED" outcome, and the already-ACTIVE case becomes `requestAdd`'s 400 "Member is already active in this committee" (requestAdd/route.ts:209-214). Step 3 and step 5 must explicitly cover: (a) new "submitted, pending Executive Committee confirmation" success copy, (b) the roster refresh no longer implying an active add, and (c) the already-ACTIVE 400 path. Existing tests assert `ACTIVE` and idempotent-ACTIVE success (add.test.ts:220, 228, 587) and must be rewritten, not just trimmed.

5. **[LOW — Interaction with plan 01] Keep the Leader jurisdiction guard OUT of any extracted `submitCommitteeMembershipRequest` helper.** `requestAdd` gates the jurisdiction check on exact `PrivilegeLevel.Leader` (requestAdd/route.ts:125), so Admin/Developer bypass it. Plan 01 tightens this route to `withPrivilege(Leader)`. If plan 02 extracts shared submission code, the jurisdiction filtering must remain in the route layer (or stay conditional on the caller's actual privilege), or admin submit-on-behalf could be wrongly scoped/blocked. Cross-reference plan 01.

6. **[LOW — Consistency with plan 03] No conflict; plan 03 defers to plan 02 correctly.** The audit plan is `03-fail-closed-membership-audit.md` (not "03-committee-add-audit.md" as the review brief phrased it). Its §3 says: replace `logAuditEvent` with `logAuditEventOrThrow` on `/api/committee/add` "if the route remains," and "if direct activation is removed per plan 02, apply fail-closed audit to the new submit-on-behalf behavior instead." Consistent. One coordination note to add to this plan: if Option A converts add to submission, the new submit path must use `logAuditEventOrThrow` inside a `$transaction` (matching plan 03 step 2's treatment of `requestAdd`), since `requestAdd` today still uses fail-open `logAuditEvent` outside a transaction (requestAdd/route.ts:282, 317). Do not inherit that fail-open pattern into the new admin path.

7. **[LOW — Completeness] Petition path handling is correct but state the invariant.** Removing the PETITIONED option from `AddCommitteeForm` (295-306) is right — the add route defaults `membershipType` to `"APPOINTED"` (add/route.ts:42) and `PETITIONED` is only reachable today via that selector. Confirm no other caller posts `membershipType: "PETITIONED"` to `/api/committee/add` before removing it (grep shows the form is the sole caller), and that petition outcomes remain solely under `/api/admin/petition-outcomes/record`.

### Data cleanup note

Step 6's backfill/demote check is reasonable but this work is on the `feat/srs-implementation` branch with no production data, so scope it as a branch-data sanity report rather than a migration blocker.

