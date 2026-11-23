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

`GovernanceConfigClient` parses the GET and save responses with zod. A failed save is read with `fieldErrorsSchema`, not the strict `validationErrorResponseSchema`, so extra keys such as a 409's `conflict` are fine. A successful save whose body can't be read is reported as saved, and the settings reload; if the reload can't be read either, the load error shows instead of the form. The adapter and drawer tests are added. `useFieldErrors` is memoized, so effects and callbacks can depend on what it returns. Merged in PR #185.

## Comments

### 2026-11-22 - production check and leftovers from the PR #185 reviews

- **Production, as Admin** (deploy `ccf8e1dd`): `/admin/governance-config` loads with the real config, so the
  strict GET schema accepts production data. Nothing was saved.
- **Ticketed:** a successful save whose reply isn't JSON still shows "Save failed", because `response.json()`
  runs before the status check. This predates PR #185. See [36](36-governance-save-non-json-reply.md).
- **Decided not to ticket:**
  - The strict `z.nativeEnum(IneligibilityReason)` means an enum value the client doesn't know replaces the page
    with the load error. Accepted, because the client and server ship together from one Prisma schema.
  - Memoizing `useFieldErrors` was the heavier of the two options this ticket allowed. No current caller needs
    stable identities.
  - `ExitFormLayout` focuses its alert with its own ref and effect, separate from `useFieldErrors`. See 31's
    Resolution.
  - The governance tests repeat the edit-and-save steps; too small to extract.
