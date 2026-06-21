---
name: auth-check-patterns
description: Implement or review authentication, authorization, privilege checks, role-gated UI, or Developer acting-as behavior in voter-file-tool. Use when modifying API routes, server-side data scope, audit roles, or client-side privilege visibility.
---

# Auth Check Patterns

Keep actual privilege and acting privilege separate.

| Context | Use | Source |
| --- | --- | --- |
| API authorization, mutations, data scoping, PII, audit identity | Actual privilege | `session.user.privilegeLevel` |
| Client-only visibility, navigation, controls, and role simulation | Acting privilege | `GlobalContext.actingPermissions` |

## Enforce real authority on the server

- Wrap protected API routes with `withPrivilege(requiredLevel, handler)`.
- Use the actual session privilege for Server Component access decisions, database query scope, mutations, and audit records.
- Never accept, persist, or trust `actingPermissions` in an API request. It is browser state and is not an authorization credential.
- Use `hasPermissionFor(actual, required)` rather than ad hoc comparisons when the hierarchy is relevant.

```ts
export const POST = withPrivilege(PrivilegeLevel.Admin, handler);
```

## Simulate roles only in client UI

- In a `"use client"` component, use `useContext(GlobalContext)` and gate UI with `actingPermissions`.
- Use it for role-gated links, buttons, report cards, and client `AuthCheck` behavior.
- Do not use the session role for these UI-only checks; doing so makes a Developer acting as a lower role still see privileged UI.

```ts
const { actingPermissions } = useContext(GlobalContext);
const canManage = hasPermissionFor(actingPermissions, PrivilegeLevel.Admin);
```

## Handle the server/client boundary deliberately

`actingPermissions` exists only in React/localStorage. A Server Component cannot safely use it. Do not replace server authorization with acting privilege just to make the simulation match.

If a feature requires full server-rendered role simulation, first design a server-readable, Developer-validated acting-role mechanism. Keep actual privilege as the ceiling for every operation.

## Review checklist

- Does every API route use `withPrivilege` or the appropriate authenticated wrapper?
- Are server-side data queries and audit roles based on actual privilege?
- Are client-only role gates based on `actingPermissions`?
- Does a Developer acting as `ReadAccess` lose the Admin navigation and privileged controls, while real API authorization remains unchanged?
