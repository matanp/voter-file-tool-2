# Developer acting-as: server-readable acting privilege with jurisdictions

Status: ready-for-agent

Related: [.scratch/glossary-alignment/01-acting-privilege-rename.md](../glossary-alignment/01-acting-privilege-rename.md)
— do that rename **first or concurrently**; this spec assumes the post-rename identifiers
(`actingPrivilege`, `setActingPrivilege`, `hasPrivilegeFor`). If it lands after this work, the
storage-key decision in that ticket must account for the new payload shape described in 03.

## Problem (as of 2026-09-19)

The Developer "acting privilege" is a single `PrivilegeLevel` enum value held only in React state
and `localStorage` (`GlobalContext.tsx:9-11`, `manageProfile.tsx:117-125`). It cannot carry a
jurisdiction, and the server never sees it.

Leader is the only role whose behaviour depends on data beyond the enum — `UserJurisdiction` rows
(`schema.prisma:352`). Because:

1. Every jurisdiction lookup keys on the **real** user id and **real** privilege
   (`getUserJurisdictions()` returns `null`/unrestricted for Developer —
   `committeeValidation.ts:150`; `/api/user/jurisdictions` returns rows for `session.user.id`), and
2. A Developer cannot be assigned jurisdictions (`api/admin/jurisdictions/route.ts:51` requires the
   target to be exactly `Leader`),

a Developer acting as Leader always has zero jurisdictions. Observed behaviour:

| Screen | Developer acting as Leader sees |
| --- | --- |
| `/committees` | Server (`page.tsx:36`) skips the Leader filter (real privilege is Developer) and passes all committees down; then `CommitteeSelector.tsx:766` renders the **"No Committee Access"** empty state. Page unusable. |
| `initialScope` single-scope landing | Computed from real privilege (`page.tsx:54`) → always `null`. Never exercised. |
| Scoped reports (`ScopedReportForm.tsx:57-73`) | Form forces `jurisdiction` scope like a Leader, but the city/LD choice is unconstrained and `validateReportJurisdictionAccess` (`committeeValidation.ts:271`) treats the caller as Admin. Looks like Leader, behaves like Admin. |
| Roster / requestAdd / designationWeight APIs | Real session throughout — Admin/Developer branches run. |

Net: acting-as-Leader only exercises role-gated chrome (nav, buttons, empty-state cards), not the
jurisdiction scoping that is the point of the role — and the primary Leader screen shows an empty
state so even the chrome can't be checked there.

## Decision

**Option 2 — a server-readable acting state**, chosen over (1) client-only acting jurisdictions
(server would still act as Developer; any mutation or report test would be a lie) and (3)
impersonating a real Leader account (needs the right account to exist; muddies audit identity).

Design constraints, from `skills/auth-check-patterns/SKILL.md`:

- **Real privilege is the ceiling.** Acting state is honoured only when
  `session.user.privilegeLevel === Developer`. For any other real privilege the acting state is
  ignored, even if present.
- **Audit identity stays real.** `AuditLog` rows and `createdById`/`submittedById` record the real
  user id. The acting privilege may be recorded as an *additional* field on the audit payload
  (see 04), never as a substitute.
- **Acting state is not a credential.** It is set only via a Developer-gated endpoint and carried
  in a signed, httpOnly cookie. It is never accepted from a request body or query string.

## Shape

```ts
// packages/shared-validators or apps/frontend/src/lib/acting/
type ActingState = {
  privilegeLevel: PrivilegeLevel;
  /** Only meaningful when privilegeLevel === Leader. Empty array = Leader with no assignments. */
  jurisdictions: Array<{ cityTown: string; legDistrict: number | null }>;
};
```

Resolution happens in one place — an `effectivePrivilege(session, req)` / `resolveActing()` helper
— and every consumer that currently branches on `session.user.privilegeLevel` for **behaviour**
(not authorization ceiling) switches to the resolved value:

- `withPrivilege` continues to gate on **real** privilege for the 401/403 decision, then attaches
  `session.acting` (resolved) for handlers.
- `getUserJurisdictions(userId, termId, privilegeLevel)` gains an overload/param that accepts the
  acting jurisdictions directly when acting as Leader, instead of querying `UserJurisdiction`.
- `/api/user/jurisdictions` returns acting jurisdictions when acting as Leader.
- `committees/page.tsx` computes the Leader filter and `initialScope` from the resolved privilege.
- `validateReportJurisdictionAccess`, `roster`, `requestAdd`, `designationWeight`,
  `fetchCommitteeList`, `generateReport` branch on the resolved privilege.

The client `GlobalContext` becomes a **mirror** of the server cookie (hydrated from the session or a
`/api/developer/acting` GET), not the source of truth. `localStorage` remains only as a per-browser
convenience for re-populating the picker.

## Out of scope

- Acting as a specific *user* (impersonation).
- Acting state for non-Developer real privileges.
- Persisting acting state in the database.

## Tickets

- 01 — Server-readable acting state: cookie, endpoint, resolver, `withPrivilege` integration
- 02 — Thread resolved privilege + jurisdictions through jurisdiction-scoped server paths
- 03 — Profile sheet: jurisdiction picker when acting as Leader; `GlobalContext` mirrors server
- 04 — Audit payload: record acting privilege alongside real identity
- 05 — Tests + auth skill doc update

Order: 01 → 02 → 03; 04 and 05 after 02. The glossary rename (linked above) is independent and
should land before 03 touches `GlobalContext`.
