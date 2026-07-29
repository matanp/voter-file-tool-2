---
name: whole-app-architecture-review
description: Run a findings-only whole-app architecture and maintainability review in voter-file-tool (DRY, consistency, extensibility). Use when asked for a whole-app architecture review, lane-based maintainability audit, or WHOLE_APP_ARCHITECTURE_REVIEW deliverable.
---

# Whole-App Architecture Review

**Base workflow:** [whole-app-review](../whole-app-review/SKILL.md)  
**Methodology (axis, severity rubric, lane emphasis, escalations, scan triage, not-a-finding, final checklist):** [WHOLE_APP_ARCHITECTURE_REVIEW_METHODOLOGY.md](../../docs/review/WHOLE_APP_ARCHITECTURE_REVIEW_METHODOLOGY.md)

## Run

```bash
MODEL_SLUG=composer-2.5-fast pnpm review:freeze architecture
pnpm review:scans architecture
```

Prefix, axis, scan profile, and methodology doc resolve from `scripts/review/vectors.conf`.

## Sub-skill routing

Balanced A–F. Lane A (and any auth/privilege/scope work) → [auth-check-patterns](../auth-check-patterns/SKILL.md). Lane C → [adding-reports](../adding-reports/SKILL.md).
