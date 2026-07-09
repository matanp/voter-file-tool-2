# Whole-App Validation & Testability Review Methodology

**Status:** Vector overlay. Shared rules:
[WHOLE_APP_REVIEW_METHODOLOGY.md](./WHOLE_APP_REVIEW_METHODOLOGY.md).  
**Skill:** `skills/whole-app-validation-testability-review/SKILL.md`

**Purpose:** Findings-only review at branch tip for **validation consistency**, **data-shape
single source of truth**, and **testability / coverage gaps** on high-risk product surfaces.
Product-code citations only in deliverable; tests are read for gap analysis but not cited in
backticks (out of manifest scope).

---

## Delta from base

| Topic | Validation & testability vector |
| --- | --- |
| **Axis** | Schema ownership, boundary enforcement, proof gaps on illegible-bug surfaces |
| **Scan profile** | `validation-testability` |
| **Extra tooling** | `pnpm review:test-map` |
| **Deliverable** | `docs/WHOLE_APP_VALIDATION_TESTABILITY_REVIEW_<model-slug>_YYYY-MM-DD.md` |

## Run

```bash
MODEL_SLUG=<model-slug> pnpm review:freeze validation   # prefix, axis, profile from scripts/review/vectors.conf
```

## Severity rubric

| Severity | Meaning |
| --- | --- |
| **High** | Auth/membership/report mutation route with no negative test and local validation bypass. |
| **Medium** | Shared Zod exists; ≥2 boundaries reimplement or cast; test mirror missing for route family. |
| **Low** | Awkward test seam but indirect coverage; optional field mismatch only. |

## Lane emphasis

- **A (high):** `validateRequest` adoption rate; cast `request.json()` bodies.
- **F (high):** `shared-validators` schemas vs route imports; package-level `__tests__/`.
- **B (high):** Rules embedded only in `route.ts` (no shared helper → hard to test).
- **C (high):** Report payload unions — tests in `packages/shared-validators/src/__tests__/`.
- **E (medium):** Form Zod vs API schema drift.

Apply `skills/test-type-safety/SKILL.md` when recommending test shape. Auth/report routes:
`auth-check-patterns`, `adding-reports`.

## Coverage gap findings

Allowed format:

```md
### N. No negative auth tests for committee mutations
**Severity: High · Blast radius: medium**
**What & where.** `apps/frontend/src/app/api/committee/handleRequest/route.ts`
**Why it hurts.** Illegible-bug checklist expects unauthenticated, insufficient privilege, and cross-scope cases; `pnpm review:test-map` shows no mirrored test file.
**Opportunity.** Add route tests using shared testUtils matchers.
**Evidence.** `.review/test-coverage-map.txt`; AGENTS.md negative auth item.
```

Cite **product path** only in backticks. Mention test file in prose without backticks, or name it in Evidence uncited.

## Mechanical tooling

```bash
pnpm review:scans validation
pnpm review:test-map   # route/schema ↔ __tests__ mirror
```

`test-map` outputs:
- API `route.ts` without `__tests__/api/...` mirror
- `packages/shared-validators/src/schemas/*.ts` without sibling `__tests__` exercise (heuristic)

**`test-map` is a path-name heuristic, not proof of absence.** It matches three test naming
conventions — `api/<route>/*.test.ts`, flat `api/<route>.test.ts`, and `api/<route>/route.test.ts`
— but a route tested under a different filename or folded into a broader suite still reads as
`MISSING_TEST`/`HIGH_RISK_MISSING`. **Never file a coverage-gap finding on a `test-map` verdict
alone: confirm real absence by grepping `__tests__` contents for the route handler / imported symbol
first.** (Regression guarded: the high-risk loop previously used a directory-only match and produced
false positives on this repo's flat-named committee/report tests.)

**Triage order:**
1. `pnpm review:test-map` → `.review/test-coverage-map.txt`
2. `scan-validation.txt`, `scan-parse-casts-params.txt`, `scan-messages-envelopes.txt`, `scan-domain-enums.txt`
3. Grep `__tests__` **contents** for every route family flagged `MISSING_TEST`/`HIGH_RISK_MISSING`
   (read only; do not cite test paths in the scope gate). Only surfaces with no content match survive
   as findings.

## Data consistency checks

- Same enum in Prisma, Zod, and UI select options
- Email/auth fields use `canonicalEmailSchema` per auth skill
- Report `type` literals match `ReportType` and worker `jobData.type`

## Not a finding examples

- Test uses intentional cast at `NextRequest` boundary per test-type-safety skill.
- UI-only label string not in Zod (display concern).

## Final checklist

- [ ] `pnpm review:test-map` run and triaged
- [ ] Every `MISSING_TEST`/`HIGH_RISK_MISSING` verdict confirmed by a `__tests__` **content** grep
      before it becomes a finding (path-name heuristic is not proof of absence)
- [ ] High-risk surfaces from AGENTS.md checklist explicitly checked
- [ ] No test file paths inside backtick pairs in deliverable (now enforced by `pnpm review:gate` —
      it rejects backticked `__tests__`/`__mocks__`/`.test.*`/`.spec.*` path tokens; name tests in prose)
