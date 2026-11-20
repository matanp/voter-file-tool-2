# 01 - App-wide accessibility review

Status: needs-triage

## Why

Accessibility has not been a focus. Issues have turned up only when a review happened to look at a specific
feature (see tickets 02–05). There is likely more of the same across the app, and nothing catches regressions.

## Directive

Look into accessibility support and issues across the whole app, and decide what level of support to commit to
(for example WCAG 2.1 AA). Suggested scope:

1. **Tooling.** Check what exists and what's worth adding:
   - Lint: whether `eslint-plugin-jsx-a11y` is enabled, and at what strictness.
   - Automated checks in component tests, e.g. `jest-axe` on key pages and dialogs.
   - Optionally an axe or Lighthouse pass in e2e or CI.
2. **Manual pass.** Walk the main flows with only a keyboard, then with a screen reader (VoiceOver on macOS,
   ideally NVDA on Windows). Main flows: sign-in, record search, committee workspace (roster, drawer, Pending
   tab), Admin requests page, reports, admin pages. Check:
   - Every control is reachable and usable from the keyboard, in a sensible order.
   - Focus is visible.
   - Focus lands somewhere sensible after dialogs close and after actions that remove the element that had
     focus.
   - Results of actions are announced: toasts, status lines, errors.
   - Headings make a sensible outline (one h1, no skipped levels).
   - Form fields have labels, and errors are tied to their fields.
   - Information isn't carried by color alone, and contrast is sufficient in light and dark themes.
3. **Shared patterns.** Many issues will come from a few shared pieces. Fixing those fixes many pages at once:
   - `components/ui/*` dialogs, toasts, comboboxes.
   - Page layout and headings.
   - How a mutation announces its result.
     Agree on one pattern for each of these, and write it down, e.g. as a short skill under `skills/`.
4. **Output.** File one ticket per concrete issue found in this folder, plus any tooling tickets. Then decide
   which ones to fix now.

## Known starting points

- Tickets 02–05 in this folder.
- `.scratch/ui-page-consistency/issues/01-heading-semantics-and-scale.md`.
- `CommitteeWorkspace.a11y.test.tsx` already covers the workspace's heading outline, a keyboard path, the
  drawer's focus trap, and statuses not shown by color alone. It's a model for other areas.
