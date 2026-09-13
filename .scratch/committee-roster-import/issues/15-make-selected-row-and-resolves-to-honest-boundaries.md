# 15: Make selectedRow and resolvesTo honest typed boundaries

**Status:** ready-for-agent

**Priority:** P3 test-safety follow-up. This is not a roster import merge blocker, but the helper
API currently promises more compile-time protection than it delivers.

**What to fix:** `selectedRow` and `resolvesTo` in
`apps/frontend/src/__tests__/utils/testUtils.ts` are shaped like this:

```ts
export const selectedRow = <Shape>(row: Shape): never => row as never;
export const resolvesTo = <Shape>(row: Shape): never => Promise.resolve(row) as never;
```

Their docstring says callers should name the selected shape so fixtures remain checked, but most
call sites omit the type parameter. When the type parameter is omitted, TypeScript infers `Shape`
from the fixture itself, so the helper becomes an `as never` cast with a nicer name. That still
solves the Prisma mock boundary problem, but it does not check the fixture against the production
selected shape.

## Design options

Pick one and make the helper name match its behavior:

- Require an explicit shape parameter. A default such as `<Shape = never>` can force callers to
  spell the selected row type before the helper accepts a value.
- Replace the generic with a two-step helper that makes the type argument syntactically required,
  for example `selectedRowOf<CommitteeIdRow>()({ id: 101 })`.
- If the team wants the helper to remain a pure boundary cast, rename or document it accordingly
  and remove the claim that omitted generics provide shape checking.

Prefer updating newly touched roster import tests to explicit shapes while doing the migration.

## Acceptance criteria

- [ ] A call like `selectedRow({ id: 101 })` or `resolvesTo({ id: 101 })` no longer silently passes
      without naming the intended selected shape, unless the helper has been deliberately renamed as
      an unchecked boundary cast.
- [ ] Existing intended checked call sites still compile, such as
      `resolvesTo<CommitteeIdRow | null>(...)`.
- [ ] Roster import tests that use these helpers name their selected shapes or use the new explicit
      helper form.
- [ ] The frontend type check passes:
      `pnpm --filter voter-file-tool exec tsc --noEmit --pretty false`.

## Out of scope

- Removing every `firstCallArg<T>` call.
- Retiring the pre-migration Prisma delegate shims; that is issue 14.
