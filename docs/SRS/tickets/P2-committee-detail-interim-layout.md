# P2: Committee Detail Interim Layout

**Status:** Proposed  
**Scope:** UI-only interim improvement  
**Related plan:** [Committee Operations Workspace UI Implementation Plan](../COMMITTEES_WORKSPACE_UI_IMPLEMENTATION_PLAN.md)

## Summary

Improve the current committee-detail page while the larger Committee Operations
Workspace is pending. Preserve all existing committee behavior, endpoints, and
authorization rules.

The page should emphasize committee status and members. The add-member workflow
should remain available without occupying the page by default, and the LTED
weight control should read as a separate committee setting.

## Target Layout

```text
← Back to full roster

Wheatland · ED 3

[ 2 of 4 seats filled | 2 open | Designation weight — ]

[ + Add committee member ]

Members
[Current roster and member content]

Committee settings
┌────────────────────────────────────────────┐
│ LTED total weight  [________]  [Save]      │
└────────────────────────────────────────────┘

Petition outcomes
[Existing petition content]
```

## Requirements

1. Change the detail title from `Committee detail — {committee}` to the
   committee identity alone, for example `Wheatland · ED 3`.
2. Render `CommitteeSummaryBlock` immediately below the detail title.
3. Replace the always-visible `AddCommitteeForm` with an **Add committee
   member** disclosure control.
4. Keep the disclosure closed by default. Opening it renders the existing
   search, eligibility, membership-type, and contact workflow without changing
   its behavior.
5. Remove the internal `Add Committee Member` page-level heading from the
   disclosed form. The disclosure label provides the section identity.
6. Close the disclosure after a successful addition and retain the existing
   success toast and committee refresh.
7. Wrap the LTED total-weight input and save button in a bordered card titled
   **Committee settings**.
8. Use neutral section-heading styles for content below the page title. Green
   remains reserved for the primary page title.
9. Add consistent vertical spacing between summary, add-member disclosure,
   roster, settings, and petition sections.

## Authorization

- Preserve the existing `actingPermissions` visibility rules for client-only
  controls.
- Preserve actual server-side privilege checks for every mutation and PII
  response.
- ReadAccess users must not gain an add-member or weight-editing control.
- This ticket does not alter roles, permissions, API routes, or data scope.

## Acceptance Criteria

- [ ] The detail page has one visually primary heading containing only the
      selected committee identity.
- [ ] The vacancy, designation-weight, and filled-seat summary appears before
      any mutation controls.
- [ ] The add-member form is hidden on initial load and is revealed by an
      accessible button or disclosure control.
- [ ] Opening the disclosure preserves all existing candidate-search and
      eligibility states.
- [ ] A successful addition closes the disclosure and refreshes the committee.
- [ ] LTED total weight appears inside a clearly labeled **Committee settings**
      card and retains its existing save behavior.
- [ ] Major sections remain visually distinct when the add-member disclosure is
      open.
- [ ] Keyboard users can open and close the disclosure, and its expanded state
      is exposed through `aria-expanded` or native disclosure semantics.
- [ ] Existing admin, RequestAccess, and ReadAccess visibility behavior is
      unchanged.
- [ ] The page has no horizontal overflow at 375px.

## Likely Implementation Sites

- `apps/frontend/src/app/committees/CommitteeSelector.tsx`
- `apps/frontend/src/app/committees/AddCommitteeForm.tsx`
- Existing committee-selector and add-form component tests

## Non-Goals

- Split-pane workspace navigation.
- New committee read models or API routes.
- A modal or action drawer.
- Redesigning candidate search or eligibility logic.
- Changing roster data, seat assignment, weight calculation, or mutations.
- Removing the existing committee selector.
