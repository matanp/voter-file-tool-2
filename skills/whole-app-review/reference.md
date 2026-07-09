# Whole-App Review — Shared Reference

Vector-specific rubrics and triage: see each overlay skill and `docs/review/WHOLE_APP_*_REVIEW_METHODOLOGY.md`.

Shared base — Rules, Workflow, Lanes, Mechanical scans, Appendix A (manifest), Appendix B (boundary
files + subsystem buckets): [docs/review/WHOLE_APP_REVIEW_METHODOLOGY.md](../../docs/review/WHOLE_APP_REVIEW_METHODOLOGY.md).

## Finding template

```md
### N. Short, specific finding title
**Severity: High|Medium|Low · Blast radius: large|medium|small**
**What & where.** One repo-relative path per backtick pair.
**Why it hurts.** Risk statement for this vector's axis.
**Opportunity.** One sentence; no implementation design.
**Evidence.** Commands, comparisons, or reading that proved it.
```

## Backlog-only note template

```md
### B1. Short deferred title
**What & where.** Same backtick path rules.
**Why defer.** Migration cost or low leverage.
**Future direction.** One sentence if a later pass should revisit.
```

## At a glance table

```md
| # | Finding | Severity | Blast | Opportunity |
|---|---------|----------|-------|-------------|
| 1 | Short title | High | large | Terse direction (≤8 words) |
**Counts:** N findings · M backlog-only notes · K escalations (omit if vector uses them)
```

## Deliverable sections

Basis · At a glance · Subsystem map · Findings · Already good · Backlog-only notes · Not a finding · (optional) Escalations

## Boundary files (read before lane work)

Single source: base methodology
[Appendix B → Boundary files](../../docs/review/WHOLE_APP_REVIEW_METHODOLOGY.md#appendix-b-boundary-files--subsystem-buckets).

## Vector selection

Prefix, scan profile, axis, and methodology doc all come from the registry
`scripts/review/vectors.conf` — pass the **vector name** to the tooling:

```bash
MODEL_SLUG=composer-2.5-fast pnpm review:freeze <vector>
```

Vector names: `architecture` · `trust` · `domain-invariants` · `contracts` · `validation` ·
`pii` · `async-reliability` · `migration` · `operations` · `data-lifecycle`.
`MODEL_SLUG` is the only env var (reviewer model slug; defaults to a placeholder). Add or edit a
vector by adding one row in `vectors.conf`, one scan profile in `run-scans.sh`, and the matching
methodology + skill overlay.
