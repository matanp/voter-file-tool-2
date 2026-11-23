# Rename JurisdictionScope — it is a Jurisdiction

Status: resolved
Resolution: JurisdictionScope → Jurisdiction; JurisdictionPairInput kept (it is a Jurisdiction plus termId); done on refactor/glossary-privilege-jurisdiction.

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

## Comments

- 2026-11-21 — Resolved. `JurisdictionScope` → `Jurisdiction`, with a doc comment quoting the
  CONTEXT.md definition. It had spread to a second file since the ticket was written
  (`lib/loadScopedReportPageData.ts`, where `LeaderAssignment = Jurisdiction`); both updated.
  `formatJurisdictionNotFoundMessage` took `Pick<JurisdictionPairInput, "cityTown" | "legDistrict">`,
  which is exactly a Jurisdiction, so it now takes `Jurisdiction`.
  **`JurisdictionPairInput` not renamed.** It is `{ cityTown, legDistrict, termId }`: a
  Jurisdiction *in a term*, used only by `jurisdictionExistsInCommitteeList`. `JurisdictionInput`
  would read as "a Jurisdiction" and hide the term, so it fits no better than "Pair". If it's
  renamed later, something like `JurisdictionInTerm` (`Jurisdiction & { termId }`) would say what
  it is. `committeeMatchesJurisdictions` and `buildJurisdictionWhere` already read correctly, so
  they're unchanged.
