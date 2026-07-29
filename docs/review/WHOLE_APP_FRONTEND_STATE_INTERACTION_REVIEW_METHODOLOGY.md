# Whole-App Frontend State & Interaction Correctness Review Methodology

**Status:** Vector overlay. Shared manifest, workflow, citations, and Appendix B:
[WHOLE_APP_REVIEW_METHODOLOGY.md](./WHOLE_APP_REVIEW_METHODOLOGY.md).
**Skill:** `skills/whole-app-frontend-state-review/SKILL.md`

**Purpose:** Findings-only review at branch tip for client-side interaction correctness: does the
UI ever let a user start or complete an action the server will reject, block, or has no path to
finish? Covers server/client permission drift (a control is shown but the page/route denies it),
workflow gating that has no route to the outcome it exists for, destructive actions without
confirmation, and loading/error/optimistic-update state that leaves the user confused about whether
an action succeeded. **Not** a general auth review (see the trust vector for who may invoke a route)
and **not** an accessibility/responsive review (see the accessibility vector) — those are the two
things this vector deliberately does not chase even when found in the same component.

---

## Delta from base

| Topic | Frontend state & interaction vector |
| --- | --- |
| **Axis** | Likelihood a user reaches a dead end, a denied action, or an unclear outcome × how central the workflow is |
| **Prefer** | Concrete UI/server contract drift and blocked workflows over generic client-code cleanup or cosmetic state nits |
| **Scan profile** | `frontend-state-interaction` |
| **Deliverable** | `docs/WHOLE_APP_FRONTEND_STATE_INTERACTION_REVIEW_<model-slug>_YYYY-MM-DD.md` |
| **Escalations** | Fold bare bugs into Findings — this vector's findings usually *are* the bug, not an aside |

## Run

```bash
MODEL_SLUG=<model-slug> pnpm review:freeze frontend-state
pnpm review:scans frontend-state
```

## Severity rubric

Severity = how badly the user is stranded, not how many lines would fix it.

| Severity | Meaning |
| --- | --- |
| **High** | UI offers or highlights an action that the server always denies or rejects for the actual user (permission drift, dead-end card/link); a primary workflow has no path to its ordinary case (e.g. a full-capacity replacement flow that cannot select a replacement); a destructive/irreversible action has no confirmation. |
| **Medium** | Permission-gated UI is reachable but not clearly explained (user must fail once to learn why); inconsistent loading/error/toast handling that leaves an ambiguous success/failure state; missing rollback or stale state after a failed optimistic update; active-nav or in-progress cues drift from the real route/state map. |
| **Low** | Minor redundant refetch, small state-consistency nit, cosmetic loading flicker; narrow blast radius. |

Deferred UX-polish ideas with no correctness impact → Backlog-only (no severity).

## Lane emphasis

Apply `skills/auth-check-patterns/SKILL.md` wherever gating depends on privilege or scope (Lanes A,
B, E). Apply `skills/adding-reports/SKILL.md` on Lane C when the drift is report-card visibility vs.
report-page enforcement.

- **A (medium):** Does client-visible gating (buttons, cards, nav) match what the route actually
  enforces? Look for `withPrivilege` arguments that are stricter or looser than the UI's own check.
- **B (high):** Workflow status/transition gating in forms (membership add/remove/replace, petition
  outcomes, meeting confirmation) — can every real-world case reach a working control, including
  edge states like a full committee or an already-recorded outcome?
- **C (high):** Report dashboard cards vs. report page privilege checks; scoped report registry
  `minPrivilege` vs. actual page guard; job-status polling that can silently stop updating.
- **D (medium):** Upload/import double-submit, stuck progress state, and confirm/cancel during an
  in-flight request.
- **E (high):** Admin CRUD tables/dialogs: destructive-action confirmation, disabled-state reasons,
  toast/error consistency, active-route/nav cues.
- **F (low):** Shared hooks (`useApi*`, `useFileUpload`) — only flag if a shared hook itself causes
  the drift, not each caller individually.

## Mechanical scans

`scan-frontend-state.txt` (first — `isLoading`/`isSubmitting`/`isPending`/`disabled={`/
`minPrivilege`/`hasPermissionFor`/`window.confirm`/`AlertDialog`), then `scan-client-api-ui.txt`,
`scan-messages-envelopes.txt`, `scan-domain-enums.txt`, `scan-api-routes.txt`. Triage by grouping
hits per workflow (e.g. all petition-outcomes gating, all invite-form gating) rather than per file;
a single workflow's drift across 2–3 files is one finding, not several.

## Not a finding examples

- A toggle for a low-cost, instantly reversible preference skips a confirmation dialog — expected.
- A card is hidden for a role with no capability at all (not merely gated); nothing to reach.
- Client-side optimistic update without rollback where the mutation cannot realistically fail
  (pure local UI state, no server round-trip).

## Final checklist

- [ ] Every High/Medium finding names the concrete drift (what the UI implies vs. what the server or
  route actually allows) — not a hypothetical.
- [ ] Findings distinguish workflow-blocking drift (this vector) from missing keyboard/aria/responsive
  support (route those to the accessibility vector instead).
- [ ] Base [Rules](./WHOLE_APP_REVIEW_METHODOLOGY.md#rules) applied: scope, one-path-per-backtick
  citations, skills, 8–20 post-merge count.
- [ ] Findings-only: no remediation; Already good + Not a finding present.
