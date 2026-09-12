# Decide: rename UserJurisdiction / InviteJurisdiction to assignment language

Status: needs-triage

## Why

`CONTEXT.md` separates two things the code currently spells the same way:

- **Jurisdiction** — the place: a city or town, optionally narrowed to one legislative district
- **Assignment** — authority given to a Leader over one jurisdiction for one committee term

By that vocabulary, `UserJurisdiction` and `InviteJurisdiction` are Assignments, not
Jurisdictions. The proposed names are `JurisdictionAssignment` and `PendingJurisdictionAssignment`
(the latter matching the glossary's **Pending Assignment**).

Note that the surrounding API surface is *already* correct and should not change:
`assignJurisdictionSchema`, `AssignJurisdictionData`, `/api/admin/jurisdictions` — those assign a
jurisdiction, which is exactly what the glossary says.

## Why this is not ready-for-agent

These are Prisma model names, so this is a **schema migration**, not an identifier sweep:

- ~75 references to `UserJurisdiction` / `InviteJurisdiction` across `apps/frontend/src`
- Generated Prisma client types change, so every import site moves
- Both models carry partial unique indexes that live only in hand-written migration SQL
  (`20260221120000_user_jurisdiction_partial_unique_legdistrict_null`,
  `20260621120000_add_invite_jurisdiction`) — a table rename must carry those indexes with it
- `InviteJurisdiction` is written during invite acceptance (`src/lib/applyPendingInvite.ts:288`),
  a flow with its own audit-coverage work in flight

## The decision to make

1. **Rename models and tables** — glossary and schema agree; costs a migration and a large diff
2. **Rename in Prisma with `@@map`, keep the table names** — smaller migration risk, but schema
   and database then disagree, which is its own trap
3. **Leave the models alone** — treat the model names as historical and rely on `CONTEXT.md` plus
   correct naming in new code

Option 3 is defensible: the cost is real and the confusion is bounded, since the glossary now
exists to resolve it. Recorded here so the choice is deliberate rather than forgotten.
