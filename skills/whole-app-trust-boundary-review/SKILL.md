---
name: whole-app-trust-boundary-review
description: Run a findings-only whole-app trust-boundary review in voter-file-tool (authorization, scope, validation, race safety, audit invariants). Use for security-adjacent whole-app review, illegible-bug checklist audit, or WHOLE_APP_TRUST_BOUNDARY_REVIEW deliverable.
---

# Whole-App Trust Boundary Review (draft)

**Base workflow:** [whole-app-review](../whole-app-review/SKILL.md)  
**Methodology (axis, severity rubric, lane emphasis, scan triage, not-a-finding, final checklist):** [WHOLE_APP_TRUST_BOUNDARY_REVIEW_METHODOLOGY.md](../../docs/review/WHOLE_APP_TRUST_BOUNDARY_REVIEW_METHODOLOGY.md)

## Run

```bash
MODEL_SLUG=composer-2.5-fast pnpm review:freeze trust
pnpm review:scans trust
```

Prefix, axis, scan profile, and methodology doc resolve from `scripts/review/vectors.conf`.

## Sub-skill routing

Mandatory: [auth-check-patterns](../auth-check-patterns/SKILL.md). Cross-check the illegible-bug checklist in [AGENTS.md](../../AGENTS.md). Bare missing guards are primary **Findings** here (no Escalations section). Use `pnpm review:route-inventory` for a method/wrapper/privilege matrix.
