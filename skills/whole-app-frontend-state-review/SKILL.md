---
name: whole-app-frontend-state-review
description: Run a findings-only whole-app frontend state and interaction correctness review in voter-file-tool (server/client permission drift, blocked workflows, destructive-action confirmation, loading/error/optimistic state). Use when asked for a whole-app frontend UI/UX or interaction-correctness review, or a WHOLE_APP_FRONTEND_STATE_INTERACTION_REVIEW deliverable.
---

# Whole-App Frontend State & Interaction Correctness Review

**Base workflow:** [whole-app-review](../whole-app-review/SKILL.md)
**Methodology (axis, severity rubric, lane emphasis, scan triage, not-a-finding, final checklist):** [WHOLE_APP_FRONTEND_STATE_INTERACTION_REVIEW_METHODOLOGY.md](../../docs/review/WHOLE_APP_FRONTEND_STATE_INTERACTION_REVIEW_METHODOLOGY.md)

## Run

```bash
MODEL_SLUG=<model-slug> pnpm review:freeze frontend-state
pnpm review:scans frontend-state
```

Prefix, axis, scan profile, and methodology doc resolve from `scripts/review/vectors.conf`.

## Sub-skill routing

Lanes A, B, E → [auth-check-patterns](../auth-check-patterns/SKILL.md) whenever gating depends on
privilege or scope. Lane C → [adding-reports](../adding-reports/SKILL.md) when the drift is
report-card visibility vs. report-page enforcement. Route perceivability/keyboard/responsive gaps
found along the way to [whole-app-accessibility-review](../whole-app-accessibility-review/SKILL.md)
instead of reporting them here.
