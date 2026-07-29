# P1 — Replacement Workflow Blocked on Full Committees

**Status:** Open  
**Priority:** P1 — High  
**Effort:** 1 day  
**Source:** [FRONTEND_UI_REVIEW_FEAT_SRS_IMPLEMENTATION.md](../../FRONTEND_UI_REVIEW_FEAT_SRS_IMPLEMENTATION.md) (finding lines 25–31)  
**Depends on:** [1.R.3 Replacement Flow](1.R.3-replacement-flow-not-implemented.md) (accept path — done), [1.R.14 handleRequest Capacity](1.R.14-handleRequest-capacity-replacement.md) (accept capacity — done)

## Summary

Leaders use **Remove or Replace Member** on a full committee to swap one member for another. The UI disables candidate selection whenever `committeeList.length >= maxSeatsPerLted`, even when a removal is already selected. That blocks the primary replacement scenario.

Fixing the button alone is insufficient: eligibility preflight and `requestAdd` also apply a naive CAPACITY hard stop that ignores `removeMemberId`. Acceptance (`handleRequest`) already accounts for replacements (1.R.14); submission and UX do not.

## Problem

### User flow (broken)

1. RequestAccess user clicks **Remove or Replace Member** on a roster card (`CommitteeSelector.tsx`).
2. `CommitteeRequestForm` opens with `removeMember` pre-set.
3. User toggles **Would you like to add someone to the committee?**, searches, and selects a replacement.
4. On a full committee (e.g. 4/4), the **Select Candidate** button is disabled with label **Committee Full**.

Removal-only requests remain correctly blocked at submit (admin action). Replacement requires both `addMemberId` and `removeMemberId`; the form never lets the user pick the add side.

### Three capacity gates (only one fixed today)

| Layer | Location | Replacement-aware? |
|-------|----------|-------------------|
| UI candidate button | `CommitteeRequestForm.tsx` | No — blocks when `committeeList.length >= maxSeatsPerLted` |
| Eligibility preflight | `GET /api/committee/eligibility` → `validateEligibility` | No — CAPACITY when `activeCount >= maxSeatsPerLted` |
| Request submission | `POST /api/committee/requestAdd` → `validateEligibility` | No — same CAPACITY rule |
| Request acceptance | `POST /api/committee/handleRequest` (accept) | **Yes** — `effectiveActiveCount = activeCount - 1` when valid replacement target (1.R.14) |

Even after enabling the UI button, preflight would show CAPACITY and `isSubmitBlocked` would prevent submit; if preflight were bypassed, `requestAdd` would return `INELIGIBLE`.

## Recommended Fix (Option A)

Extend the **1.R.14 effective-capacity pattern** from `handleRequest` upstream into eligibility and the form. Keep remove-only as admin-only; only adjust behavior when a valid replacement removal is in scope.

### 1. UI — `CommitteeRequestForm.tsx`

**Candidate selection gate**

```ts
const isReplacement = requestRemoveMember != null;
const atCapacity = committeeList.length >= maxSeatsPerLted;
const canSelectCandidate = !member && (!atCapacity || isReplacement);
```

- `disabled={!canSelectCandidate}` (still block if candidate is already on the committee).
- Button label: **Select Replacement** when `isReplacement`, else **Select Candidate**.
- Summary line: **Replacing with: …** instead of **Adding to the committee: …** when `requestRemoveMember` is set.

**Optional UX polish (same PR or follow-up)**

- When `removeMember` prop is passed (roster **Remove or Replace** entry), auto-open the add/search section (`addMemberFormOpen = true`) so the flow feels like one replacement step, not two toggles.

**Do not change**

- `isSubmitBlocked` rule `(!!requestRemoveMember && !requestAddMember)` — remove-only stays blocked with existing admin contact copy.
- `AddCommitteeForm.tsx` — add-only path when committee has vacancy; no `removeMember` context.

### 2. Eligibility — `validateEligibility` in `lib/eligibility.ts`

Add optional replacement context to options (extend `ValidateEligibilityOptions`):

```ts
export type ValidateEligibilityOptions = {
  forceAdd?: boolean;
  overrideReason?: string;
  /** When set, capacity check treats this ACTIVE member as freeing one seat. */
  removeMemberId?: string;
};
```

**CAPACITY logic (section 4)**

1. Count ACTIVE memberships for `committeeListId` + `termId` (unchanged).
2. If `removeMemberId` is provided:
   - Look up `CommitteeMembership` via composite key `voterRecordId_committeeListId_termId`.
   - Require target exists and `status === "ACTIVE"`.
   - Require target is not the incoming `voterRecordId` (cannot replace self with self).
   - If valid: `effectiveActiveCount = activeCount - 1`.
   - If invalid: do **not** subtract; CAPACITY applies normally (submission should fail consistently).
3. Hard-stop when `effectiveActiveCount >= config.maxSeatsPerLted`.

Mirror validation semantics from `handleRequest/route.ts` (lines 183–225) without duplicating business rules in comments — consider a small shared helper (e.g. `getEffectiveActiveCountForReplacement`) only if it keeps both call sites in sync without over-abstracting.

### 3. Preflight API — `GET /api/committee/eligibility/route.ts`

- Accept optional query param `removeMemberId`.
- Pass through to `validateEligibility(..., { removeMemberId })`.
- Snapshot `committee.activeMemberCount` may remain the raw count; optional enhancement: include `effectiveActiveMemberCount` in snapshot when replacement context is present (helps `EligibilitySnapshotPanel` show 3/4 effective during replacement).

### 4. Form preflight fetch — `CommitteeRequestForm.tsx`

When `requestRemoveMember` is set, include `removeMemberId` in the eligibility query:

```
/api/committee/eligibility?voterRecordId=...&committeeListId=...&removeMemberId=...
```

Add `requestRemoveMember?.VRCNUM` to the preflight `useEffect` dependency array.

### 5. Submission — `POST /api/committee/requestAdd/route.ts`

After parsing `removeMemberId` from the body, pass it into eligibility:

```ts
const eligibility = await validateEligibility(
  sanitizedAddMemberId,
  committeeRequested.id,
  activeTermId,
  {
    ...eligibilityOptions,
    ...(removeMemberId?.trim()
      ? { removeMemberId: removeMemberId.trim() }
      : {}),
  },
);
```

No change to metadata persistence — `removeMemberId` is already stored in `submissionMetadata`.

## Alternatives Considered

| Option | Description | Verdict |
|--------|-------------|---------|
| **A — Full vertical slice** (recommended) | UI + eligibility + preflight + requestAdd | Correct end-to-end behavior |
| **B — UI only** | Relax button disable | Insufficient; user hits CAPACITY on preflight/submit |
| **C — Skip capacity at submit** | Allow SUBMITTED at capacity when `removeMemberId` present; rely on accept | Weak; preflight still wrong; splits rules across routes |
| **D — Replacement wizard** | Dedicated replace-only UI instead of shared add/remove toggles | Better UX long-term; same backend work as A |

## Product / Semantics (decisions)

These are resolved by the recommended approach; document for reviewers:

1. **Remove-only stays admin-only.** Leaders request replacement (add + remove), not unilateral removal.
2. **Add on full committee requires a selected removal.** UI gate: `!atCapacity || requestRemoveMember`. If user opens the generic form without pre-set removal, they must pick a member to remove before selecting a candidate on a full committee.
3. **Replacement target must be ACTIVE on the same committee/term** at eligibility time — same rule as accept. If the target resigns before submit, CAPACITY correctly blocks.
4. **Cannot select the removal target as replacement** — block in UI (`record.VRCNUM === requestRemoveMember.VRCNUM`) and treat as invalid in eligibility if passed.
5. **Copy uses “replace” language** when `requestRemoveMember` is set, to avoid implying a net seat increase.

## Acceptance Criteria

- [ ] On a full committee, with `removeMember` pre-set from **Remove or Replace Member**, user can search and select a replacement candidate.
- [ ] Preflight for that candidate does not return CAPACITY when replacement target is valid and ACTIVE.
- [ ] `POST /api/committee/requestAdd` with `addMemberId` + `removeMemberId` succeeds at capacity (creates SUBMITTED membership with metadata).
- [ ] `POST /api/committee/requestAdd` with only `addMemberId` on a full committee still returns `INELIGIBLE` / CAPACITY.
- [ ] Preflight and submit without `removeMemberId` on full committee still CAPACITY-block.
- [ ] Invalid or missing replacement target does not reduce effective capacity.
- [ ] UI labels reflect replacement vs add when removal is selected.
- [ ] Remove-only (remove without add) remains non-submittable for RequestAccess users.

## Test Plan

### Unit — `lib/eligibility.ts`

- At capacity (4/4), valid `removeMemberId` → no CAPACITY hard stop.
- At capacity, no `removeMemberId` → CAPACITY.
- At capacity, `removeMemberId` not ACTIVE or wrong committee → CAPACITY.
- At capacity, `removeMemberId === voterRecordId` → CAPACITY (or explicit invalid-target handling).

### API — `requestAdd.test.ts`

- Submit at capacity with `addMemberId` + valid `removeMemberId` → 200, membership SUBMITTED, metadata includes `removeMemberId`.
- Submit at capacity with `addMemberId` only → 422 INELIGIBLE, CAPACITY.

### API — `eligibility` route (if not covered via eligibility unit tests)

- GET with `removeMemberId` at capacity → `eligible: true` (assuming no other hard stops).

### Component — `CommitteeRequestForm`

- Full `committeeList`, `removeMember` prop set, mock preflight pass → candidate button enabled, label **Select Replacement**.
- Full committee, no removal → button disabled, **Committee Full**.

### Regression

- Existing `handleRequest` replacement-at-capacity test (1.R.14) unchanged.
- Existing remove-only and add-only flows unchanged.

## Files to Touch

| File | Change |
|------|--------|
| `apps/frontend/src/app/committees/CommitteeRequestForm.tsx` | Selection gate, copy, preflight query param, optional auto-open add section |
| `apps/frontend/src/lib/eligibility.ts` | Optional `removeMemberId`, effective capacity |
| `apps/frontend/src/app/api/committee/eligibility/route.ts` | Query param passthrough |
| `apps/frontend/src/app/api/committee/requestAdd/route.ts` | Pass `removeMemberId` to eligibility |
| `apps/frontend/src/__tests__/lib/eligibility.test.ts` | Replacement capacity cases |
| `apps/frontend/src/__tests__/api/committee/requestAdd.test.ts` | At-capacity replacement submit |
| `apps/frontend/src/__tests__/components/committees/CommitteeRequestForm*.tsx` | Full committee + removal UI |

**Out of scope:** `AddCommitteeForm.tsx`, `handleRequest/route.ts` (already correct).

## Implementation Order

1. `validateEligibility` + unit tests (authoritative rule).
2. `requestAdd` + API test (submission path).
3. Eligibility GET + form preflight wiring.
4. `CommitteeRequestForm` UI gate and copy + component test.
5. Optional: auto-open add section when `removeMember` prop set.

## Related

- [FRONTEND_UI_REVIEW_FEAT_SRS_IMPLEMENTATION.md](../../FRONTEND_UI_REVIEW_FEAT_SRS_IMPLEMENTATION.md) — original finding
- [1.R.14 handleRequest Capacity for Replacement](1.R.14-handleRequest-capacity-replacement.md) — accept-path pattern to mirror
- [1.R.3 Replacement Flow](1.R.3-replacement-flow-not-implemented.md) — metadata and accept behavior
- [FINDINGS_AND_RESOLUTION_REGISTER.md](../FINDINGS_AND_RESOLUTION_REGISTER.md) — Finding 9 (accept capacity; this ticket closes the submit/UX gap)
