# 31 - Exit forms drop focus to `<body>` after a failed submit

Type: task
Status: ready-for-agent
Parent: ../map.md
Tier: 2 (accessibility batch) · Priority: P2
Source: follow-up from [24](24-drawer-shows-field-errors.md); same problem as QA sweep 2026-11-18 finding A6

## Problem

The remove, record-resignation and report-exit forms disable their submit button while the request is in flight.
When the request fails, that button had focus, so focus falls to `<body>`, outside the drawer. A screen-reader or
keyboard user hears nothing about the error and has to find their way back into the dialog.

Affected forms all render through `ExitFormLayout` (`app/committees/workspace/drawer/MemberExitForms.tsx`):

- `RemoveMemberForm` ("Could not remove member")
- `RecordResignationForm` ("Could not record resignation")
- `ReportExitForm` in `ExitReportForms.tsx` ("Could not send the report")

`AddMemberFlow` fixed the same problem in 24. `OutcomeAlert` takes an `alertRef` and is focusable
(`tabIndex={-1}`), and `useFieldErrors` in `drawerParts.tsx` moves focus to it once the alert is on screen.

## Fix

After a failed submit in any of these forms, move focus to the `OutcomeAlert`. One way: `ExitFormLayout` passes an
`alertRef` to `OutcomeAlert` and focuses it in an effect whenever a new `failure` appears. That covers all three
forms in one place. Reuse the 24 pieces rather than building a second focus mechanism.

If an exit endpoint returns `fieldErrors` for a field the form shows (e.g. notes), consider showing it beside that
field the way step 3 of the add flow does. This part is optional; the focus fix is the requirement.

## Acceptance criteria

- [ ] After a failed submit in each of the three forms, the error alert has focus and `document.activeElement` is
      inside the drawer.
- [ ] A second failure in a row also moves focus to the alert.
- [ ] Tests in `__tests__/components/committees/CommitteeActionDrawer.test.tsx` (or the exit-form tests) cover a
      500 and a 422 for at least remove and report-exit.
