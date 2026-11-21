# 01 - Add member wizard lets fast clicks skip the review and details steps

Status: needs-triage

## What happened

On 2026-11-18 the power-user Admin (person `cad86007…`) filled empty Rochester committees seat by seat. PostHog
logged 16 `$rageclick` events on "Add member", all at the same point in the flow. Each member took about 10s:

`Add member` → type name → `Search` → `Select` → `Continue` → `Continue` → **`Add member`**

The last three clicks land within about 1s, at the same screen position. `AddMemberFlow.tsx` puts the step's primary
button in the same footer slot on every step (review "Continue" at L272, details "Continue" at L361, confirm
"Add member" at L423), so clicking repeatedly in one place advances through review → details → confirm and
submits.

A Leader hit the same pattern once with "Submit candidate" (2026-11-19, session `01a1f59d-694c-799b-aaf0-8e52fbbad68c`).

## Why it matters

The review step shows eligibility problems and the details step holds membership type, contact info and override
reason. A user who clicks fast in one spot never reads them. Today `canContinue` only blocks hard failures. Any
warning that is only displayed gets skipped. For testers trying to break things this is the obvious path, and an
accidental add is a committee-membership change that writes to the audit trail.

## Decide

- Is the speed a feature for bulk seat filling (Admins filling 0/4 committees)? If so, consider a real bulk path
  instead of making the wizard slower.
- Otherwise, pick a guard. For example:
  - Ignore primary-button clicks for ~400ms after a step change.
  - Move the confirm button, or change its style, so it isn't under the cursor.
  - Skip the review step when there's nothing to review, and require a deliberate action when there is a warning.

## Evidence

Sessions `01a1ef5f-8ed9-7f4f-9ad9-5c24152cbd58` (2026-11-18 15:56–16:45 UTC) and
`01a1f081-c4e7-78bf-a2d6-05993fd28166` (21:13–21:19 UTC). Replays retained until about 2026-12-18. Once 08 lands, a
`committee_member_added` event would show whether all of these adds succeeded.
