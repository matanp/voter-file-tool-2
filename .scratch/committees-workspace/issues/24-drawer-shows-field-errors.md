# 24 - Add/submit drawer swallows field errors

Type: task
Status: resolved
Parent: ../map.md
Tier: 1 (fix now) · Priority: P1
Source: [QA sweep 2026-11-18](../../qa-sweep-2026-11-18/README.md), findings B2, B3, A6

## Problem

- **B2.** Step 3: enter email `not-an-email`, Continue, Add member. The drawer passes to step 4. On submit,
  `POST /api/committee/add` returns 422 with `Field errors: { email: 'Invalid email format' }`, but the drawer shows
  only "Something went wrong / Invalid request data" (`app/api/lib/validateRequest.ts:34`).
- **A6.** After that error, focus drops to `<body>`, outside the dialog.
- **B3.** A Leader can enter phone `abc`; it is accepted and stored on the pending submission (ROCHESTER LD 17 ED 1).

## Fix

1. Validate email and phone on the client at step 3, with the same rules as the server schema (share the schema if
   practical). Block Continue and show the error beside the field.
2. Add phone validation to the server schema for both `add` and `requestAdd`.
3. If the server still returns field errors, map them onto their fields, send the user back to step 3, and focus the
   first invalid field. For a non-field error, focus the error alert. Focus never leaves the dialog.

## Acceptance criteria

- [x] Invalid email or phone can't pass step 3; the message sits beside the field and is tied to it
      (`aria-describedby` / `aria-invalid`).
- [x] A server 422 with field errors lands the user on step 3 with those errors shown.
- [x] After any submit error, `document.activeElement` is inside the drawer.
- [x] `abc` is rejected as a phone by the API.
- [x] Tests in `__tests__/components/committees/CommitteeActionDrawer.test.tsx` cover the three cases.

## Resolution

Branch `drawer-field-errors`.

- Shared member contact rules in `lib/validations/committee.ts` (`memberContactEmailSchema`,
  `memberContactPhoneSchema`, `memberContactErrors`). The add and requestAdd schemas use them, and so does step 3.
  A phone now needs 7 to 15 digits, using only digits, spaces and `( ) + - .`. Extensions like `x123` are rejected.
- `validateRequest` adds `fieldErrors` to every 422 it returns. The strict `bulkLoadCommitteesErrorSchema` allows
  the key.
- `AddMemberFlow` maps server field errors onto step 3 and focuses the first invalid field. On any other failure it
  focuses the error alert.
- Not done here: `MemberExitForms` and `ExitReportForms` have the same disabled-button focus loss after an error.
  They still need the `alertRef` treatment.
