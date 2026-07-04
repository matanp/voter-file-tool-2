# Agent Guidance

Before changing or reviewing authentication, authorization, privileges, or role-gated UI, read [skills/auth-check-patterns/SKILL.md](skills/auth-check-patterns/SKILL.md).

Before merging API, auth, role-gated UI, report, upload, invite, committee membership, or audit-log changes, run the illegible-bug checklist:

- Trust boundary: every route is `withPrivilege`, `withBackendCheck`, or `withPublic`.
- Negative auth: tests cover unauthenticated, insufficient privilege, and cross-user/cross-scope access.
- State race: find-then-write flows use transactions, unique constraints, conditional updates, or P2002 handling.
- Validation: request bodies and query params use Zod/shared validators, not TypeScript casts.
- Data scope: list/file/report/PII responses prove owner, jurisdiction, or privilege scope.
- Audit/state invariants: privileged mutations preserve audit and domain invariants.
