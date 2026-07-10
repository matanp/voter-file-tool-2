---
name: whole-app-accessibility-review
description: Run a findings-only whole-app accessibility and mobile operability review in voter-file-tool (keyboard paths, form labels, dialog description/focus, responsive layout and table overflow, screen-reader clarity). Use when asked for a whole-app accessibility, a11y, or mobile-operability review, or a WHOLE_APP_ACCESSIBILITY_MOBILE_REVIEW deliverable.
---

# Whole-App Accessibility & Mobile Operability Review

**Base workflow:** [whole-app-review](../whole-app-review/SKILL.md)
**Methodology (axis, severity rubric, lane emphasis, scan triage, not-a-finding, final checklist):** [WHOLE_APP_ACCESSIBILITY_MOBILE_REVIEW_METHODOLOGY.md](../../docs/review/WHOLE_APP_ACCESSIBILITY_MOBILE_REVIEW_METHODOLOGY.md)

## Run

```bash
MODEL_SLUG=<model-slug> pnpm review:freeze accessibility
pnpm review:scans accessibility
```

Prefix, axis, scan profile, and methodology doc resolve from `scripts/review/vectors.conf`.

## Sub-skill routing

Lane E is the primary lane (dialogs, tables, control bars, forms). Route workflow-blocking
permission or state drift found along the way to
[whole-app-frontend-state-review](../whole-app-frontend-state-review/SKILL.md) instead of reporting
it here.
