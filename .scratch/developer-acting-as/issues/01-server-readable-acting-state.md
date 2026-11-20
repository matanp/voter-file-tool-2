# Server-readable acting state: cookie, endpoint, resolver

Status: ready-for-agent
Type: task
Blocked by: (none — but coordinate with ../../glossary-alignment/01-acting-privilege-rename.md; do that rename first or concurrently)

## Goal

Give the server a trustworthy way to know that a Developer is acting as another privilege (and, for
Leader, which jurisdictions), so that Server Components and API routes can simulate the role while
real privilege remains the authorization ceiling.

## Work

1. **Type + validator.** Add `ActingState` (see spec) with a zod schema in
   `@voter-file-tool/shared-validators`. `jurisdictions` must be `[]` unless
   `privilegeLevel === Leader`; reject otherwise.
2. **Cookie.** Name `vft_acting`. Signed (HMAC with `AUTH_SECRET` or a dedicated secret), httpOnly,
   sameSite=lax, path=/. Not readable by client JS. TTL: session-length is fine; the resolver
   ignores it anyway when real privilege ≠ Developer.
3. **Endpoint.** `apps/frontend/src/app/api/developer/acting/route.ts`:
   - `PUT` — body validated by the schema; sets the cookie. `withPrivilege(PrivilegeLevel.Developer, …)`.
   - `DELETE` — clears the cookie. Same gate.
   - `GET` — returns the resolved state (or `null`). `withPrivilege("Authenticated", …)` is enough
     because the resolver returns `null` for non-Developers.
4. **Resolver.** `apps/frontend/src/lib/acting/resolveActing.ts`:
   ```ts
   export async function resolveActing(session: Session): Promise<ActingState | null>
   ```
   Reads the cookie via `next/headers` `cookies()`, verifies signature, parses with the schema,
   and returns it **only if** `session.user.privilegeLevel === Developer`. Any failure → `null`.
   Also export `effectivePrivilege(session, acting)` returning
   `acting?.privilegeLevel ?? session.user.privilegeLevel`.
5. **`withPrivilege` integration.** After the existing real-privilege gate passes, resolve acting
   and pass it to the handler as `session.acting` (extend `SessionWithUser`). Do **not** change the
   401/403 decision — it stays on real privilege.

## Not in this ticket

Switching any consumer to the resolved value (02), UI (03).

## Done when

- A Developer can `PUT` an acting state and `GET` it back; a non-Developer gets `403` on `PUT` and
  `null` on `GET` even if a cookie is present.
- A forged/unsigned cookie resolves to `null`.
- `withPrivilege` handlers receive `session.acting`; existing route tests are unchanged.
