# 07 - Tighten agent guidance

Status: blocked-by-02-and-03

Type: documentation

## Why

The current guidance describes useful principles but has ambiguous triggers, an invalid negative
type-test example, stale helper inventory, and verification commands that do not always include the
tests they claim to check.

Guidance should point agents toward commands and completion criteria that the repository actually
enforces. It should not duplicate the scanner or package configuration.

## To do

1. Update the `AGENTS.md` pointer to trigger on creating, changing, or reviewing tests and test
   helpers.
2. Name the affected package's `typecheck:test` command as a before-finish requirement.
3. Replace the Zod `@ts-expect-error` example with:
   - a real typed assignment or function-call rejection for compile-time checking; and
   - a separate `safeParse`/`toThrow` example for runtime schema rejection.
4. Use `satisfies Model` for complete-row examples and explain how selected types are derived from
   production selectors or Prisma payload utilities.
5. Replace the stale accessor inventory with a durable rule: direct typed delegates are the default;
   approved runtime boundaries live in allowlisted helpers.
6. Make schema parsing mandatory for the named public-contract categories.
7. Correct verification commands so every named type-contract test is included.
8. Add the completion criterion:

   > Every affected test is included in a passing TypeScript check, every public contract is
   > schema-parsed, and the change introduces zero new escape-hatch violations.

## Acceptance

- The pointer fires for test reviews as well as test implementation.
- Every command named by the skill exists and enforces what the surrounding text claims.
- Examples compile and demonstrate the intended failure mode.
- Rules have one source of truth; `AGENTS.md` remains a short invocation pointer.
- An agent following the document cannot finish successfully while introducing a scanner violation
  or a test typecheck failure.

