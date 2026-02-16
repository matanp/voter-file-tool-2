# Admin Override for Hard Stops — Implementation Spec

**February 2026**

This document describes how to implement the admin override for eligibility hard stops (Roadmap 2.1). It supplements [SRS_GAPS_AND_CONSIDERATIONS.md](SRS_GAPS_AND_CONSIDERATIONS.md) §3.1 and [SRS_IMPLEMENTATION_ROADMAP.md](SRS_IMPLEMENTATION_ROADMAP.md) §2.1.

---

## 1. Definition

**Admin override:** A single action by an admin that bypasses all overridable eligibility hard stops when justified. The admin provides a required reason, and the system bypasses every blocking rule in one step (all-or-nothing). The override is logged to the audit trail with the specific reasons that were bypassed.

Override is **absolute by default** — all hard stops are overridable unless explicitly excluded via configuration. Policy can be tightened over time by adding reasons to the non-overridable list.

---

## 2. Ineligibility Reasons (Formal Enum)

The `IneligibilityReason` enum is defined in [SRS_DATA_MODEL_CHANGES.md](SRS_DATA_MODEL_CHANGES.md) §1. It identifies which eligibility check failed and is used in validation responses, configuration, and audit metadata.

| Value | Description |
| ----- | ----------- |
| `NOT_REGISTERED` | Voter not found or not in database |
| `PARTY_MISMATCH` | Party does not match required (e.g., DEM) |
| `ASSEMBLY_DISTRICT_MISMATCH` | Voter's AD does not match committee's AD |
| `CAPACITY` | LTED at max seats |
| `ALREADY_IN_ANOTHER_COMMITTEE` | Voter has active membership elsewhere |

---

## 3. Configurability

`CommitteeGovernanceConfig` includes:

```prisma
nonOverridableIneligibilityReasons IneligibilityReason[] @default([])
```

**Blacklist semantics:** Empty array = all reasons are overridable. Add enum values to disallow override (e.g., `[PARTY_MISMATCH]` to never allow party bypass). This enables policy changes without code changes.

---

## 4. API

**Request parameters (when override is used):**

- `forceAdd?: true` — signals admin intends to override
- `overrideReason: string` — **required** when `forceAdd` is true; explain justification (e.g., max 500 chars)

**Applies to:**

- `POST /api/committee/add`
- `POST /api/committee/requestAdd`
- `POST /api/committee/handleRequest` (admin accept path only)

**Validation flow:**

1. Run `validateEligibility()` as usual; obtain `hardStops: { reason: IneligibilityReason, message: string }[]`
2. If `forceAdd` is true:
   - For each failed rule, check if `reason` is in `governanceConfig.nonOverridableIneligibilityReasons`
   - If any failed reason is non-overridable → return 400 with `"Cannot override: {reason}"`
   - If all failed reasons are overridable → proceed with add; pass `bypassedReasons` to audit
3. If `forceAdd` is false and there are hard stops → return 400 with `hardStops` in response (normal rejection)

---

## 5. UX

**Flow:**

1. Admin attempts add; server returns 400 with `hardStops: [{ reason, message }]`
2. UI shows error messages and an **"Add with override"** button
3. Admin clicks → modal opens with:
   - **Display-only checkboxes** — list of all blocking reasons, each rendered as a checked (non-interactive) checkbox. Example: "Committee full (4/4 seats)", "Already in another committee"
   - **Override reason** — required text field
   - Cancel / Submit buttons
4. On submit: resend request with `forceAdd: true` and `overrideReason`

**Important:** The checkboxes are informational only. Override is all-or-nothing — the admin cannot selectively bypass individual rules. The listing makes explicit what they are circumventing.

---

## 6. Audit

When an add succeeds with override, log to `AuditLog`:

- `metadata`: `{ overridden: true, bypassedReasons: IneligibilityReason[], overrideReason: string }`

**Optional:** Add `MEMBER_ADDED_OVERRIDE` to the `AuditAction` enum for easier filtering of override events in the audit UI.

---

## 7. Summary Checklist

| Step | Description |
| ---- | ----------- |
| 1 | Add `IneligibilityReason` enum and `nonOverridableIneligibilityReasons` to `CommitteeGovernanceConfig` (Data Model) |
| 2 | Extend eligibility validation to return `hardStops` with `IneligibilityReason` codes |
| 3 | Add `forceAdd` and `overrideReason` to API request schemas; validate `overrideReason` required when `forceAdd` |
| 4 | In add/requestAdd/handleRequest: when `forceAdd`, check non-overridable list; proceed and log if all overridable |
| 5 | Update `AddCommitteeForm` (and related UI): on hard-stop error, show "Add with override" → modal with display-only checklist + reason field |
| 6 | Call `logAuditEvent` with `bypassedReasons` and `overrideReason` when override is used |
