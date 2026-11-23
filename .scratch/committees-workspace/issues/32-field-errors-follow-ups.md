# 32 - Field-error follow-ups from PR #163 review

Type: task
Status: resolved
Parent: ../map.md
Tier: 3 (polish) · Priority: P3
Source: reviews of PR #163 ([24](24-drawer-shows-field-errors.md))

Small leftovers from the shared 422 field-error contract
(`packages/shared-validators/src/schemas/fieldErrors.ts`). None of them is a user-visible bug.

## 1. Governance-config client casts its 422 body

`app/admin/governance-config/GovernanceConfigClient.tsx` reads the PATCH response with
`as GovernanceConfigResponse | ValidationFailureBody` and `body as ValidationFailureBody`. Parse the 422 with the
shared `fieldErrorsSchema` instead, the way `postJson` in `app/committees/workspace/adapters.ts` does. The route
sends `error: "Validation failed"` plus `fieldErrors`. It can also send other keys, so check whether
`validationErrorResponseSchema` (which is `.strict()`) fits before using it, or parse `fieldErrors` alone.

## 2. Test gaps

- **Adapter:** a failed action whose `fieldErrors` is malformed (a string instead of an array, or not an object)
  yields no `fieldErrors` on the outcome. An empty `fieldErrors` also yields none.
- **Drawer:** a whitespace-only email or phone passes step 3, and the request leaves those fields out.

## 3. `useFieldErrors` returns new functions each render

`useFieldErrors` in `app/committees/workspace/drawer/drawerParts.tsx` returns a new object and new functions on
every render. That's harmless today, but an effect or `useCallback` that lists them as dependencies would re-run
on every render. Memoize them (`useCallback`/`useMemo`) if a caller needs stable identities. Otherwise add a
one-line note on the hook and close this item.

## Acceptance criteria

- [x] `GovernanceConfigClient` has no casts on the save response; its existing tests pass.
- [x] The adapter and drawer tests above exist and pass.
- [x] `useFieldErrors` is either memoized or documented as returning new identities each render.

## Resolution

`GovernanceConfigClient` parses the GET and save responses with zod (an unreadable successful save is reported as saved and the settings reload) (`fieldErrorsSchema` for the failure body, not the strict `validationErrorResponseSchema`, so extra keys like a 409's `conflict` are fine); adapter and drawer tests added; `useFieldErrors` is memoized. Branch `fix/workspace-drawer-error-focus`.
