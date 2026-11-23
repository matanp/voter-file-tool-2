# 31 - Exit forms drop focus to `<body>` after a failed submit

Type: task
Status: resolved
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

- [x] After a failed submit in each of the three forms, the error alert has focus and `document.activeElement` is
      inside the drawer.
- [x] A second failure in a row also moves focus to the alert.
- [x] Tests in `__tests__/components/committees/CommitteeActionDrawer.test.tsx` (or the exit-form tests) cover a
      500 and a 422 for at least remove and report-exit.

## Resolution

`ExitFormLayout` focuses the `OutcomeAlert` (its own ref and effect) on every new failure, which covers remove, record-resignation and report-exit. It doesn't borrow `useFieldErrors`, unlike the Fix's "reuse the 24 pieces": the exit forms have no fields, and the alert is mounted by the time the effect runs. The optional per-field errors beside notes were not done. Merged in PR #185.

## Comments

### 2026-11-22 - browser and production checks after PR #185

- **Report-exit focus race, local browser.** The concern was that when the instructions dialog closes it hands
  focus back to the Report button after the error alert has taken it. Playwright Chromium against the local app
  (Leader, ROCHESTER LD 17), with `exitReport` stubbed to a 500 after 0, 50, 100, 200, 400 and 1000 ms, sent by
  Enter and by click. Focus was on the alert, inside the drawer, at every check over the next 1.5 s, on both
  `8c9f645c` and the final `bf0b6dc9`. So no `onCloseAutoFocus` workaround was added.
- **Production, as Admin** (deploy `ccf8e1dd`, which includes PR #185). Remove member on a Brighton committee,
  sent by keyboard with the page's `fetch` patched so that `POST /api/committee/remove` failed in the browser and
  never reached the server. Focus went to the alert inside the drawer, and again on a second failure in a row. The
  roster was unchanged after a reload. Sentry showed no production errors in the following hour.
- Not checked in production: record resignation (same `ExitFormLayout`, covered by a test) and report exit
  (Leader-only; checked locally as above).
