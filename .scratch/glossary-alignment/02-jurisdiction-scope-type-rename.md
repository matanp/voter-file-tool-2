# Rename JurisdictionScope — it is a Jurisdiction

Status: ready-for-agent

## Why

`CONTEXT.md` defines **Jurisdiction** as "a city or town, optionally narrowed to a single
legislative district within it" — which is exactly what `JurisdictionScope` is:

```ts
// apps/frontend/src/app/api/lib/committeeValidation.ts:146
export type JurisdictionScope = Pick<UserJurisdiction, "cityTown" | "legDistrict">;
```

The `Scope` suffix now actively misleads, because the glossary gives **Report Scope** a
different meaning (single jurisdiction vs countywide) and reserves **Assignment** for the grant.
A reader meeting `JurisdictionScope` cannot tell which of the three it is.

## What to rename

All in `apps/frontend/src/app/api/lib/committeeValidation.ts` (3 occurrences, single file):

| From | To |
| --- | --- |
| `JurisdictionScope` | `Jurisdiction` |

Consider alongside it, same file — lower confidence, judge on reading:

- `committeeMatchesJurisdictions` — fine as-is, reads correctly
- `buildJurisdictionWhere` — fine as-is
- `JurisdictionPairInput` — "Pair" predates the glossary; `JurisdictionInput` is closer, but it
  carries extra fields, so check before renaming

## Watch out

`Jurisdiction` is not currently a Prisma model name, so there is no collision today. If
[03-jurisdiction-model-rename](./03-jurisdiction-model-rename.md) is ever done, re-check for a
clash with generated Prisma types.

## Done when

- `JurisdictionScope` is gone; typecheck and tests pass; no behaviour change
