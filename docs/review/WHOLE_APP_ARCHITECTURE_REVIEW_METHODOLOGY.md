# Whole-App Architecture & Maintainability Review Methodology

**Vector overlay.** Shared rules, workflow, lanes, scans, manifest, and Appendix B:
[WHOLE_APP_REVIEW_METHODOLOGY.md](./WHOLE_APP_REVIEW_METHODOLOGY.md).  
**Skill:** `skills/whole-app-architecture-review/SKILL.md`

**Purpose:** Findings-only review at branch tip for DRY opportunities, simplification, consistency,
maintainability, and extensibility — **not** correctness, security, UI polish, remediation plans, or
test coverage unless they reveal architecture-level duplication or drift.

---

## Delta from base

| Topic | Architecture vector |
| --- | --- |
| **Axis** | DRY / consistency / maintainability / extensibility |
| **Prefer** | Duplicated business rules, route contracts, schemas, and product flows over harmless JSX repetition or line-count similarity |
| **Scan profile** | `architecture` (full catalog) |
| **Deliverable** | `docs/WHOLE_APP_ARCHITECTURE_REVIEW_<model-slug>_YYYY-MM-DD.md` |
| **Bare security bug** | **Escalation**, not a Finding (see below) — unlike trust/domain vectors which fold it into Findings |
| **Escalations section** | Used here (omit if none) |

## Run

```bash
MODEL_SLUG=<model-slug> pnpm review:freeze architecture   # prefix, axis, profile from scripts/review/vectors.conf
pnpm review:scans
```

## Severity rubric

Severity = maintenance/extensibility risk, not user-facing bug severity.

| Severity | Meaning |
| --- | --- |
| **High** | Duplicated business rule, status transition, route contract, or registry where drift changes behavior or forces shotgun surgery. |
| **Medium** | Repeated workflow scaffolding, validation shape, API envelope, or UI pattern slowing development. |
| **Low** | Local cleanup, naming/placement, dead helper, small abstraction; limited blast radius. |

Deferred schema-shape ideas → Backlog-only (no severity).

## Lane emphasis

Balanced A–F. Apply `skills/auth-check-patterns/SKILL.md` on Lane A (and any lane touching
auth/privileges/scope); `skills/adding-reports/SKILL.md` on Lane C. Per lane, look for duplicated
responsibility with no single owner:

- **A:** Inconsistent `withPrivilege`/`withBackendCheck`/`withPublic` usage; ad-hoc validation vs
  shared Zod; divergent response envelopes; rebuilt data-scope filters.
- **B:** Membership/eligibility/seat/petition/report-job rules that need one owner.
- **C:** Parallel report registries/unions/route maps; can a new report register a descriptor or
  must it edit parallel lists?
- **D:** Repeated upload state, validation, submit, and toast scaffolding.
- **E:** Repeated CRUD table/dialog/search/status/confirm patterns — flag only stable,
  product-facing ones.
- **F:** Package ownership and boundary inversions; `schema.prisma` invariants.

**Lane F triage:** Guard/race issues from schema gaps → Findings (High/Medium/Low). Defer-only
modeling ideas → Backlog-only notes (no severity).

## Escalations (canonical)

A trust-boundary observation is either an architecture finding or an escalation — never both.

- **Finding:** Duplicated/inconsistent guards, wrappers, or drift-prone scope checks with no single
  owner. Score on the maintainability rubric; risk is invited future drift.
  - *Example:* `{ error }` vs `{ message }` across `withPrivilege` wrappers in
    `apps/frontend/src/app/api/lib/withPrivilege.ts` — inconsistent envelope, not a missing guard.
- **Escalation:** Bare missing `withPrivilege`/`withBackendCheck`, unscoped query, or data/PII leak
  on a specific route. One line + backticked path in **Escalations**; no severity, no remediation.
  Target: illegible-bug checklist in [`AGENTS.md`](../../AGENTS.md). Omit the section if none. Same
  triage for concrete bugs from any lane (often B or F).
  - *Example:* a product `route.ts` exports `POST` with no wrapper and no documented public
    exception — one line in **Escalations**.

Escalation template:

```md
- `path/to/route.ts` — what is missing or leaking. → illegible-bug checklist (AGENTS.md)
```

## Scan triage

Full profile, in order:

1. `scan-validation.txt` — high signal; triage `validateRequest` / shared Zod hits first.
2. `scan-api-routes.txt` + `scan-api-route-wrappers.txt`.
3. `scan-messages-envelopes.txt`.
4. `scan-domain-enums.txt`, `scan-prisma-writes.txt`.
5. `scan-parse-casts-params.txt` — noisy; treat bare `parse(`, `as Type`, and `searchParams` as
   low-signal unless they duplicate a rule already centralized elsewhere.

## Not a finding examples

- **Tempting abstraction** rejected — one sentence why.
- **Invite validity vs display split** — `apps/frontend/src/lib/invites/validity.ts` and
  `apps/frontend/src/lib/invites/display.ts` are intentionally separate concerns; not enough drift
  to merge.
- **NextAuth handler re-export** — `apps/frontend/src/app/api/auth/[...nextauth]/route.ts`
  re-exports NextAuth `handlers` without `withPrivilege`; expected exception, not an escalation.

## Final checklist

- [ ] Deliverable at `docs/WHOLE_APP_ARCHITECTURE_REVIEW_<model-slug>_YYYY-MM-DD.md`; Basis complete; scope gate clean.
- [ ] Review derived from current product code (not `git diff main` alone); Appendix B boundary files read.
- [ ] Base [Rules](./WHOLE_APP_REVIEW_METHODOLOGY.md#rules) applied: scope, one-path-per-backtick citations, skills, 8–20 post-merge count.
- [ ] Escalations vs Findings split honored; Lane F triage applied.
- [ ] Findings-only: no remediation; Already good + Not a finding present; `xlsx-tester` excluded.
