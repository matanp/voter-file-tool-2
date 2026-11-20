# Accessibility

Started 2026-11-02. Accessibility has not been a focus of this app so far. Some work has been done in
places (the committee workspace has an a11y test suite,
`apps/frontend/src/__tests__/components/committees/CommitteeWorkspace.a11y.test.tsx`), but there has been no
app-wide pass, no tooling, and no testing with a real screen reader.

This effort collects known accessibility issues and sets the direction for looking into the rest.

## Where this came from

While the Exit Report confirm/reject modal was being built (branch `leader-exit-report`, commits `db2b5dd`,
`c0e650f`, `6d64703`), blind reviews raised several focus and announcement problems. The blockers were fixed;
the rest are recorded here. Jest and jsdom can check where focus lands and what text is in the DOM. They can't
check what a screen reader actually says or when it says it, and most of the open items need that kind of
check.

## Tickets

| #   | Ticket                                                                                                  | Kind                        |
| --- | ------------------------------------------------------------------------------------------------------- | --------------------------- |
| 01  | [App-wide accessibility review](issues/01-app-wide-accessibility-review.md)                             | General directive           |
| 02  | [Toast may be cut off when focus moves](issues/02-toast-cut-off-by-focus-move.md)                       | Needs screen-reader check   |
| 03  | [Hidden empty status line may not announce](issues/03-hidden-empty-status-line.md)                      | Likely about a one-line fix |
| 04  | [Share the Exit Report decision wording](issues/04-shared-exit-decision-wording.md)                     | Small cleanup               |
| 05  | [Requests page headings and focus indicators](issues/05-requests-page-headings-and-focus-indicators.md) | Known, accepted for now     |
| 06  | [Committee sidebar button names and tab stops](issues/06-committee-list-button-names.md) | QA sweep, Tier 1 |
| 07  | [Per-page titles](issues/07-per-page-titles.md) | QA sweep, Tier 2 |
| 08  | [Unlabeled controls and radio groups](issues/08-unlabeled-controls-and-radio-groups.md) | QA sweep, Tier 2 |
| 09  | [Landmarks, skip link, table captions](issues/09-landmarks-skip-link-table-captions.md) | QA sweep, Tier 3 |

## Related

- `.scratch/ui-page-consistency/issues/01-heading-semantics-and-scale.md`: heading semantics, including a
  `<label>` used as a section heading.
- `.scratch/committees-workspace/issues/22-requests-page-into-workspace.md`: the requests page may be folded
  into the workspace, which affects how much to invest in tickets 02 and 05.
