---
name: whole-app-validation-testability-review
description: Run a findings-only whole-app validation consistency and testability review in voter-file-tool (Zod ownership, schema drift, untested high-risk surfaces, test seams). Use for data validation consistency or test coverage gap review, or WHOLE_APP_VALIDATION_TESTABILITY_REVIEW deliverable.
---

# Whole-App Validation & Testability Review (draft)

**Base workflow:** [whole-app-review](../whole-app-review/SKILL.md)  
**Methodology (axis, severity rubric, lane emphasis, coverage-gap format, scan triage, final checklist):** [WHOLE_APP_VALIDATION_TESTABILITY_REVIEW_METHODOLOGY.md](../../docs/review/WHOLE_APP_VALIDATION_TESTABILITY_REVIEW_METHODOLOGY.md)

## Run

```bash
MODEL_SLUG=composer-2.5-fast pnpm review:freeze validation
pnpm review:scans validation
pnpm review:test-map
```

Vector name `validation` → `validation-testability` scan profile; prefix, axis, and methodology doc resolve from `scripts/review/vectors.conf`.

## Sub-skill routing

Findings cite **product paths** only — never test file paths in backticks (tests are out of manifest scope). Test assertions: [test-type-safety](../test-type-safety/SKILL.md). Auth/report routes: [auth-check-patterns](../auth-check-patterns/SKILL.md), [adding-reports](../adding-reports/SKILL.md).
