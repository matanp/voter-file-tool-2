---
name: whole-app-operations-review
description: Run a findings-only whole-app operations readiness review in voter-file-tool (env validation, observability, deploy assumptions, diagnostics, recovery paths). Use for WHOLE_APP_OPERATIONS_READINESS_REVIEW deliverables.
---

# Whole-App Operations Readiness Review

**Base workflow:** [whole-app-review](../whole-app-review/SKILL.md)  
**Methodology:** [WHOLE_APP_OPERATIONS_READINESS_REVIEW_METHODOLOGY.md](../../docs/review/WHOLE_APP_OPERATIONS_READINESS_REVIEW_METHODOLOGY.md)

## Run

```bash
MODEL_SLUG=composer-2.5-fast pnpm review:freeze operations
pnpm review:scans operations
```

Prefix, axis, scan profile, and methodology doc resolve from `scripts/review/vectors.conf`.

## Sub-skill routing

Use [auth-check-patterns](../auth-check-patterns/SKILL.md) when operational recovery touches privileged routes or audit identity. Use [test-type-safety](../test-type-safety/SKILL.md) if a recommendation includes test seams.
