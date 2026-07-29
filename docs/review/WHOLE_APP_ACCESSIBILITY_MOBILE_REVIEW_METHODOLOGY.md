# Whole-App Accessibility & Mobile Operability Review Methodology

**Status:** Vector overlay. Shared manifest, workflow, citations, and Appendix B:
[WHOLE_APP_REVIEW_METHODOLOGY.md](./WHOLE_APP_REVIEW_METHODOLOGY.md).
**Skill:** `skills/whole-app-accessibility-review/SKILL.md`

**Purpose:** Findings-only review at branch tip for whether keyboard-only and screen-reader users
can complete admin/committee/report workflows, and whether dense operational UI (control bars,
tables, dialogs, multi-field forms) stays usable on narrow/mobile viewports. **Not** a general UI
polish review, **not** a correctness/permission-drift review (see the frontend-state vector for
whether an action itself is reachable or safe — this vector asks whether it is *perceivable and
operable* for keyboard, screen-reader, and small-viewport users specifically).

---

## Delta from base

| Topic | Accessibility & mobile vector |
| --- | --- |
| **Axis** | How central the workflow is × how completely it is blocked or degraded for keyboard/SR/mobile users |
| **Prefer** | A primary workflow's control bar, dialog, or form over incidental decorative elements |
| **Scan profile** | `accessibility-mobile` |
| **Deliverable** | `docs/WHOLE_APP_ACCESSIBILITY_MOBILE_REVIEW_<model-slug>_YYYY-MM-DD.md` |
| **Escalations** | Fold into Findings — no Escalations section |

## Run

```bash
MODEL_SLUG=<model-slug> pnpm review:freeze accessibility
pnpm review:scans accessibility
```

## Severity rubric

| Severity | Meaning |
| --- | --- |
| **High** | A primary workflow's control is unreachable by keyboard or has no accessible name/role at all; a primary navigation or control bar overflows unusably (not just untidily) on a supported mobile viewport, blocking the workflow it exists for. |
| **Medium** | `DialogContent` without `DialogDescription`/`aria-describedby`; unlabeled form control relying on placeholder text only; table/control bar that degrades to horizontal scroll or truncation on mobile but remains operable; inconsistent focus return after a dialog closes. |
| **Low** | Cosmetic wrap/spacing nit on narrow screens with no loss of function; missing but non-essential `alt` text on decorative imagery. |

Deferred cross-cutting a11y infrastructure ideas (e.g. a shared `useDialogA11y` helper) → Backlog-only.

## Lane emphasis

- **E (high):** Admin CRUD dialogs, tables, search controls, committee/report control bars — dialog
  description/aria, label association, keyboard operability, responsive `flex-wrap` vs `w-max`/fixed-width
  layouts, table overflow on narrow viewports.
- **C (medium):** Report forms/grids — form labels, status/loading regions that should be
  `aria-live` for screen readers, mobile layout of report cards and generation forms.
- **A/B/D/F (low):** Only flag if a route, workflow, or shared package directly causes a UI
  accessibility or responsive regression (e.g. a shared component exported from a package lacks a
  required a11y prop); otherwise out of lane.

## Mechanical scans

`scan-accessibility.txt` first (`aria-*`, `role=`, `DialogDescription`, `DialogTitle`,
`VisuallyHidden`, `htmlFor=`, `alt=`, `flex-wrap`, `w-max`, `overflow-x-auto`), then
`scan-client-api-ui.txt` (loading/error regions), `scan-labels.txt`, `scan-upload.txt` (file-input
labeling). Group hits by dialog/form/control-bar component, not by individual attribute.

## Not a finding examples

- A decorative icon-only button that already carries an accessible `aria-label` or visible adjacent
  text — expected, not a gap.
- A dialog whose only content is a single confirmation sentence already present as the dialog title;
  a separate `DialogDescription` would be redundant, not required.
- Non-primary internal/debug tooling with no expected mobile or screen-reader audience.

## Final checklist

- [ ] Every finding names the concrete barrier (keyboard trap, missing name/role/description,
  overflow that blocks rather than just reflows) — not a generic "could improve accessibility."
- [ ] Findings distinguish perceivability/operability gaps (this vector) from workflow-blocking
  permission or state drift (route those to the frontend-state vector instead).
- [ ] Base [Rules](./WHOLE_APP_REVIEW_METHODOLOGY.md#rules) applied: scope, one-path-per-backtick
  citations, skills, 8–20 post-merge count.
- [ ] Findings-only: no remediation; Already good + Not a finding present.
