# Whole-App Trust Boundary Review Methodology

**Status:** Vector overlay. Shared manifest, workflow, citations, and Appendix B:
[WHOLE_APP_REVIEW_METHODOLOGY.md](./WHOLE_APP_REVIEW_METHODOLOGY.md).  
**Skill:** `skills/whole-app-trust-boundary-review/SKILL.md`

**Purpose:** Findings-only review at branch tip for authorization, data scope, input validation,
race safety, and audit invariants — the illegible-bug checklist applied systematically across product
code. Not a penetration test; not maintainability/DRY (that is the architecture vector).

---

## Delta from base

| Topic | Trust boundary vector |
| --- | --- |
| **Axis** | Exploitability × blast radius |
| **Bare missing guard** | Primary **Finding** (High), not Escalation |
| **Inconsistent guards** | Finding (drift still matters if it weakens enforcement) |
| **Scan profile** | `trust` |
| **Deliverable** | `docs/WHOLE_APP_TRUST_BOUNDARY_REVIEW_<model-slug>_YYYY-MM-DD.md` |
| **Escalations section** | Omit — all items are Findings or Backlog |

## Run

```bash
MODEL_SLUG=<model-slug> pnpm review:freeze trust   # prefix, axis, profile from scripts/review/vectors.conf
pnpm review:scans trust                            # writes trust scans into the frozen run dir
```

## Severity rubric

| Severity | Meaning |
| --- | --- |
| **High** | Cross-user/scope access, unwrapped mutation route, or PII/list leak on a reachable path. |
| **Medium** | TOCTOU race, validation bypass to wrong state, missing audit on privileged write. |
| **Low** | Narrow scope gap, or defense-in-depth gap where primary guard exists. |

## Lane emphasis

- **A (high):** `withPrivilege`/`withBackendCheck`/`withPublic`; `validateRequest` vs cast; query scope; response scope / PII in lists; `pnpm check:api-routes`.
- **B (high):** Transactions on find-then-write; membership mutations; petition outcomes; P2002; audit on mutations.
- **C (medium):** Report list scope; `reportComplete` idempotency; job ownership.
- **D (medium):** Presigned URL privilege / exposure; import authorization.
- **E (medium):** Client gates vs server (`actingPermissions` never on API); permission UX leaks.
- **F (high):** Unique constraints vs application-only checks; schema vs code guards.

Apply `skills/auth-check-patterns/SKILL.md`. Checklist: `AGENTS.md` illegible-bug items.

## Expected exceptions (not findings)

- `apps/frontend/src/app/api/auth/[...nextauth]/route.ts` — NextAuth `handlers` re-export.

## Mechanical scans

`pnpm review:scans trust` → run-local api routes, validation, parse/casts, prisma writes,
api-route-wrappers. Triage order: `scan-api-route-wrappers.txt` (from `pnpm check:api-routes`)
first, then `scan-api-routes.txt`, `scan-validation.txt`, `scan-parse-casts-params.txt`,
`scan-prisma-writes.txt`. Ignore loose `.review/scan-*.txt` and lane files outside the frozen run
directory.

## Finding template addition

**Why it hurts.** Who can trigger it and what data/state is exposed or corrupted.

## Not a finding examples

- Developer `actingPermissions` simulation in client UI when server still enforces actual privilege.
- Consistent `{ error }` envelope without scope leak (contracts vector, not trust).

## Final checklist

- [ ] `pnpm review:gate` clean on trust deliverable
- [ ] Basis cites the run directory; run-local `scan-profile.txt` is `trust`
- [ ] Every High finding names a reachable trust failure, not hypothetical refactor
- [ ] Negative auth gaps noted where routes lack test proof (pointer to validation vector optional)
