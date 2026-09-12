---
name: whole-app-design-review
description: Run a findings-only whole-app design and UI review in voter-file-tool (visual consistency, layout rhythm, spacing, typography, card/content treatment, page wrappers, and design pattern standardization). Use when asked for a whole-app design, visual, UI polish, or WHOLE_APP_DESIGN_UI_REVIEW deliverable. Focuses on **non-admin** authenticated pages only.
---

# Whole-App Design & UI Review

**Base workflow:** [whole-app-review](../whole-app-review/SKILL.md)
**Methodology (axis, severity rubric, lane emphasis):** [WHOLE_APP_DESIGN_UI_REVIEW_METHODOLOGY.md](../../docs/review/WHOLE_APP_DESIGN_UI_REVIEW_METHODOLOGY.md)

## Run

```bash
MODEL_SLUG=<model-slug> pnpm review:freeze design-ui
pnpm review:scans design-ui
```

Prefix, axis, scan profile, and methodology doc resolve from `scripts/review/vectors.conf`.

## Notes for this vector

- **Scope is non-admin only.** Any `/admin/**` page findings must be dropped or routed to an admin-specific vector.
- **Visual evidence over code quality.** A line of duplicated JSX that produces a consistent visual is not a finding; a line that produces a different look than its sibling is.
- **Screenshot evidence encouraged.** `playwright` or `puppeteer` screenshots of each non-admin page help identify layout/overflow/spacing issues that code reading cannot catch (e.g. responsive breakpoints, vertical rhythm, content fit).
- **Skip interaction bugs** (dead-end workflows → frontend-state vector; keyboard/aria → accessibility vector).
- **Route cross-cutting concerns** (component library improvements, shared token definitions) to the architecture vector instead.

## Sub-skill routing

- Shared component design issues (`components/ui/*`, `components/reports/*`) → note as a pattern; do not report per-page. File under Architecture lane if it spans many callers.
- Report form visual issues (ScopedReportForm, XLSXConfigForm) → Lane C emphasis.
- Record search page visual issues → Lane A emphasis.
- Committee page visual issues (selector, roster, member cards, forms) → Lane A-B emphasis.
