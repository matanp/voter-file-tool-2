# Whole-App Domain Invariants Review Methodology

**Status:** Vector overlay. Shared rules:
[WHOLE_APP_REVIEW_METHODOLOGY.md](./WHOLE_APP_REVIEW_METHODOLOGY.md).  
**Skill:** `skills/whole-app-domain-invariants-review/SKILL.md`

**Purpose:** Findings-only review at branch tip for **persisted state validity** — status machines,
seat occupancy, audit completeness, idempotency, and schema-enforced invariants. Not DRY; not UI.
The question is *can two code paths disagree and leave the DB in an invalid state?* — not "should
this be DRY?" but "can the DB end up wrong?"

---

## Delta from base

| Topic | Domain invariants vector |
| --- | --- |
| **Axis** | Invalid persisted state likelihood × recovery cost |
| **Scan profile** | `domain-invariants` |
| **Deliverable** | `docs/WHOLE_APP_DOMAIN_INVARIANTS_REVIEW_<model-slug>_YYYY-MM-DD.md` |
| **Escalations** | Use Findings; concrete invariant violation = High |

## Run

```bash
MODEL_SLUG=<model-slug> pnpm review:freeze domain-invariants   # prefix, axis, profile from scripts/review/vectors.conf
```

## Severity rubric

| Severity | Meaning |
| --- | --- |
| **High** | Illegal `MembershipStatus`, double seat occupancy, or silent audit skip on privileged mutation. |
| **Medium** | Stuck report job state; non-idempotent webhook; undo leaves orphan rows. |
| **Low** | Edge term boundary; admin-only repair path exists. |

## Lane emphasis

- **B (high):** `membershipConfirmation`, add/requestAdd/handleRequest/remove, petition outcomes, seat utilities.
- **F (high):** `schema.prisma` FK gaps, by-convention seat integers — see [SCHEMA_IMPROVEMENTS.md](../SCHEMA_IMPROVEMENTS.md).
- **A (medium):** `$transaction` wrapping multi-step membership writes.
- **C (medium):** Report job lifecycle terminal states.
- **D (medium):** Discrepancy lock/undo consistency.

Build a **transition matrix** for `MembershipStatus` and seat fields while reading Lane B.

## High-signal questions

- Can two routes set conflicting `status` + `seatNumber` without constraint failure?
- Is eligibility snapshot written on every path that changes active membership?
- Does `reportComplete` handle duplicate delivery safely?
- Does discrepancy undo restore prior membership shape exactly?

## Backlog vs finding

- **Finding:** Code today allows invalid state or misses audit now.
- **Backlog:** Schema shape improvement that code currently papers over (migration deferred).

## Mechanical scans

`scan-domain-enums.txt`, `scan-prisma-writes.txt`, `scan-shared-helpers.txt` + deep read of
`apps/frontend/prisma/schema.prisma` and membership mutation routes.

## Not a finding examples

- Intentional soft-delete vs hard-delete if documented and consistent.
- Deferred Seat FK migration (Backlog; cite SCHEMA_IMPROVEMENTS tier).

## Final checklist

- [ ] At least one Lane B finding references status/seat/audit evidence
- [ ] Lane F triage applied (guard gap vs defer-only modeling)
