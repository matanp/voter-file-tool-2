# Whole-App Contracts Review Methodology

**Status:** Vector overlay. Shared rules:
[WHOLE_APP_REVIEW_METHODOLOGY.md](./WHOLE_APP_REVIEW_METHODOLOGY.md).  
**Skill:** `skills/whole-app-contracts-review/SKILL.md`

**Purpose:** Findings-only review at branch tip for **cross-boundary contract stability** — shared
Zod, API JSON envelopes, hook expectations, enum literals, and report-server job payloads. Not
user-facing copy; not trust-boundary scope leaks (trust vector). The question is *will a change in
one package break another **without a type error**?* — focus on published interfaces the compiler
can't cross-check.

---

## Delta from base

| Topic | Contracts vector |
| --- | --- |
| **Axis** | Silent runtime mismatch risk across app / packages / report-server |
| **Scan profile** | `contracts` |
| **Deliverable** | `docs/WHOLE_APP_CONTRACTS_REVIEW_<model-slug>_YYYY-MM-DD.md` |

## Run

```bash
MODEL_SLUG=<model-slug> pnpm review:freeze contracts   # prefix, axis, profile from scripts/review/vectors.conf
```

## Severity rubric

| Severity | Meaning |
| --- | --- |
| **High** | Client or worker branch on field/type that another layer no longer sends. |
| **Medium** | Route family uses local Zod while `shared-validators` schema exists unused. |
| **Low** | Cosmetic key naming; consumers tolerate both shapes today. |

## Lane emphasis

- **A (high):** `validateRequest` vs local `safeParse`/`parse`/casts; error envelope fields.
- **C (high):** Scoped report registry → form → API → `apps/report-server/src/index.ts` dispatch.
- **E (high):** `useApiMutation` error handling assumptions per route.
- **F (high):** `packages/shared-validators/src/index.ts` export surface vs import sites.

Apply `skills/adding-reports/SKILL.md` for report chains.

## Evidence standard

Show **two or more layers** with divergent contract for the same operation (e.g. route returns
`{ message }`, hook reads `error`).

## Mechanical scans

`scan-validation.txt`, `scan-messages-envelopes.txt`, `scan-domain-enums.txt`, `scan-client-api-ui.txt`, `scan-parse-casts-params.txt` (routes that bypass shared schemas). For reports, also run `pnpm review:report-matrix`.

## Not a finding examples

- `{ error }` inconsistency alone when all consumers handle both (architecture vector).
- Intentional worker-only fields not exposed to client.

## Final checklist

- [ ] At least one finding traces UI → API or API → report-server chain
- [ ] Report types checked against `scopeReportRegistry` + worker branch
